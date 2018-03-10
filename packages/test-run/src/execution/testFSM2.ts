'use strict';

const topicLog = require('../../config/topicLogging');
import * as _ from 'lodash';
import * as util from 'util';
import {MachineFSM} from "./testFSMMachine";
import {ExecutionGroup} from "./executionGroup";
import {ExecutionAgent} from "./executionAgent";
import {ISessionDictionary, TestSession} from "./testFSMSession";
import {IMachineGroupDictionary, IExecutionGroupDictionary, IMachineGroup} from "./testRunSchedule2";
import {AsyncTimeoutExec} from "./asyncTimeoutExec";
import * as errors from '../../utils/errors';

interface MachineDictionary {
    [index: string]: MachineFSM;
}

export class TestFSM extends AsyncTimeoutExec {
    timeouts: any;

    executionInfo: any;
    threadsCount: number;
    machineFSMs: MachineDictionary = {};

    machineGroup: IMachineGroupDictionary; // set in schedule
    executionGroupList: IExecutionGroupDictionary; // set in schedule
    localAgentCount: number; // set in schedule
    //executionGroupCount: number; // set in schedule

    isRemoteExecution: boolean = false; // set after schedule
    isAllInOneDataCenter: boolean = true; // set after schedule

    testSession: ISessionDictionary = {};
    sessionSize: number = 0; // max session size usually just session size, used to find optimal batch size

    setStatus(status) {
        this.log.info('Update manager status', status);
        this.executionInfo.status['Manager'].textStatus = status;
        this.progressReport();
    }

    progressReport() {
        this.executionInfo.progressReport(this.executionInfo, this.executionInfo.status);
    }

    constructor(executionInfo:any) {
        super(executionInfo.log);
        this.threadsCount = executionInfo.threadsCount || 1;
        this.timeouts = executionInfo.timeouts || {};
        this.executionInfo = executionInfo;
    }

    paddy(num: number, width: number, c?: string): string {
        let pad_char = typeof c !== 'undefined' ? c : '0';
        let pad = new Array(1 + width).join(pad_char);
        return (pad + num).slice(-pad.length);
    }

    buildFSMStructure() {
        this.executionInfo.status = {
            'Manager': {
                _id: '__0',
                name: 'Manager',
                textStatus: 'Starting...'
            }
        };

        let sessionIdx = 0;
        let nameWidth = ('' + this.threadsCount).length;
        for (let i = 0; i < this.threadsCount; i++) {
            let loopCount = this.executionInfo.iterationsCount;
            let machineId = this.executionInfo.seedName + '-' + this.paddy(i + 1, nameWidth);

            //Find the correct test profile for this iteration, for now just mod
            let profileId = i % this.executionInfo.testProfiles.length;
            if (this.executionInfo.options['random-profile']) {
                profileId = Math.floor((Math.random() * this.executionInfo.testProfiles.length));
            }
            let testProfile = this.executionInfo.testProfiles[profileId];

            let machineFSM: MachineFSM = new MachineFSM(loopCount, machineId, this, i, topicLog(machineId, this.log), testProfile);
            let runGroup: string = this.executionInfo.getRunGroup(this.executionInfo, machineFSM, i);

            /*
            machineFSM.log.debug(util.format('User profile id %s', machineId), {
                id: i,
                profileId: i % this.executionInfo.testProfiles.length,
                profileCount: this.executionInfo.testProfiles.length,
                profile: machineFSM.testProfile});
            */

            if (!this.testSession[runGroup]) {
                sessionIdx++;
                this.testSession[runGroup] = new TestSession(sessionIdx, runGroup, loopCount, this, topicLog(runGroup, this.log));
            }
            this.testSession[runGroup].machines.push(machineFSM);
            machineFSM.session = this.testSession[runGroup];
            machineFSM.inSessionIdx = this.testSession[runGroup].machines.length;
            this.machineFSMs[machineFSM.machineId] = machineFSM;
            this.sessionSize = Math.max(this.sessionSize, this.testSession[runGroup].machines.length);
        }

        this.setStatus('Starting...');
    }

    async run() {
        let failure: boolean = false;
        let runError:string = null;
        let assumeSystemError = true;

        try {
            this.buildFSMStructure();

            await this.schedule();

            await this.loadMachine();

            assumeSystemError = false;
            await this.startAgents();
        } catch (err) {
            runError = err.message;
            failure =  true;
            if (assumeSystemError) {
                this.executionInfo.results.systemFailure = true;
            }

            if (!(err instanceof errors.ValidationError)) {
                this.log.error('TestFSM run error', err.stack);
            }
        } finally {
            //need to stop unstoped containers, usually we stop them as soon as test finished but in case of an error in load machine we will do it here
            //now this is tricky, loadMachine() fail but some is still in progress, if we clean here too fast, some will stay after cleanup
            await this.cleanupAgents();
            await this.testCompleted(failure, runError);
        }

        return this.executionInfo.results;
    }

