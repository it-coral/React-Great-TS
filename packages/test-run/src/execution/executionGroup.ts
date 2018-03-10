'use strict';

import {IPubSub, createPubSub} from "../../services/ipubsub";
import {IMachineAgent, IJobInfo} from "./testRunSchedule2";
import {ITestCompleteInfo} from "./executionAgent";
import {TestFSM} from "./testFSM2";
import * as util from 'util';
import * as _ from 'lodash';
import {getBatchExecQueue} from '../../config/redis-service-connection';
import {Job} from "bull";
import {pause} from "../../utils/tsutils";

var globalLog = require('../../config/logging');

export class SerializedMachineAgent {
    name: string;
    ipAddress: string;
    location: string;
    vncPort:number;
}


export class SerializedExecutionGroup {
    name: string;
    machineAssign: {[index: string]: SerializedMachineAgent} = {};
    pubsubType: string;
}

export class ExecutionGroup extends SerializedExecutionGroup {
    log: any;
    executionInfo: any;
    testIterationSent: number = 0;
    remoteTestDeferred: any;
    remoteTestDeferredExpectedEvent: string = 'start';
    testFSM: TestFSM;
    testPubsub: IPubSub;
    subscribed: boolean = false;
    terminated: boolean = false;
    job: Job;

    constructor(name: string, executionInfo: any, testFSM: TestFSM, pubsubType: string) {
        super();
        this.log = executionInfo.log;
        this.name = name;
        this.pubsubType = pubsubType;
        this.executionInfo = executionInfo;
        this.testFSM = testFSM;
    }

    async load(deferred: any): Promise<boolean> {
        let roomId = this.executionInfo.seedName + '-' + this.name;
        let testChannelId = roomId;
        this.testPubsub = createPubSub('master', 'remote', this.pubsubType, this.log, testChannelId);

        this.remoteTestDeferred = deferred;
        this.remoteTestDeferredExpectedEvent = 'ready';
        this.log.info(util.format('%s - REMOTE: Request Load Machine', this.name));

        await this.listenToPubSub();

        let serializedExecutionGroup: SerializedExecutionGroup = {
            name: this.name,
            machineAssign: this.machineAssign,
            pubsubType: this.pubsubType
        };

        var testDefinitionOptions = {
            videoFileName: this.executionInfo.videoFileName,
            testProfiles: this.executionInfo.testProfiles,
            executionGroup: serializedExecutionGroup,
            testParameters: this.executionInfo.testParameters
        };

        let serializedParameters = {
            msgType: 'load',
            testChannelId: testChannelId,
            seedName: this.executionInfo.seedName,
            testRun: this.executionInfo.testRun,
            configDataMain: this.executionInfo.configDataMain,
            projectSetup: this.executionInfo.projectSetup,
            testDefinitionOptions: testDefinitionOptions,
            options: this.executionInfo.options,
            logLevel: this.executionInfo.logLevel
        };

        if (this.pubsubType === 'local-redis') {
            //For local batch split we send the request in the job queue and not using pubsub
            let jonQueue = getBatchExecQueue();

            //TODO: Refactor IJobInfo  to better match the needed data
            var now = (new Date()).getTime();
            var jobInfo: IJobInfo = {
                monitorId: this.executionInfo.testRun._id,
                monitorName: testChannelId,
                monitorScheduleStart: now,
                monitorRescheduleCount: 0,
                options: serializedParameters
            };

            this.job = await jonQueue.addTestRunBatchRequest(jobInfo);
            this.log.info(this.name + ' sent request to worker');
        } else {
            let signalChannelName = 'dc' + '-' + this.name;
            let signalPubsub = createPubSub('master', 'remote', this.pubsubType, this.log, signalChannelName + '-' + 'signal-channel');
            let answer = await signalPubsub.publish(serializedParameters);
            this.log.info(this.name + ' set test load request to remote dataCenter', {answer: answer});
        }

        return true;
    }

    async runTest(deferred: any): Promise<boolean> {
        this.remoteTestDeferred = deferred;
        this.remoteTestDeferredExpectedEvent = 'end-of-test';
        this.log.info(util.format('%s - REMOTE: signal run-test', this.name));

        await this.testPubsub.publish({
            msgType: 'run-test'
        });
        return true;
    };

    async terminateRemote() {
        this.log.info(util.format('%s - REMOTE: signal terminated', this.name));

        if (this.testPubsub) {
            await this.testPubsub.publish({
                msgType: 'terminated'
            });
        }
        return true;
    };

    async loadAndRunTest(deferred: any) {
        await this.load(deferred);

        this.remoteTestDeferred = deferred;
        this.remoteTestDeferredExpectedEvent = 'end-of-test';
        this.log.info(util.format('%s - REMOTE: load and run', this.name));
    }

