'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import * as errors from '../../utils/errors';
import * as AgentSetup from '../agentSetup/agentSetup.model';
import {getRedisServices} from '../../config/redis-service-connection';
import {RedisServices} from "../../services/redis-services";
var config = require('../../config/environment');
var agentAllocationRedisKey = config.systemName + '-agent-allocation';
import {ExecutionGroup, SerializedMachineAgent} from "./executionGroup";
import {ExecutionAgent} from "./executionAgent";
import {MachineFSM} from "./testFSMMachine";
import {deepGet} from "../../utils/tsutils";
const moment = require('moment');
let logger = require('../../config/topic.global.Logging')('schedule', false);

const MAX_RESCEDULE_TIME = 1000 * 60 * 30; // 30 min attampt to rerun monitor

//Load all AgentSetup into data structure see fields in document

//right now load to memory, later save in redis and load before each schedule and save after each schedule

interface IAgentInfo {
    allocatedCapacity: number;
    startTime: number;
    vncPort: number;
    projectId: string;
    monitorId: string; // used to identify previous monitor already running
    info: string; // used to communicate the testrun was stoped by user

    //debug
    projectName: string;
    testName: string;
    monitorName: string;
}

export interface IMachineAgent {
    name: string;
    maxAudioSessions: number;
    maxVideoSessions: number;
    groups: string[];
    executionGroup: string;
    comments: string;
    location: string;
    ipAddress: string;
    runCount: number,
    allocatedCapacity: number;
    unresponsiveSince: number;
    expectedShutdown: number;
    activeSessions: { [machineId: string]: IAgentInfo};
}

export interface IMachineGroup {
    groupStarted: boolean;
    countReady: number;
    machines: MachineFSM[];
    testProfile: any;

    location: string;
    locationName: string;
    batchStartingCount: number;
    agentSetup: IMachineAgent;
}

export interface IMachineGroupDictionary {
    [index: string]: IMachineGroup;
}

export interface IMachineAssign {
    //key = machineId
    //value = IMachineAgent can be optimized to remove duplicates
    [index: string]: IMachineAgent;
}

export interface IJobInfo {
    monitorId: string;
    monitorName: string;
    monitorScheduleStart: number;
    monitorRescheduleCount: number;
    options: any;
}

export interface IBatchInfo {
    batchList: string[];
}

export interface RedisAllocationData {
    allocationData: IMachineAgent[];
    pendingAllocations: IJobInfo[];
    batchInfo: {[seedName:string]: IBatchInfo}
}

export interface IExecutionGroupDictionary {
    [index: string]: ExecutionGroup;
}

export interface IContainerRunInfo {
    agentName: string;
    runningContainerNames: string[];
}

//let allocationDataCached: IMachineAgent[] = null;
export function splitGroup(group: string): string[] {
    if (group) {
        return _.map(group.toLowerCase().split(','), function(item) {
            return item.trim();
        });
    } else {
        return [];
    }
}

//
async function loadAgentMachineTable(redisAnswer: RedisAllocationData): Promise<RedisAllocationData> {
    return new Promise<RedisAllocationData>((resolve, reject) => {
        if (!redisAnswer ||
            !redisAnswer.allocationData ||
            !Array.isArray(redisAnswer.allocationData) ||
            !redisAnswer.pendingAllocations ||
            !Array.isArray(redisAnswer.pendingAllocations) ||
            !redisAnswer.batchInfo ||
            !_.isPlainObject(redisAnswer.batchInfo)) {

            let redisAnswer = {
                allocationData: [],
                pendingAllocations: [],
                batchInfo: {}
            };

            let allocationData = redisAnswer.allocationData;
            let find = {isActive: true};
            AgentSetup.find(find, function(err, items) {
                if (err) {
                    return reject(err);
                }

                _.each(items, function(item) {
                    let addresses = item.ipAddress.split(',');
                    _.each(addresses, (address) => {
                        address = address.trim();
                        let machine: IMachineAgent = {
                            name: item.name,
                            maxAudioSessions: item.maxAudioSessions,
                            maxVideoSessions: item.maxVideoSessions,
                            groups: splitGroup(item.groups || 'cloud'),
                            executionGroup: item.executionGroup,
                            comments: item.comments,
                            location: item.location,
                            ipAddress: address,
                            runCount: 0,
                            allocatedCapacity: 0,
                            unresponsiveSince: 0,
                            expectedShutdown: 0,
                            activeSessions: {}
                        };
                        allocationData.push(machine);
                    })
                });

                let overrideTSWarn:any = redisAnswer;
                resolve(overrideTSWarn);
            });
        } else {
            resolve(redisAnswer);
        }
    });
}

