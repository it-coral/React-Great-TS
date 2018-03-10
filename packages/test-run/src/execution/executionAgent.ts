'use strict';

import {IMachineAssign} from './testRunSchedule2';
import {dumpObject} from "../../utils/utils";
import {IPubSub, createPubSub} from "../../services/ipubsub";
import {MemoryPubSub} from "../../services/memory.pubsub";
import {PubNubPubSub} from "../../services/pubnub.pubsub";
import {TestFSM} from "./testFSM2";
import * as util from 'util';
import * as _ from 'lodash';

var topicLog = require('../../config/topicLogging');
var syncRun = require('./testRun').syncRun;

export interface ITestCompleteInfo {
    logUrl: string;
    failure: boolean;
    textError: string;
}

export class ExecutionAgentDispatcher {
    pubsub: IPubSub;
    name: string;
    pubsubType: string;
    log: any;
    roomId: string;

    //config.executionAgent.pubsubSetup.pubsubType
    constructor(log: any, name: string, pubsubType: string) {
        this.roomId = 'dc-' + name;
        let channelId = 'signal-channel';
        this.name = name;
        this.log = log;
        this.pubsubType = pubsubType;
        this.pubsub = createPubSub('remote', 'master', pubsubType, log, this.roomId + '-' + channelId);
    }

    async start() {
        //await this.pubsub.connect();

        let startTime = new Date();
        await this.pubsub.subscribe((message) => {
            let messageTime = new Date();
            /*
            if (messageTime.getTime() - startTime.getTime() < 10000) {
                this.log.info(util.format('ExecutionAgentDispatcher incoming message in the 10sec drain period, ignored', this.name), {msg: message});
                return;
            }
            */

            this.log.notice(util.format('ExecutionAgentDispatcher incoming message: %s', this.name), {msg: message});

            if (message.msgType === 'ping') {
                let delay = (new Date()).getTime() - message.time;
                console.log(util.format('%s MSG: %s recv #%s delay:%s', (new Date()).toISOString(), message.uuid, message.msgId, delay));

                setTimeout(() => {
                    message.msgType = 'pong';
                    this.pubsub.publish(message)
                        .then(() => {
                            console.info(util.format('%s MSG: %s send #%s',
                                (new Date()).toISOString(), message.uuid, message.msgId));
                        })
                        .catch((e) => console.log('Echo+Error sending message: ', e));
                }, 100);
            }

            if (message.msgType === 'load') {
                let channelId = message.testChannelId;
                let projectName = message.projectSetup.projectName;
                let seedName = message.seedName;
                let logLevel = message.logLevel || 'info';
                if (!channelId ||
                    !seedName ||
                    !message.testRun ||
                    !message.configDataMain ||
                    !message.projectSetup ||
                    !message.testDefinitionOptions ||
                    !message.options) {
                    this.log.error('Missing data in message', {msg: message});
                }

                let executionAgent = new ExecutionAgent(this.pubsubType, this.name, seedName, this.roomId, channelId, logLevel);
                this.log.notice('Test Execution start', {projectName: projectName, seedName: seedName});

                executionAgent.connect()
                .then(() => executionAgent.start(message))
                .then(() => {
                    this.log.notice('Test Execution completed', {projectName: projectName, seedName: seedName});
                })
                .catch((err) => {
                    console.error(err.stack);
                    //this.log.error('Test Execution Error', {err: err.stack, msg: message, projectName: projectName, seedName: seedName});
                    this.log.error('Test Execution Error:', {err: err.stack, msg: message.msgType, projectName: projectName});
                });
            } else {
                this.log.notice('ExecutionAgentDispatcher unknown message in channel', {msg: message.msgType});
            }
        });
    }
}

export class ExecutionAgent {
    name: string;
    log: any;
    pubsub: IPubSub;
    lastStatus: any;
    pendingSend: boolean;
    testIterationSent: number = 0;
    iterationsExpected: number = 0;
    localAgentCount: number = 0;
    lastTestIteration: any;
    remoteTestDeferred_resolve: any;
    testFSM: TestFSM; // set after schedule
    subscribed: boolean = false;
    isSendProgressReport: boolean = true;

    constructor(pubsubType: string, name: string, seedName: string, roomId: string, channelId: string, logLevel:string) {
        this.name = name;
        this.log = topicLog(this.name, null, {level: logLevel});
        this.log.info('ExecutionAgent started: ' + name, {
            machine: process.env.INSTANCE_NAME,
            pubsubType: pubsubType,
            seedName: seedName,
            roomId: roomId,
            channelId: channelId});

        this.pubsub = createPubSub('remote', 'master', pubsubType, this.log, channelId);
    }

    async connect() {
        //await this.pubsub.connect();
        await this.listenToPubSub();
    }

    async waitForStartMessage() {
        return new Promise<void>((resolve, reject) => {
            this.remoteTestDeferred_resolve = resolve;
        });
    }

