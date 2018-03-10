'use strict';

import {MachineFSM} from "./testFSMMachine";
import {TestFSM} from "./testFSM2";
import {AsyncTimeoutExec} from "./asyncTimeoutExec";
import {ExecutionGroup} from "./executionGroup";
import * as _ from 'lodash';
import * as util from 'util';

export interface ISessionDictionary {
    [index: string]: TestSession;
}

export class TestSession extends AsyncTimeoutExec {
    sessionIdx: number;
    name: string;
    loopCount: number;
    machines: MachineFSM[] = [];
    dataCenters: { [id: string] : boolean; } = {};
    sessionSyncDeferred_resolve: any;
    isRecivedSyncMessageToRemote: boolean = false;
    testFSM: TestFSM;

    constructor(sessionIdx: number, name: string, loopCount: number, testFSM: TestFSM, log: any) {
        super(log);
        this.sessionIdx = sessionIdx;
        this.name = name;
        this.testFSM = testFSM;
        this.loopCount = loopCount;
    }

    private anyLocalMachine() {
        return _.some(this.machines, (machine: MachineFSM) => machine.remoteRunMode === 'local');
    }

    private allLocalMachine() {
        return _.every(this.machines, (machine: MachineFSM) => machine.remoteRunMode === 'local');
    }

    private prepareSyncDataCenter() {
        //which data centers
        this.isRecivedSyncMessageToRemote = false;
        _.each(this.machines, (machine: MachineFSM) => {
            if (machine.remoteRunMode !== 'local') {
                let dataCenterName = machine.executionGroup.name;
                if (!(dataCenterName in this.dataCenters)) {
                    this.dataCenters[dataCenterName] = false;
                }
            }
        });
    }

    private cleanSyncDataCenter() {
        _.each(this.dataCenters, (value, key) => this.dataCenters[key] = false);
    }

    async start() {
        try {
            let isMaster = !this.testFSM.isRemoteExecution;
            let loop = 1;
            let anyNonLocalMachine = !this.allLocalMachine();
            let anyLocalMachine = this.anyLocalMachine();
            if (anyNonLocalMachine && isMaster) {
                // we are the master of this session, responsible to sync
                this.prepareSyncDataCenter();

                this.log.info(util.format('Master session %s', this.name), {dataCenters: this.dataCenters});

                if (!anyLocalMachine && Object.keys(this.dataCenters).length === 1) {
                    // we are master but session execute locally in 1 data center, don't need to sync,
                    // do need to wait to the end but this is done in the test level
                    return;
                }
            }

            if (!anyLocalMachine && !isMaster) { // we are remote and don't care about this session
                return;
            }

            while (loop <= this.loopCount) {
                let needSync = anyNonLocalMachine && loop < this.loopCount;

                this.cleanSyncDataCenter();
                await this.resetGroupInfo();
                await this.run(needSync && isMaster, loop);
                if (needSync) {
                    await this.syncSession();
                }
                loop++;
            }
        } finally {
            await this.stop();
        }
    }

    private async syncSession() {
        if (this.testFSM.isRemoteExecution) {
            // we are remote, just send we are ready we already wait to receive answer in waitForSessionSyncMessage
            await Promise.all([
                this.testFSM.sendSessionSyncMessageToMaster(this),
                this.waitForSessionSyncMessage()
            ]);
        } else {
            // we are master, wait until all are ready and send answer
            await this.testFSM.sendSessionSyncMessageToRemote(this, Object.keys(this.dataCenters));
        }
    }

    private async waitForSessionSyncMessage() {
        //race, if we got the message before wait
        if (!this.isRecivedSyncMessageToRemote) {
            let opname = util.format('Session [%s] wait to synchronize message', this.name);
            let timeout = this.testFSM.timeouts.runTest;

            await this.exec(opname, timeout,
                new Promise<void>((resolve, reject) => {
                    this.sessionSyncDeferred_resolve = resolve;
                })
            );
        }
    }


    receivedSyncMessageToMaster(dataCenterName: string) {
        this.log.info('Session [%s] received synchronize message from %s', this.name, dataCenterName, {dataCenters: this.dataCenters});
        if (this.sessionSyncDeferred_resolve) {
            // make sure all got and then resolve
            this.dataCenters[dataCenterName] = true;
            if (_.every(this.dataCenters, (value, key) => value)) {
                this.sessionSyncDeferred_resolve();
                this.sessionSyncDeferred_resolve = null;
            }
        }
    }

    receivedSyncMessageToRemote() {
        this.log.info('Session [%s] received synchronize message from master', this.name);
        if (this.sessionSyncDeferred_resolve) {
            this.sessionSyncDeferred_resolve();
            this.sessionSyncDeferred_resolve = null;
        } else {
            //should not happen but race condition where we rcive the message before we wait for it
            this.isRecivedSyncMessageToRemote = true;
        }
    }

    private async resetGroupInfo() {
        await Promise.all(_.map(this.machines, async (machine: MachineFSM) => machine.resetGroupInfo() ));
    }

    private async run(needSync: boolean, loop: number) {
        let plist = _.map(this.machines, async (machine: MachineFSM) => machine.run(loop) );
        if (needSync) {
            plist.push(this.waitForSessionSyncMessage());
        }
        await Promise.all(plist);
    }

    private async stop() {
        await Promise.all(_.map(this.machines, async (machine: MachineFSM) => machine.stop() ));
    }

    async cleanup() {
        await Promise.all(_.map(this.machines, async (machine: MachineFSM) => machine.cleanup() ));
    }

    setSessionValue(varName: string, varValue: string) {
        this.sendBroadcastMessage('session-value', {varName: varName, varValue: varValue})
            .then(() => true )
            .catch((err) => this.log.error(err.stack));
    }

    //can called from message
    async sendBroadcastMessageLocal(msgType: string, data: any) {
        await Promise.all(_.map(this.machines, async (machine: MachineFSM) => machine.reciveBroadcastMessage(msgType, data) ));
    }

    async sendBroadcastMessage(msgType: string, data: any) {
        let isMaster = !this.testFSM.isRemoteExecution;
        let allLocalMachine = this.allLocalMachine();

        if (isMaster || allLocalMachine) {
            let plist = [this.sendBroadcastMessageLocal(msgType, data)];
            if (!allLocalMachine) {
                plist = _(plist)
                    .concat(_.map(this.dataCenters, (value, dataCenterName) => {
                        let executionGroup: ExecutionGroup = this.testFSM.executionGroupList[dataCenterName];
                        return executionGroup.sendBroadcastMessage(this.name, msgType, data);
                        //sendResetTestGroupMembers
                    }))
                    .value();
            }
            await Promise.all(plist);
        }
        else {
            // we are remote and not all is local -> send to master, request and master will call resetTestGroupMembers on the master
            // master will return to us and we reset all

            let executionAgent = this.testFSM.executionAgent();
            await executionAgent.sendBroadcastMessage(this.name, msgType, data);
        }
    }
}