    async listenToPubSub() {
        if (!this.testPubsub) {
            throw new Error('Internal error, testPubsub is null');
        }

        this.subscribed = true;
        this.log.info(util.format('%s - REMOTE: Listen [%s]', this.name, this.testPubsub.channel));
        await this.testPubsub.subscribe((message) => {
            try {
                // this.log.info('IS SUBSCRIBED: ', this.subscribed);
                if (this.subscribed) {
                    // this.log.info(`MSGTYPE: ${message.msgType}`);
                    if (message.msgType === 'completed') {
                        let testCompleteInfo: ITestCompleteInfo = message.testCompleteInfo;
                        // this.log.info('COMPLETED: ', testCompleteInfo);
                        let testRun = this.executionInfo.testRun;
                        if (testCompleteInfo.logUrl) {
                            let logUrls = testRun.logUrls || {};
                            logUrls[this.name] = testCompleteInfo.logUrl;
                            testRun.logUrls = logUrls;
                        }

                        if (testCompleteInfo.failure) {
                            this.log.info(util.format('%s REMOTE: Test Failed %s', this.name, testCompleteInfo.textError));
                            if (testCompleteInfo.textError && !testRun.textError) {
                                testRun.status = 'failure';
                                testRun.textError = testCompleteInfo.textError;
                            }
                            this.endOfTest();
                        }
                    }

                    if (message.msgType === 'completed' || message.msgType === 'testIteration') {
                        this.testIterationSent++;
                        if (message['testIteration']) { // in case error this can be empty
                            this.executionInfo.testIterations.push(message['testIteration']);
                            this.log.info(util.format('%s REMOTE: received test iteration %s %d/%d %s:%s', this.name, message.msgType, this.testIterationSent, message['total'], message['testIteration'].runIndex, message['testIteration'].machine));
                        } else {
                            this.log.info(util.format('%s REMOTE: received test WITHOUT iteration %s %d/%d', this.name, message.msgType, this.testIterationSent, message['total']));
                        }

                        if (this.testIterationSent === message['total']) {
                            //received last message, can disconnect
                            this.endOfTest();
                        }
                    }

                    if (message.msgType === 'ready') {
                        //received last message, can disconnect
                        this.log.info(util.format('%s REMOTE: Ready', this.name));
                        if (this.remoteTestDeferredExpectedEvent !== 'ready') {
                            this.log.error(util.format('Unexpected message ready, was waiting for %s', this.remoteTestDeferredExpectedEvent), {msg: message});
                        } else {
                            this.remoteTestDeferred.resolve();
                            this.remoteTestDeferredExpectedEvent = 'after-ready';
                        }
                    }

                    if (message.msgType === 'progress') {
                        let status = message.status;
                        _.each(status, (value, machineId) => {
                            this.testFSM.setRemoteMachineStatus(machineId, value);
                        })
                    }

                    if (message.msgType === 'session-sync-ready-to-master') {
                        this.testFSM.receivedSyncMessageToMaster(this.name, message.sessionName);
                    }

                    if (message.msgType === 'session-broadcast-to-master') {
                        this.testFSM.receivedMessageBroadcastToMaster(message.sessionName, message.broadcastMsgType, message.data);
                    }
                } else {
                    console.error(util.format('PubSub %s - REMOTE: Received incoming message after unsubscribed [%s] -> [%s]',
                        this.name, this.testPubsub ? this.testPubsub.channel : 'null', message.msgType),
                        {msg: message});
                }
            } catch (err) {
                this.log.error(err.stack);
            }
        });
    }

    async sendSessionSyncMessageToRemote(sessionName: string) {
        this.log.info('REMOTE: sendSessionSyncMessageToRemote session=' + sessionName);
        await this.testPubsub.publish({
            msgType: 'session-sync-ready-to-remote',
            sessionName: sessionName
        });
    }

    async sendBroadcastMessage(sessionName: string, msgType: string, data: any) {
        if (this.testPubsub) {
            this.log.info(util.format('REMOTE: sendBroadcastMessage session=%s msgType=%s',sessionName, msgType), {data: data});
            await this.testPubsub.publish({
                msgType: 'session-broadcast-to-remote',
                sessionName: sessionName,
                broadcastMsgType: msgType,
                data: data
            });
        } else {
            this.log.notice(util.format('REMOTE: sendBroadcastMessage session already terminated session=%s msgType=%s',sessionName, msgType), {data: data});
        }
    }

    async jobCleanup(retry:number) {
        if (this.job) {
            let data: any = this.job.data;
            let monitorName = data.info.monitorName;
            try {
                await this.job.remove();
                this.log.info('Job was removed', {job: monitorName});
            } catch (err) {
                if (retry > 0) {
                    this.log.error('Failed to remove job, still working', {job: monitorName});
                    await this.terminateRemote();
                    await pause(4000);
                    this.jobCleanup(retry-1);
                }
            }
            this.job = null;
        }
    }

    async cleanup() {

        //let the last progress message arrive
        setTimeout(() => {
            this.jobCleanup(10)
                .then(() => {
                    this.subscribed = false;
                    if (this.testPubsub) {
                        this.testPubsub.unsubscribe();
                        this.testPubsub = null;
                    }
                })
                .catch((err) => {
                    console.log('Failed to cleanup after execution group', err.stack);
                });
        }, 5000);
    }

    private endOfTest() {
        if (this.testPubsub && !this.terminated) {
            this.terminated = true;
            this.log.info(util.format('%s REMOTE: End', this.name), {recived: this.testIterationSent});
            if (this.remoteTestDeferredExpectedEvent !== 'end-of-test') {
                this.log.error(util.format('Unexpected end-of-test, was waiting for %s', this.remoteTestDeferredExpectedEvent));
            } else {
                this.remoteTestDeferred.resolve();
                this.remoteTestDeferredExpectedEvent = 'after-end-of-test';
            }
        }
    };
}