    async schedule() {
        //dont set machine status here, this is manager level activity
        //_.each(this.machineFSMs, (fsm: MachineFSM) => fsm.setStatus('Plan test execution ' + fsm.remoteRunMode));

        this.setStatus('Plan test execution');
        let opname = 'Plan test execution';
        let timeout = this.timeouts.schedule || 6 * 60 * 1000; // include time to create DA

        await this.exec(opname, timeout,
            this.executionInfo.schedule(this.executionInfo, this));

        this.isRemoteExecution = !!this.executionInfo.executionAgent;
        this.isAllInOneDataCenter =
            (this.localAgentCount === Object.keys(this.machineFSMs).length) ||
            (this.localAgentCount === 0 && Object.keys(this.executionGroupList).length === 1);
    }

    async loadMachine() {
        this.setStatus('Loading machines');
        //_.each(this.machineFSMs, (fsm: MachineFSM) => fsm.setStatus('Loading machine ' + fsm.remoteRunMode));

        let plist = [];

        plist.push(this.loadLocalMachinesAndAgents());

        //if all test run on one remote data center no need to wait for sync message and load the remote is done in tesT sTART
        if (!this.isAllInOneDataCenter) {
            _.each(this.executionGroupList, async (executionGroup: ExecutionGroup, executionGroupName: string) => {
                plist.push(this.loadRemoteExecution(executionGroup));
            });

            //if are are remote we need to wait for master to send us start
            if (this.isRemoteExecution) {
                plist.push(this.waitForStartMessageFromMaster())
            }
        }

        return await this.settleAll(plist);
    }

    async waitForStartMessageFromMaster() {
        let opname = 'Wait for sync message from master';
        let timeout = this.timeouts.loadRemoteExecution || 60000;

        return await this.exec(opname, timeout,
            this.executionAgent().waitForStartMessage()
        );
    }

    async loadLocalMachinesAndAgents() {
        await this.loadLocalMachines();
        await this.loadLocalAgents();
        if (!this.isAllInOneDataCenter) {
            await this.notifyWeAreReady(); // send indication we are ready
        }
    }

    async loadLocalMachines() {
        let opname = 'Create Machine';
        let timeout = this.timeouts.createMachine || 60000;

        return await this.exec(opname, timeout,
            this.settleAll(_.map(this.machineGroup, async (machineGroup: IMachineGroup) => {
                return this.executionInfo.createMachine(this.executionInfo, machineGroup)
            }))
        );
    }

    async loadLocalAgents() {
        let MAX_AGENT_IN_BATCH: number = 8;
        let opname = 'Create Agent';
        let timeout = this.timeouts.createAgent || 120000;

        //Want to do this in batch of MAX_AGENT_IN_BATCH based machineFSM.machineGroup
        let allLeft: MachineFSM[] = [];
        _.filter(this.machineFSMs,
            (machine:MachineFSM) => {
                if (machine.remoteRunMode === 'local') {
                    allLeft.push(machine);
                }
            });

        let batchId = 1;
        while (allLeft.length > 0) {
            let startBatch: MachineFSM[] = [];
            let nextBatch: MachineFSM[] = [];

            _.each(allLeft, (machine: MachineFSM) => machine.machineGroup.batchStartingCount = 0);

            _.each(allLeft, (machine: MachineFSM) => {
                if (machine.machineGroup.batchStartingCount < MAX_AGENT_IN_BATCH) {
                    machine.machineGroup.batchStartingCount++;
                    startBatch.push(machine);
                } else {
                    nextBatch.push(machine);
                }
            });

            if (batchId > 1 || nextBatch.length > 0) {
                opname = 'Create agent batch #' + batchId;
            }
            await this.exec(opname, timeout,
                this.settleAll(_.map(startBatch, async (machineFSM: MachineFSM) => machineFSM.createAgent() ))
            );

            batchId++;
            allLeft = nextBatch;
        }
    }

    async notifyWeAreReady() {
        await this.executionInfo.notifyReady(this.executionInfo);
    }

    async cleanupAgents() {
        let plist = [];
        let opname = 'Cleanup agents';
        let timeout = 30000;

        _.each(this.testSession, async (testSession: TestSession) => {
            plist.push(testSession.cleanup());
        });

        _.each(this.executionGroupList, async (executionGroup: ExecutionGroup, executionGroupName: string) => {
            plist.push(executionGroup.cleanup());
        });

        return await this.exec(opname, timeout,
            Promise.all(plist)
        );
    }