    async listenToPubSub() {
        this.subscribed = true;
        let dbgProcess = 'remote'; // this.pubsub.process;
        let dbgChannel = this.pubsub.channel;

        this.log.info(util.format('REMOTE: Listen [%s]', this.pubsub.channel));
        await this.pubsub.subscribe((message) => {
            try {
                if (this.subscribed) {
                    if (message.msgType === 'run-test') {
                        this.remoteTestDeferred_resolve();
                    }

                    if (message.msgType === 'session-sync-ready-to-remote') {
                        this.testFSM.receivedSyncMessageToRemote(message.sessionName);
                    }

                    if (message.msgType === 'session-broadcast-to-remote') {
                        this.testFSM.receivedMessageBroadcastToRemote(message.sessionName, message.broadcastMsgType, message.data);
                    }

                    if (message.msgType === 'terminated') {
                        this.testFSM.terminated = true;
                        if (this.remoteTestDeferred_resolve) {
                            this.remoteTestDeferred_resolve();
                        }
                    }

                } else {
                    console.error(util.format('REMOTE: %s Received incoming message after unsubscribed, ignore message [%s] -> [%s]',
                        dbgProcess, //this.pubsub ? this.pubsub.process : 'null',
                        dbgChannel, //this.pubsub ? this.pubsub.channel : 'null',
                        message.msgType),
                        {msg: message});
                }
            } catch (err) {
                this.log.error(err.stack);
            }
        });
    }

    async start(message: any) {
        this.log.info('REMOTE: Start', {message: message.msgType});
        this.isSendProgressReport = !message.options.notificationsOff;

        message.testDefinitionOptions.executionAgent = this;
        message.testDefinitionOptions.log = this.log;

        await syncRun(
            message.testRun,
            message.configDataMain,
            message.projectSetup,
            message.testDefinitionOptions,
            message.options);
    }

    async iterationCompleted(testIteration: any) {
        this.testIterationSent++;
        if (this.testIterationSent < this.iterationsExpected) {
            this.log.info('REMOTE: iterationCompleted', {
                testIterationSent: this.testIterationSent,
                iterationsExpected: this.iterationsExpected,
            });
            await this.pubsub.publish({
                msgType: 'testIteration',
                testIteration: testIteration._doc,
                count: this.testIterationSent,
                total: this.iterationsExpected
            });
        } else {
            //will be sent with the text complete
            this.log.info('REMOTE: Keep last iterationCompleted to send with complete', {
                    testIterationSent: this.testIterationSent,
                    iterationsExpected: this.iterationsExpected,
                    //testIteration: testIteration._doc
                });

            this.lastTestIteration = testIteration;
        }
    }

    async notifyReady() {
        this.log.info('REMOTE: notifyReady');
        await this.pubsub.publish({
            msgType: 'ready',
        });
    }

    async testCompleted(info: ITestCompleteInfo) {
        this.log.info('REMOTE: testCompleted', {count: this.testIterationSent, total: this.localAgentCount});
        await this.pubsub.publish({
            msgType: 'completed',
            testIteration: this.lastTestIteration ? this.lastTestIteration._doc : null,
            testCompleteInfo: info,
            count: this.testIterationSent,
            total: this.iterationsExpected
        });
        try {
            this.unsubscribe();
        } catch (e) {
            this.log.info('Exception: ', JSON.stringify(e));
        }
    }

    private unsubscribe() {
        if (this.pendingSend) {
            this.doSendProgressReport();
        }

        this.subscribed = false;
        setTimeout(() => {
            this.pubsub.unsubscribe();
            this.pubsub = null;
        }, 1000 * 60);
    }

    doSendProgressReport() {
        this.pendingSend = false;
        if (this.pubsub) {
            this.log.info('REMOTE: doSendProgressReport', {status: this.lastStatus});
            this.pubsub.publish({
                    msgType: 'progress',
                    status: this.lastStatus
                })
                .then((answer) => this.log.info('progress message'))
                .catch((err) => this.log.error('Failed to sent progress message', err.stack));
        } else {
            this.log.info('REMOTE: doSendProgressReport pubsub already disconnected, drop');
        }
    }


    sendProgressReport(status: any) {
        if (this.isSendProgressReport) {
            this.log.info('REMOTE: sendProgressReport', {status: status});
            this.lastStatus = status;
            if (!this.pendingSend) {
                setTimeout(() => this.doSendProgressReport(), 1000);
                this.pendingSend = true;
            }
        } else {
            //just log///
            this.log.info('REMOTE: not sending progress', {status: status});
        }
        //_.throttle(_.bind(this.doSendProgressReport, this), 10);
        //this.doSendProgressReport();
    }

    async sendSessionSyncMessageToMaster(sessionName: string) {
        this.log.info('REMOTE: sendSessionSyncMessageToMaster session=' + sessionName);
        await this.pubsub.publish({
            msgType: 'session-sync-ready-to-master',
            sessionName: sessionName
        });
    }

    async sendBroadcastMessage(sessionName: string, msgType: string, data: any) {
        this.log.info(util.format('REMOTE: sendBroadcastMessage session=%s msgType=%s',sessionName, msgType), {data: data});
        await this.pubsub.publish({
            msgType: 'session-broadcast-to-master',
            sessionName: sessionName,
            broadcastMsgType: msgType,
            data: data
        });
    }
}