function allocationRound(value) {
    return Math.round(value * 10000) / 10000;
}

function runLoad(hasVideo: boolean, agentLoadFactor: number, machineAgent: IMachineAgent): number {
    return Math.floor(agentLoadFactor * 10000 / (hasVideo ? machineAgent.maxVideoSessions : machineAgent.maxAudioSessions)) / 10000;
}


//Should be called when close the container
async function releaseAllocatedLoad(executionInfo: any, machine: MachineFSM, allocationData: IMachineAgent[]) {
    let log = executionInfo.log;
    let machineGroup: IMachineGroup = machine.machineGroup;
    let searchMachineAgent: IMachineAgent = machineGroup.agentSetup;
    let agentName: string = searchMachineAgent.name;

    if (machine.containerCreatedStatus !== 'stop' && machine.remoteRunMode === 'local') {
        log.notice(util.format('Unexpected agent status=%s', machine.containerCreatedStatus), {
            machineId: machine.machineId
        });
    }

    let machineAgent: IMachineAgent = _.find(allocationData, {name: agentName});
    if (machineAgent) {
        let agentInfo: IAgentInfo = machineAgent.activeSessions[machine.machineId];
        if (agentInfo) {
            machineAgent.allocatedCapacity = allocationRound(machineAgent.allocatedCapacity - agentInfo.allocatedCapacity);

            machine.allocationExtraInfo = agentInfo.info;
            delete machineAgent.activeSessions[machine.machineId];
        } else {
            log.error('Failed to find machine in machineAgent.activeSessions', {
                machineId: machine.machineId,
                machineAgent: machineAgent
            });
        }
    }

    return true;
}

export async function resetAgentAllocation() {
    async function doReset(redisAnswer: any): Promise<any> {
        return {};
    }

    let redisService: RedisServices = getRedisServices();
    await redisService.optimisticLock('reset-agents', agentAllocationRedisKey, doReset);
    return true;
}

