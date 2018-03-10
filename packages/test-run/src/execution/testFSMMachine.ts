'use strict';

import * as util from 'util';
import {TestFSM} from "./testFSM2";
import {IMachineGroup} from "./testRunSchedule2";
import {TestSession} from "./testFSMSession";
import {AsyncTimeoutExec} from "./asyncTimeoutExec";
import {ExecutionGroup} from "./executionGroup";
var reportCriticalError = require('../../utils/criticalErrors').reportCriticalError;

interface RoomInfo {
    roomIdx: number;
    roomId: string,
    roomMember: number;
    sessionSize: number;
}

export class MachineFSM extends AsyncTimeoutExec {
    loopCount: number;
    currentLoop: number = 0;
    machineId: string;
    concurrentIndex: number;
    testFSM: TestFSM;
    error = null;
    containerCreatedStatus: string;
    status: string = 'Initializing...';
    remoteRunMode: string = 'local'; // local = normal run, remote = will be executed remotely, ignore = when executed in main or different remote
    pingCount: number = 0;
    wasFailed: boolean = false;
    session: TestSession = null;
    inSessionIdx: number;
    testProfile: any;
    runTestExecution: any; // the docker wrapper
    executionGroup: ExecutionGroup; // set in schedule
    machineGroup: IMachineGroup; // set in schedule
    vncPort: number; // set in schedule
    sysWarnings: any[] = [];
    allocationExtraInfo: string; // read from redi allocation, filled when other process stop the container
    room: RoomInfo;

    setStatus(status: string, addIteration?: boolean) {
        if (this.remoteRunMode === 'local' || this.remoteRunMode === 'remote') {
            //this.log.debug(util.format('FSM: set Status:%s (was:%s)', status, this.status));
            this.status = status;
            addIteration = addIteration && this.remoteRunMode === 'local' && this.session.loopCount > 1;
            this.testFSM.executionInfo.status[this.machineId].textStatus = addIteration ? `#${this.currentLoop} ${status}` : status;
            this.testFSM.progressReport();
        }
    }

    reportMessage(msg: any) {
        if (msg.msgType === 'progress') {
            this.setStatus(msg.text, true);
        } else if (msg.msgType === 'warn') {
            var warn = {
                channel: 'Nightwatch',
                topic: 'Nightwatch',
                message: msg.text,
                alertType: 'warn'
            };

            this.sysWarnings.push(warn);
        } else if (msg.msgType === 'session-value') {
            // message from the local rtcSetSessionValue()
            this.session.setSessionValue(msg.varName, msg.varValue);
        }
    }

    fsmlog(msg) {
        this.log.info('FSM:' + this.status + ' ' + msg);
    };

    constructor(loopCount: number, machineId: string, testFSM: TestFSM, concurrentIndex: number, log: any, testProfile: any) {
        super(log);
        this.loopCount = loopCount;
        this.currentLoop = 0;
        this.machineId = machineId;
        this.concurrentIndex = concurrentIndex;
        this.testFSM = testFSM;
        this.testProfile = testProfile;
        this.containerCreatedStatus = 'not-created';
    }

    setRemoteRunMode(remoteRunMode: string) {
        this.remoteRunMode = remoteRunMode;
        if (this.remoteRunMode === 'local' || this.remoteRunMode === 'remote') {
            let sessionDisplayName = this.room.roomIdx.toString();
            let sessionSize = this.session.machines.length;
            if (sessionSize > 1) {
                sessionDisplayName = `${this.room.roomMember + 1}: ${sessionSize} | ${sessionDisplayName}`;
            }

            this.testFSM.executionInfo.status[this.machineId] = {
                _id: this.machineId,
                name: this.machineId,
                sessionName: sessionDisplayName,
                textStatus: this.status,
            };
        }
    }

    async createAgent() {
        if (this.remoteRunMode === 'local') {
            let opname = util.format('Loading agents and configure test (%s:%s)', this.machineId, this.machineGroup.agentSetup.name);
            let timeout = this.testFSM.executionInfo.timeouts.createAgent || 120000;

            this.containerCreatedStatus = 'created';
            await this.exec(opname, timeout,
                this.testFSM.executionInfo.createAgent(this.testFSM.executionInfo, this.machineId, this, this.machineGroup));
        }
    }

    async resetGroupInfo() {
        if (this.remoteRunMode === 'local') {
            let opname = util.format('Reset Group Info (%s:%s)', this.machineId, this.machineGroup.agentSetup.name);
            let timeout = this.testFSM.executionInfo.timeouts.prepareGroupIteration || 5000;
            await this.exec(opname, timeout,
                this.testFSM.executionInfo.prepareGroupIteration(this.testFSM.executionInfo, this.machineId, this));
        }
    }

    async run(loop: number) {
        if (this.remoteRunMode === 'local') {
            this.currentLoop = loop;
            this.setStatus('Running Test #' + loop, false);
            this.fsmlog('');

            let opname = util.format('Run Test #%s (%s:%s)', loop, this.machineId, this.machineGroup.agentSetup.name);
            let timeout = this.testFSM.executionInfo.timeouts.runTest || 10 * 60 * 1000;

            await this.exec(opname, timeout + 5000, // just backup should never hit timeout as has internal timeout inside the runTest
                this.testFSM.executionInfo.runTest(this.testFSM.executionInfo, this, timeout));
        }
    }

    async cleanup() {
        if (this.containerCreatedStatus === 'created') {
            this.setStatus('Container Cleanup after error', false);
            this.log.info('cleanup: Container was not stop, stop it');
            this.stop();
        }
    }

    async stop() {
        if (this.remoteRunMode === 'local') {
            this.setStatus('Stopping Container', false);
            this.fsmlog('');

            let opname = util.format('Stopping Container (%s:%s)', this.machineId, this.machineGroup.agentSetup.name);
            let timeout = this.testFSM.executionInfo.timeouts.stopContainer || 10000;

            try {
                await this.exec(opname, timeout,
                    this.testFSM.executionInfo.stopContainer(this.testFSM.executionInfo, this));
            } catch (err) {
                // swallow the error, we don't care to report this to the user
                this.log.notice('stopContainer failed with error', this.machineId, err);

                /*
                reportCriticalError(
                    'stopContainer failed with error',
                    this.machineId,
                    {
                        err: err.stack,
                    },
                    false);
                */
            }

            this.setStatus('Test completed', false);
        }
    }

    resetTestGroupMembers(reason: string) {
        this.session.sendBroadcastMessage('session-reset', {reason: reason});
    }

    private resetTest(reason: string) {
        if (this.runTestExecution) {
            this.log.info('FSMMachine Reset Test', {reason: reason});
            this.runTestExecution.resetTest(reason);
        } else {
            this.log.info('Seem container was not loaded yet, not reset Test: ' + reason);
        }
    }

    private setSessionValue(varName: string, varValue: string) {
        if (this.runTestExecution) {
            this.log.info(util.format('setSessionValue: varName:%s varValue:%s', varName, varValue));
            this.runTestExecution.setSessionValue(varName, varValue);
        } else {
            this.log.info(util.format('Seem container was not loaded yet not setting: varName:%s varValue:%s', varName, varValue));
        }
    }

    reciveBroadcastMessage(msgType: string, data: any) {
        if (this.remoteRunMode === 'local') {
            if (msgType === 'session-reset') {
                this.resetTest(data.reason);
            } else if (msgType === 'session-value') {
                this.setSessionValue(data.varName, data.varValue);
            }
        }
    }
}