    async startAgents() {
        this.setStatus('Run Test');
        let plist = [];
        let opname = 'Run Test';
        let timeout = this.timeouts.runTest * this.executionInfo.iterationsCount * 1.5; // add 50% for reach test, need to consider retry

        _.each(this.testSession, async (testSession: TestSession) => {
            plist.push(testSession.start());
        });

        _.each(this.executionGroupList, async (executionGroup: ExecutionGroup, executionGroupName: string) => {
            plist.push(this.startRemoteExecution(timeout, executionGroup));
        });

        if (this.executionGroupList && Object.keys(this.executionGroupList).length > 0) {
            timeout += 20000; // increase timeout of master test above the time of each remote one, so the remote expire before the full test
        }

        return await this.exec(opname, timeout,
            this.settleAll(plist)
        );
    }

    async loadRemoteExecution(executionGroup: ExecutionGroup) {
        let opname = executionGroup.name + ' Load Remote Machines';
        let timeout = this.timeouts.loadRemoteExecution || 60000;

        return await this.exec(opname, timeout,
            this.executionInfo.loadRemoteExecution(this.executionInfo, executionGroup)
        );
    }

    async startRemoteExecution(timeout: number, executionGroup: ExecutionGroup) {
        let opname = executionGroup.name + ' Run Remote Machines';

        let answer;
        if (this.isAllInOneDataCenter) {
            timeout += this.timeouts.createMachine || 60000;
            answer = await this.exec(opname, timeout,
                this.executionInfo.loadAndStartRemoteExecution(this.executionInfo, executionGroup)
            );
        } else {
            answer = await this.exec(opname, timeout,
                this.executionInfo.startRemoteExecution(this.executionInfo, executionGroup)
            );
        }

        return answer;
    }

    async testCompleted(failure: boolean, textError: string) {
        this.setStatus('Test done, Analyze results');
        await this.executionInfo.testCompleted(this.executionInfo, this, failure, textError);
        this.setStatus('Done');
    }

    setRemoteMachineStatus(machineId: string, status: any): void {
        let machineFSM = this.machineFSMs[machineId];
        if (machineFSM &&
            machineFSM.remoteRunMode === 'remote') {
            if (status.agentInfo) {
                this.executionInfo.status[machineId].agentInfo = status.agentInfo;
            }
            machineFSM.setStatus(status.textStatus, true);
            //this.log.info(util.format('Set remote machine %s status %s', machineId, status.textStatus));
        }
    }

    executionAgent(): ExecutionAgent {
        return this.executionInfo.executionAgent;
    }

    //send from remote to master, we are ready
    async sendSessionSyncMessageToMaster(testSession: TestSession) {
        let executionAgent = this.executionAgent();
        await executionAgent.sendSessionSyncMessageToMaster(testSession.name);
    }


    async sendSessionSyncMessageToRemote(testSession: TestSession, dataCenters: string[]) {
        Promise.all(_
                .map(dataCenters, (dataCenterName) => this.executionGroupList[dataCenterName])
                .map(async (executionGroup: ExecutionGroup) => executionGroup.sendSessionSyncMessageToRemote(testSession.name))
        );
    }

    receivedSyncMessageToMaster(dataCenterName: string, sessionName: string) {
        let _testSession = this.testSession[sessionName];
        if (_testSession) {
            _testSession.receivedSyncMessageToMaster(dataCenterName);
        } else {
            throw Error('Session not found ' + sessionName);
        }
    }

    receivedSyncMessageToRemote(sessionName: string) {
        let _testSession = this.testSession[sessionName];
        if (_testSession) {
            _testSession.receivedSyncMessageToRemote();
        } else {
            throw Error('Session not found ' + sessionName);
        }
    }

    receivedMessageBroadcastToMaster(sessionName: string, msgType: string, data: any) {
        let _testSession = this.testSession[sessionName];
        if (_testSession) {
            _testSession.sendBroadcastMessage(msgType, data)
                .then(() => true )
                .catch((err) => this.log.error(err.stack));
        } else {
            throw Error('Session not found ' + sessionName);
        }
    }

    receivedMessageBroadcastToRemote(sessionName: string, msgType: string, data: any) {
        let _testSession = this.testSession[sessionName];
        if (_testSession) {
            _testSession.sendBroadcastMessageLocal(msgType, data)
                .then(() => true )
                .catch((err) => this.log.error(err.stack));
        } else {
            throw Error('Session not found ' + sessionName);
        }
    }

    anyManualTermination(): boolean {
        return _.some(this.machineFSMs, (machineFSM: MachineFSM) => machineFSM.allocationExtraInfo === 'stop');
    }
}