export async function cleanMachineAgentAllocation(agentName: string): Promise<boolean> {
    async function doCleanMachineAgentAllocation(redisAnswer: RedisAllocationData) {
        if (redisAnswer) {
            let allocationData: IMachineAgent[] = redisAnswer.allocationData;
            let machineAgent: IMachineAgent = _.find(allocationData, {name: agentName});
            if (machineAgent) {
                machineAgent.runCount = 0;
                machineAgent.allocatedCapacity = 0;
                machineAgent.unresponsiveSince = 0;
                machineAgent.activeSessions = {};
            }
        }

        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    await redisService.optimisticLock('clean-machine', agentAllocationRedisKey, doCleanMachineAgentAllocation);
    return true;
}

//Count total number of agents used for this project
function countTotalRunningAgents(redisData: RedisAllocationData, projectId: string) {
    let allocationData: IMachineAgent[] = redisData ? redisData.allocationData : [];
    let count = 0;
    _.each(allocationData, function(machineAgent: IMachineAgent) {
        _.forEach(machineAgent.activeSessions, (session: IAgentInfo) => {
            if (session.projectId && session.projectId.toString() === projectId) {
                count++;
            }
        });
    });

    return count;
}

//Count total number of agents used for this project
export async function getTotalRunningAgents(projectId: string) {
    let redisService: RedisServices = getRedisServices();
    let redisData: RedisAllocationData = JSON.parse(await redisService.redisGet(agentAllocationRedisKey));
    return countTotalRunningAgents(redisData, projectId);
}

function convertMachineAgentStatus(redisData: RedisAllocationData) {
    let answer: any = {
        allocation: {},
        pendingAllocations: [],
        batchInfo: {}
    };

    let allocationData: IMachineAgent[] = redisData ? redisData.allocationData : [];
    _.each(allocationData, function(machineAgent: IMachineAgent) {
        answer.allocation[machineAgent.name] = {
            runCount: machineAgent.runCount,
            allocation: allocationRound(machineAgent.allocatedCapacity),
            location: machineAgent.location,
            maxAudioSessions: machineAgent.maxAudioSessions,
            maxVideoSessions: machineAgent.maxVideoSessions,
            unresponsiveSince: machineAgent.unresponsiveSince,
            expectedShutdown: machineAgent.expectedShutdown,
            groups: machineAgent.groups,
            executionGroup: machineAgent.executionGroup,
            sessions: _.map(machineAgent.activeSessions, (session: IAgentInfo, machineId: string) => {
                return {
                    allocatedCapacity: session.allocatedCapacity,
                    startTime: moment(session.startTime).toNow(true),
                    vncPort: session.vncPort,
                    projectId: session.projectId,
                    monitorId: session.monitorId,

                    //debug
                    machineId: machineId,
                    projectName: session.projectName,
                    testName: session.testName,
                    monitorName: session.monitorName,
                }

            })
        };
    });

    if (redisData && redisData.pendingAllocations) {
        answer.pendingAllocations = _.map(redisData.pendingAllocations, (job: IJobInfo) => {
            return {
                monitorId: job.monitorId,
                monitorName: job.monitorName,
                monitorScheduleStart: moment(job.monitorScheduleStart).toNow(true),
                monitorRescheduleCount: job.monitorRescheduleCount
            }
        })
    }

    if (redisData && redisData.batchInfo) {
        _.each(redisData.batchInfo, (batchInfo: IBatchInfo, seedName:string) => {
            answer.batchInfo[seedName] = batchInfo.batchList;
        })
    }

    //logger.info('pending-monitors', redisData.pendingAllocations);
    return answer;
}

export async function getMachineAgentStatus() {
    let redisService: RedisServices = getRedisServices();
    let redisData: RedisAllocationData = JSON.parse(await redisService.redisGet(agentAllocationRedisKey));

    return convertMachineAgentStatus(redisData);
}

export function machineNotAnswering(log: any, machineAgent: IMachineAgent): void {
    log.alert('Agent-Machine Not Answering, will not use it until it reset and Admin->Docker Shortcuts->Clean agents',
        { name: machineAgent.name,
          address: machineAgent.ipAddress,
          location: machineAgent.location
        });

    //Not locking the machine for now, no way to clean it as long as the configuration is not global and distributed
    //machineAgent.unresponsiveSince = (new Date()).getTime();
}

export function confirmImageList(runningImageList: string[], machineAgent: IMachineAgent): void {
    let cutTime = (new Date()).getTime() - 1000 * 60; // keep unknown machine for 1 min
    logger.info('confirmImageList',
        { machineAgent: machineAgent.name,
            runningImageList: runningImageList,
            activeSessions: machineAgent.activeSessions });

    let unknownMachines: any = [];
    _.each(machineAgent.activeSessions, function(agentInfo: IAgentInfo, machineId: string) {
        if (runningImageList.indexOf('/' + machineId) < 0 &&
            agentInfo.startTime < cutTime) {
            unknownMachines.push(machineId);
        }
    });

    if (unknownMachines.length > 0) {
        logger.error(util.format('Confirm Image List - found unknown session on %s, clearing them', machineAgent.name), {
            machineAgent: machineAgent,
            cutTime: cutTime,
            runningImageList: runningImageList,
            activeSessions: machineAgent.activeSessions,
            unknownMachines: unknownMachines
        });

        _.each(unknownMachines, function(machineId: string) {
            machineAgent.allocatedCapacity = allocationRound(machineAgent.allocatedCapacity - machineAgent.activeSessions[machineId].allocatedCapacity);
            delete machineAgent.activeSessions[machineId];
        });
    }
}

//side effect, clean all agents that used by this test
//side effect, clean all pending allocation
//retuyrn all pending allocation
export async function release(executionInfo: any, testFSM: any): Promise<IJobInfo[]> {
    let pendingAllocations: IJobInfo[];

    async function doRelease(redisAnswer: RedisAllocationData): Promise<any> {
        let allocationData: IMachineAgent[] = redisAnswer.allocationData;

        await releaseAllAllocations(executionInfo, testFSM, allocationData);
        pendingAllocations = redisAnswer.pendingAllocations;
        redisAnswer.pendingAllocations = [];

        let seedName = executionInfo.seedName;
        if (seedName && redisAnswer.batchInfo) {
            delete redisAnswer.batchInfo[seedName];
        }
        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    await redisService.optimisticLock('release', agentAllocationRedisKey, doRelease);
    logger.info(util.format('Released for %s', executionInfo.seedName));
    return pendingAllocations;
}

export async function cleanupAgentAllocation(validImageList: IContainerRunInfo[]) {
    async function doRelease(redisAnswer: RedisAllocationData): Promise<any> {
        let allocationData: IMachineAgent[] = redisAnswer.allocationData;

        _.each(validImageList, (validImage: IContainerRunInfo) => {
            let agent: IMachineAgent = _.find(allocationData, (a) => a.name === validImage.agentName);
            if (agent) {
                confirmImageList(validImage.runningContainerNames, agent);
            }
        });

        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    await redisService.optimisticLock('cleanupAgentAllocation', agentAllocationRedisKey, doRelease);
    logger.info('cleanupAgentAllocation');
}

async function releaseAllAllocations(executionInfo: any, testFSM: any, allocationData: IMachineAgent[]) {
    let machineGroupList: IMachineGroupDictionary = testFSM.machineGroup;
    for (let machineGroupIdx in machineGroupList) {
        if (!machineGroupList.hasOwnProperty(machineGroupIdx)) {
            continue;
        }

        let machineGroup = machineGroupList[machineGroupIdx];

        for (let _machineIdx in machineGroup.machines) {
            if (!machineGroup.machines.hasOwnProperty(_machineIdx)) {
                continue;
            }

            let _machine: MachineFSM = machineGroup.machines[_machineIdx];

            await releaseAllocatedLoad(executionInfo, _machine, allocationData);
        }
    }
    return;
}

function getLocationIdx(executionInfo: any) {
    let setup = executionInfo.configDataMain;
    let locationIdx: any = {};
    _.each(setup['agent-locations'], function(location: any) {
        locationIdx[location.id] = location.name;
    });
    return locationIdx;
}

function getAvailableVNCPort(machineAgent: IMachineAgent): number {
    //limit VNC sessions per machine to 1
    let availableVNCPort = {5900: 1}; //, 5901: 1, 5902: 1, 5903: 1, 5904: 1};
    _.each(machineAgent.activeSessions, (agentInfo: IAgentInfo) => {
        availableVNCPort[agentInfo.vncPort] = 0;
    });

    let vncPort = null;
    _.each(availableVNCPort, (value, key) => {
        if (value && !vncPort) {
            vncPort = key;
        }
    });

    return vncPort;
}

export async function schedule(executionInfo: any, testFSM: any, userAgentGroupName: string, defaultAgentGroupName: string): Promise<boolean> {
    let scheduleError: any  = null;

    async function doSchedule(redisAnswer: RedisAllocationData): Promise<any> {
        let msg: string;
        let log = executionInfo.log;
        let allocationTime = (new Date()).getTime();
        log.info(executionInfo.seedName, 'Schedule Start');

        //Check total allowed agents vs total used
        let totalRunningAgents = countTotalRunningAgents(redisAnswer, executionInfo.testRun.project.toString());

        let maxSession = executionInfo.options.hasVideo ?
            executionInfo.projectSetup.maxVideoSessions :
            executionInfo.projectSetup.maxAudioSessions;

        if (!executionInfo.projectSetup.verifyPAYGexecutions || executionInfo.options['payg-confirm']) {
            maxSession += executionInfo.projectSetup.maxPAYGVideoSessions;
        }

        if (maxSession < totalRunningAgents + executionInfo.threadsCount) {
            throw new errors.ValidationError('permissions', `You cannot run more than ${maxSession} agents at a time, based on your current account settings. Please contact <a href="app/support-freshdesk/">support</a> if you need more agents, (requested:${executionInfo.threadsCount} already run:${totalRunningAgents})`);
        }

        let allowedGroupNameSetup = userAgentGroupName;
        if (!allowedGroupNameSetup) {
            allowedGroupNameSetup = defaultAgentGroupName || 'cloud';
        }
        let allowedGroupNameSetupList: string[] = splitGroup(allowedGroupNameSetup);
        let groupNameSetup: string = executionInfo.options.probe;
        let groupNameList: string[] = [];
        let optionalGroups: string[] = [];
        if (groupNameSetup) {
            _.each(splitGroup(groupNameSetup), function(groupName) {
                if (groupName.indexOf('-') === 0) {
                    groupName = groupName.substring(1);
                    optionalGroups.push(groupName);
                } else if (optionalGroups.length > 0) { // anything after optional is also optional
                    optionalGroups.push(groupName);
                }

                if (allowedGroupNameSetupList.indexOf(groupName) >= 0) {
                    groupNameList.push(groupName);
                }
            });
        } else {
            groupNameList = allowedGroupNameSetupList;
        }
        let locationIdx = getLocationIdx(executionInfo);

        let machineGroupList: IMachineGroupDictionary = {};
        let executionGroupList: IExecutionGroupDictionary = {};
        let localAgentCount = 0;
        let totalAgents = testFSM.threadsCount;
        let currentSchedRunCount: {[name:string]: number} = {};

        let batch = {
            maxSize: executionInfo.options['batch-max-size'] || deepGet(executionInfo.configDataMain, ['test-execution', 'batch', 'max-size'], 256),
            enable:
                totalAgents>0 &&
                (executionInfo.options.runMode !== 'monitor' || executionInfo.options['batch-split'] === 'true' || totalAgents > 64) &&
                //executionInfo.options['batch-split'] &&
                executionInfo.options['batch-split'] !== 'false' &&
                deepGet(executionInfo.configDataMain, ['test-execution', 'batch', 'enable'], true),
            size: 0,
        };

        if (batch.enable) {
            //take 1st machine session size as a sample to all
            let sessionSize = testFSM.sessionSize;
            let size = 0;

            if (sessionSize < batch.maxSize / 4) {
                size = Math.floor(batch.maxSize / sessionSize) * sessionSize;
            } else {
                //we don't care to keep large sessions on the same batch, should still be able to communicate
                size = batch.maxSize;
            }
            batch.size = size;
        }

        redisAnswer = await loadAgentMachineTable(redisAnswer);
        //don't change the original object until we sure we want to allocate
        let allocationData: IMachineAgent[] = _.cloneDeep(redisAnswer.allocationData);
        let allocatedVNCPorts = 0;
        let maxVNCPorts:number = executionInfo.options['max-vnc-ports'] || 2;

        let monitorId = executionInfo.options.monitorId;
        if (monitorId && !executionInfo.options['monitor-allow-parallel']) {
            if (_.find(allocationData, (machine:IMachineAgent) => {
                    return _.find(machine.activeSessions, (session:IAgentInfo, sessionName) => session.monitorId === monitorId);
                })) {

                let msg = util.format('monitor-in-progress monitor already running project:%s test:%s monitor:%s %s',
                    executionInfo.projectSetup.projectName,
                    executionInfo.testRun.name,
                    executionInfo.options.monitorName,
                    monitorId);

                log.error(msg);
                scheduleError = new errors.ValidationError('monitor-in-progress', msg);
                executionInfo.results.agentAllocationError = true; // we don't any alerts to user/or support
                return redisAnswer;
            }
        }

        for (let machineId in testFSM.machineFSMs) {
            if (!testFSM.machineFSMs.hasOwnProperty(machineId)) {
                continue;
            }

            if (executionInfo.options['debug-allocation']) {
                log.info('check allocation #1 ' + machineId, {list: groupNameList, optionalGroups});
            }

            let machine: MachineFSM = testFSM.machineFSMs[machineId];
            let hasVideo:boolean = executionInfo.testRun2.getHasVideo(machine.testProfile);
            let expectTestEnd:number = (new Date()).getTime() + executionInfo.timeouts.runTest;
            let agentLoadFactor:number = Number(executionInfo.options['probe-load-factor']) || 1;

            //Allocate this machine to a group
            let locationId: string = machine.testProfile.location;

            //Find the least allocated machine
            let machineAgent: IMachineAgent = null;
            let machineAgentCurrentCount:number = 0;
            let groupName:string = null;
            let groupIdx = 0;
            //_.each(groupNameList, (groupName:string) => {
            while (groupIdx<groupNameList.length) {
                groupName = groupNameList[groupIdx];
                if (optionalGroups.indexOf(groupName) >= 0 && machineAgent) {
                    if (executionInfo.options['debug-allocation']) {
                        log.info('optional group and already found machine break' + groupName, {groupIdx: groupIdx, allocationData: allocationData});
                    }
                    break;
                }

                if (executionInfo.options['debug-allocation']) {
                    log.info('check allocation #2 ' + groupName, {groupIdx: groupIdx, allocationData: allocationData});
                }
                _.each(allocationData, function(availableMachineAgent: IMachineAgent) {
                    let expectedLoad: number = availableMachineAgent.allocatedCapacity + runLoad(hasVideo, agentLoadFactor, availableMachineAgent);
                    if ((availableMachineAgent.location === locationId || locationId === 'any') &&
                        //availableMachineAgent.unresponsiveSince === 0 &&
                        availableMachineAgent.groups.indexOf(groupName) >= 0 &&
                        (!availableMachineAgent.expectedShutdown || availableMachineAgent.expectedShutdown > expectTestEnd) &&
                        expectedLoad <= 1) {

                        //search for the least loaded machine (after allocation)
                        let availableMachineAgentCurrentCount = !(availableMachineAgent.name in currentSchedRunCount) ? 0 : currentSchedRunCount[availableMachineAgent.name];

                        if (!machineAgent ||
                            //machineAgent.allocatedCapacity + runLoad(hasVideo, agentLoadFactor, machineAgent) > expectedLoad) { // based on least allocated machine
                            (machineAgentCurrentCount > availableMachineAgentCurrentCount ||
                            (machineAgentCurrentCount === availableMachineAgentCurrentCount &&
                            machineAgent.runCount / machineAgent.maxVideoSessions > availableMachineAgent.runCount / availableMachineAgent.maxVideoSessions))) { // baesd on least used machine
                            machineAgent = availableMachineAgent;
                            machineAgentCurrentCount = availableMachineAgentCurrentCount;
                        }
                    } else {
                        if (executionInfo.options['debug-allocation']) {
                            log.info('Cannot use machine',
                                availableMachineAgent.name,
                                groupName, locationId, expectedLoad, expectTestEnd,
                                availableMachineAgent.unresponsiveSince,
                                availableMachineAgent.expectedShutdown,
                                availableMachineAgent.groups,
                                availableMachineAgent.location, [
                                    availableMachineAgent.groups.indexOf(groupName) >= 0,
                                    (!availableMachineAgent.expectedShutdown || availableMachineAgent.expectedShutdown > expectTestEnd),
                                    expectedLoad <= 1
                                ]);
                        }
                    }
                });
                groupIdx++;
            }

            if (!machineAgent) {
                //Need to deallocate before exit
                //No need to call it when using redis, will not commit the changes
                //releaseAllAllocations(machineGroupList, executionInfo);

                msg = util.format('No agent available to run test at [%s]', locationId);
                //log.notice(executionInfo.seedName, 'Schedule Error:', msg, {allocation: convertMachineAgentStatus(redisAnswer)} );
                scheduleError = new errors.ValidationError('failed-to-find-agent', msg);

                executionInfo.results.agentAllocationError = true;
                if (monitorId) {
                    //check if not trying for too long
                    if (executionInfo.options.monitorScheduleStart > (new Date()).getTime() - MAX_RESCEDULE_TIME) {
                        //if not already exists same job in pending, to avoid duplicates
                        if (!_.find(redisAnswer.pendingAllocations, (jobInfo: IJobInfo) => jobInfo.monitorId === monitorId)) {
                            redisAnswer.pendingAllocations.push({
                                monitorId: monitorId,
                                monitorName: executionInfo.options.monitorName,
                                monitorScheduleStart: executionInfo.options.monitorScheduleStart,
                                monitorRescheduleCount: executionInfo.options.monitorRescheduleCount + 1,
                                options: {}
                            });
                            log.notice('Schedule failed, will retry:', msg, {allocation: convertMachineAgentStatus(redisAnswer)} );
                        } else {
                            executionInfo.results.agentAllocationError = false; // this is fatal
                            log.error('event-monitor-reschedule-expired monitorId already in pending queue, not adding it again', msg, {allocation: convertMachineAgentStatus(redisAnswer)} );
                        }
                    } else {
                        executionInfo.results.agentAllocationError = false; // this is fatal
                        log.error('event-monitor-reschedule-expired attempted over 30min, permanent failure, will not attempt to schedule again', msg, {allocation: convertMachineAgentStatus(redisAnswer)} );
                    }
                    return redisAnswer;
                } else {
                    log.notice('Schedule failed:', msg, {allocation: convertMachineAgentStatus(redisAnswer)} );
                    return null;
                }
            }

            let machineAgentName: string = machineAgent.name;
            if (!machineGroupList[machineAgentName]) {

                let selectedLocationId = machineAgent.location;
                let locationName: string = locationIdx[selectedLocationId];

                machineGroupList[machineAgentName] = {
                    groupStarted: false,
                    batchStartingCount: 0,
                    countReady: 0,
                    machines: [],
                    testProfile: machine.testProfile,
                    location: selectedLocationId,
                    locationName: locationName,
                    agentSetup: machineAgent
                };
            }

            //Update Allocated Capacity for minAllocatedMachine
            let vncPort = null;
            if (executionInfo.options.vnc && allocatedVNCPorts < maxVNCPorts) {
                //search for next available vnc port
                vncPort = getAvailableVNCPort(machineAgent);
            }

            let allocatedCapacity = runLoad(hasVideo, agentLoadFactor, machineAgent);

            machineAgent.runCount = !machineAgent.runCount ? 1 : machineAgent.runCount + 1;
            currentSchedRunCount[machineAgent.name] = (!(machineAgent.name in currentSchedRunCount) ? 1 : currentSchedRunCount[machineAgent.name] + 1) / machineAgent.maxVideoSessions;
            machineAgent.allocatedCapacity = allocationRound(machineAgent.allocatedCapacity + allocationRound(allocatedCapacity));
            machineAgent.activeSessions[machine.machineId] = {
                allocatedCapacity: allocatedCapacity,
                startTime: allocationTime,
                vncPort: vncPort,
                projectId: executionInfo.projectSetup.projectId,
                monitorId: executionInfo.options.monitorId,
                info: null,

                //For debug,m can be removed
                projectName: executionInfo.projectSetup.projectName,
                testName: executionInfo.testRun.name,
                monitorName: executionInfo.options.monitorName,
            };

            machineGroupList[machineAgentName].machines.push(machine);
            machine.machineGroup = machineGroupList[machineAgentName];
            machine.vncPort = vncPort;
            if (vncPort) {
                allocatedVNCPorts++;
            }

            //Execution group
            let executionGroup = machineAgent.executionGroup;
            let useExecutionGroup = executionGroup && executionGroup !== 'main';
            let pubsubType = config.executionAgent.pubsubType;
            if (!useExecutionGroup && batch.enable) {
                useExecutionGroup = true;
                let batchId = Math.floor(machine.concurrentIndex / batch.size) + 1;
                executionGroup = 'batch' + batchId;
                pubsubType = 'local-redis';
            }

            if (useExecutionGroup) {
                if (!executionGroupList[executionGroup]) {
                    executionGroupList[executionGroup] = new ExecutionGroup(
                        executionGroup,
                        executionInfo,
                        testFSM,
                        pubsubType
                    )
                }
                executionGroupList[executionGroup].machineAssign[machine.machineId] = {
                    name: machineAgent.name,
                    ipAddress: machineAgent.ipAddress,
                    location: machineAgent.location,
                    vncPort: machine.vncPort
                };
                machine.executionGroup = executionGroupList[executionGroup];
                machine.setRemoteRunMode('remote');
            } else {
                machine.setRemoteRunMode('local');
                localAgentCount++;
            }

            if (executionInfo.options['debug-allocation']) {
                log.info('Use machine',
                    machineAgent.name,
                    allocatedCapacity,
                    machineAgent.runCount,
                    machineAgent.allocatedCapacity,
                    groupName,
                    locationId,
                    machineAgent.groups,
                    machineAgent.location);
            }
        }

        testFSM.machineGroup = machineGroupList;
        testFSM.executionGroupList = executionGroupList;
        testFSM.localAgentCount = localAgentCount;
        //testFSM.executionGroupCount = Object.keys(executionGroupList).length;

        redisAnswer.allocationData = allocationData;
        let batchList = _.map(executionGroupList, (value, key) => {
            return key;
        });
        redisAnswer.batchInfo[executionInfo.seedName] = {batchList: batchList};

        log.notice(executionInfo.seedName, 'Schedule Completed', {groupNameList: groupNameList});
        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    await redisService.optimisticLock('schedule', agentAllocationRedisKey, doSchedule);
    if (scheduleError) {
        throw scheduleError;
    }

    logger.info(util.format('Allocated for %s', executionInfo.seedName));
    return true;
};

exports.remoteSchedule = async function(executionInfo: any, testFSM: any): Promise<boolean>  {
    let log = executionInfo.log;

    let executionGroup: ExecutionGroup = executionInfo.executionGroup;
    let executionAgent: ExecutionAgent = executionInfo.executionAgent;
    let machineGroupList: IMachineGroupDictionary = {};
    let localAgentCount = 0;
    var locationIdx = getLocationIdx(executionInfo);

    for (let _machineId in testFSM.machineFSMs) {
        if (!testFSM.machineFSMs.hasOwnProperty(_machineId)) {
            continue;
        }

        let machine: MachineFSM = testFSM.machineFSMs[_machineId];
        let machineId = machine.machineId;

        if (machineId in executionGroup.machineAssign) {
            let serializedMachineAgent: SerializedMachineAgent = executionGroup.machineAssign[machineId];
            let locationId: string = serializedMachineAgent.location;
            let locationName: string = locationIdx[locationId];
            machine.vncPort = serializedMachineAgent.vncPort;

            let machineAgent: IMachineAgent = {
                name: serializedMachineAgent.name,
                maxAudioSessions: 0,
                maxVideoSessions: 0,
                groups: [],
                executionGroup: null,
                comments: 'serialized',
                location: 'local',
                ipAddress: serializedMachineAgent.ipAddress,
                runCount: 0,
                allocatedCapacity: 0,
                unresponsiveSince: 0,
                expectedShutdown: 0,
                activeSessions: {}
            };

            let machineAgentName: string = machineAgent.name;
            if (!machineGroupList[machineAgentName]) {

                machineGroupList[machineAgentName] = {
                    groupStarted: false,
                    batchStartingCount: 0,
                    countReady: 0,
                    machines: [],
                    testProfile: machine.testProfile,
                    location: locationId,
                    locationName: locationName,
                    agentSetup: machineAgent
                };
            }


            machine.setRemoteRunMode('local');
            machineGroupList[machineAgentName].machines.push(machine);
            machine.machineGroup = machineGroupList[machineAgentName];

            localAgentCount++;
        } else {
            machine.setRemoteRunMode('ignore');
        }
    }

    testFSM.machineGroup = machineGroupList;
    testFSM.localAgentCount = localAgentCount;
    executionAgent.iterationsExpected = localAgentCount * executionInfo.iterationsCount;
    executionAgent.localAgentCount = localAgentCount;
    executionAgent.testFSM = testFSM;

    //await executionGroup.listenToPubSub();
    log.info(executionInfo.seedName, 'Remote Schedule Completed');

    return true;
};

function getAgentReadyList(redisAnswer: RedisAllocationData, requestId:string):string[] {
    let list: string[] = [];
    let count = _.each(redisAnswer.allocationData, (_agent:IMachineAgent) => {
        if (requestId === _agent.comments) {
            list.push(_agent.name); // DA instanceId
        }
    });

    return list;
}

export async function getDARequestStatus(requestId: string) {
    let redisService: RedisServices = getRedisServices();
    let redisData: RedisAllocationData = JSON.parse(await redisService.redisGet(agentAllocationRedisKey));
    return getAgentReadyList(redisData, requestId);
}

//return number of ready agents
export async function addDynamicAgents(agent:IMachineAgent):Promise<number> {
    async function doAddDynamicAgents(redisAnswer: RedisAllocationData): Promise<any> {
        redisAnswer = await loadAgentMachineTable(redisAnswer);
        redisAnswer.allocationData.push(agent);
        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    let redisAnswer = await redisService.optimisticLock('setDynamicAgentsStatus', agentAllocationRedisKey, doAddDynamicAgents);
    let list = getAgentReadyList(redisAnswer, agent);
    return list.length;
}

export async function removeDynamicAgents(instanceId:string):Promise<number> {
    async function doRemoveDynamicAgents(redisAnswer: RedisAllocationData): Promise<any> {
        if (redisAnswer.allocationData) {
            _.remove(redisAnswer.allocationData, (agent:IMachineAgent) => agent.name === instanceId);
        }
        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    let redisAnswer = await redisService.optimisticLock('setDynamicAgentsStatus', agentAllocationRedisKey, doRemoveDynamicAgents);
    return 0;
}

export async function stopTestRunMachineList(testRunName:string):Promise<IMachineAgent[]> {
    let result: IMachineAgent[] = [];

    async function doStopTestRun(redisAnswer: RedisAllocationData): Promise<any> {
        _.each(redisAnswer.allocationData, (machineAgent:IMachineAgent) => {
            let hasAnyRunningAgents = false;
            _.each(machineAgent.activeSessions, (agentInfo: IAgentInfo, machineId:string) => {
                if (machineId.indexOf(testRunName) === 0) {
                    agentInfo.info = 'stop';
                    hasAnyRunningAgents = true;
                }
            });
            if (hasAnyRunningAgents) {
                result.push(machineAgent);
            }
        });
        return redisAnswer;
    }

    let redisService: RedisServices = getRedisServices();
    await redisService.optimisticLock('stopTestRun', agentAllocationRedisKey, doStopTestRun);
    return result;
}