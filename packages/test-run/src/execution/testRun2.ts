/// <reference path="../../utils/utils.d.ts" />
'use strict';

import * as util from 'util';
import * as errors from '../../utils/errors';
import * as rp from 'request-promise';
import {updateProjectStat} from '../project/project';
import {saveTestRunInflux, sendMachineAgentAllocation} from './timeSeriesInfo';
import {schedule, getMachineAgentStatus, IJobInfo, release, RedisAllocationData} from "./testRunSchedule2";

import {TestFSM} from "./testFSM2";
import {MonitorQueue} from "../../services/bull-queue";
import {getMonitorQueue} from '../../config/redis-service-connection';
import {GeneralStorage} from '../../utils/storageUtils';
import * as zlib from 'zlib';
import * as calcTestRunCharts from './calcTestRunCharts';
const moment = require('moment');
const _ = require('lodash');

const globalLogger = require('../../config/topic.global.Logging')('testrun', false);
const TestDefinition = require('./test_definition.model');

const config = require('../../config/environment');
const promisify = require('es6-promisify');
import fs = require('fs');
import path = require('path');
import {checkDeprecatedCode} from "./testMisc";
import {disableMonitors} from "../project/project.utils";
import {deepGet, pause} from "../../utils/tsutils";
import {MachineFSM} from "./testFSMMachine";
import {createNewDARequest, stopAll} from "../dynamicAgent/dynamicAgent.utils";

import { handleTestRunStatus } from '../../api/test_run/test_run.misc';

import { getDAByRunName } from '../../api/dynamicAgent/dynamicAgent.utils';

var messaging = null;
if (config.role_isWeb) {
    messaging = require('../../config/messaging');
}
var saveObject = require('../../utils/utils').saveObject;
var throttleStatusMessage

//will replace executionInfo and testRun
export class TestRun {
    executionInfo: any;
    testFSM: TestFSM;
    storage: GeneralStorage;
    v8profile: any;
    startCpu: any;

    log: (...args) => void;
    notice: (...args) => void;

    constructor(executionInfo: any, testFSM: TestFSM) {
        this.executionInfo = executionInfo;
        this.testFSM = testFSM;

        let legLevel = executionInfo.options['log-level'] || 'info';
        this.log = executionInfo.log[legLevel].bind(executionInfo.log);
        this.notice = executionInfo.log['notice'].bind(executionInfo.log);

        let storageLegLevel = executionInfo.options['storage-log-level'] || 'info';
        let storageLog = executionInfo.log[storageLegLevel].bind(executionInfo.log);
        this.storage = new GeneralStorage({
            logger: storageLog
        });
        this.setV8Profile();

        this.startCpu = (process as any).cpuUsage();
    }

    async validate() {
        if (this.executionInfo.projectSetup.projectCanRunTests) {
            if (this.executionInfo.options.runMode === 'monitor') {
                globalLogger.notice(`Project expired, disable monitors ${this.executionInfo.projectSetup.projectName}`);
                await disableMonitors(this.executionInfo.projectSetup.projectId, this.executionInfo.projectSetup.user);
            }

            throw new errors.ValidationError('permissions',
                this.executionInfo.projectSetup.projectCanRunTests + ', please contact <a href="app/support-freshdesk/">support</a>.');
        }

        checkDeprecatedCode(this.executionInfo.testRun.testScript);

        if (this.executionInfo.options.mediaStorage && !this.executionInfo.projectSetup.enableMediaStorage) {

            throw new errors.ValidationError('permissions',
                '#mediaStorage is disabled for your account, Please contact <a href="app/support-freshdesk/">support</a> to enable.');
        }

        let maxSession = this.executionInfo.options.hasVideo ?
            this.executionInfo.projectSetup.maxVideoSessions :
            this.executionInfo.projectSetup.maxAudioSessions;

        if (maxSession + this.executionInfo.projectSetup.maxPAYGVideoSessions < this.executionInfo.threadsCount) {
            throw new errors.ValidationError('permissions',
                'You cannot run more than ' + maxSession + ' agents at a time, based on your current account settings. Please contact <a href="app/support-freshdesk/" onclick="swal.close();">support</a> if you need more agents.');
        }

        if (maxSession < this.executionInfo.threadsCount &&
            this.executionInfo.projectSetup.verifyPAYGexecutions &&
            !this.executionInfo.options['payg-confirm']) {
            throw new errors.ValidationError('missing-payg-confirm',
                'This test execution will use your credits.');
        }

        if (this.executionInfo.options.runMode === 'monitor' && this.executionInfo.projectSetup.maxAgentsPerMonitor < this.executionInfo.threadsCount) {
            throw new errors.ValidationError('permissions',
                'You cannot run more than ' + this.executionInfo.projectSetup.maxAgentsPerMonitor + ' agents in each monitor, based on your current account settings. Please contact <a href="app/support-freshdesk/">support</a> if you need more agents.');
        }



        for (let i = 0; i < this.executionInfo.testProfiles.length; i++) {
            let testProfile = this.executionInfo.testProfiles[i];

            let browserSetup = _.find(this.executionInfo.configDataMain['docker-machines'], function(browserSetup) {
                return browserSetup.id === testProfile.browser;
            });

            if (!browserSetup) {
                throw new errors.ValidationError('missing-data', 'Cannot run test, Browser is missing');
            }

            if (!testProfile.location) {
                throw new errors.ValidationError('missing-data', 'Cannot run test, Location is missing');
            }

            let setup = this.executionInfo.configDataMain;
            let netSetup = setup['network-profiles'];
            let networkProfile = testProfile.network;
            let networkIdx = _.findIndex(netSetup, {id: networkProfile});

            if (networkIdx < 0) {
                throw new errors.ValidationError('missing-data', 'Cannot run test, Network profile missing');
            }

            let firewallSetup = setup['firewall-profiles'];
            let firewallProfile = testProfile.firewall;
            let firewallIdx = _.findIndex(firewallSetup, {id: firewallProfile});
            if (firewallIdx < 0) {
                throw new errors.ValidationError('missing-data', 'Cannot run test, Firewall missing');
            }

            let media = this.getMediaObject(testProfile);
            if (!media) {
                throw new errors.ValidationError('missing-data', 'Cannot run test, Media missing');
            }
        }
    }

    getBrowserType(machineFSM) {
        return machineFSM.testProfile.browser.indexOf('-firefox-') > 0 ? 'firefox' : 'chrome';
    };

    useGetStat(machineFSM) {
        var browser = this.getBrowserType(machineFSM);
        // TODO: browser === 'firefox' I guess we do not need it for a condition
        return this.executionInfo.options.getstat || this.executionInfo.options.getstats;
    };

    async saveLogs() {
        let executionInfo = this.executionInfo;
        let log = executionInfo.log;
        let cpuUsage = (process as any).cpuUsage(this.startCpu);
        log.info('End of log file, saving logs agents:%s replay:%s getstats:%s cpu:%s mem:%s',
            executionInfo.threadsCount,
            executionInfo.options['save-replay'] ? 'YES' : 'NO',
            executionInfo.options.getstat || executionInfo.options.getstats ? 'YES' : 'NO',
            JSON.stringify(cpuUsage),
            JSON.stringify(process.memoryUsage()));

        let fileTransport = executionInfo.log.transports['file'];
        let logFilePath = fileTransport._stream.path;
        executionInfo.log.close();
        executionInfo.log = null;

        let readStream = fs.createReadStream(logFilePath);

        let agentName = executionInfo.executionAgent ? executionInfo.executionAgent.name : 'main';
        let folderName = executionInfo.blobFolderName;
        let fileName = folderName + ':test-run-log-' + agentName;

        //console.log('AzureBlob: before save', fileName);
        await this.storage.getStorageByPrefix(fileName)
            .save(fileName, readStream, {
                compress: true,
                getURL: false,
            });

        //console.log('AzureBlob: After save', fileName);
        return fileName;
    }

    private async addNowJob(jobInfo: IJobInfo) {
        var monitorQueue: MonitorQueue = getMonitorQueue();
        return await monitorQueue.add(jobInfo);
    }

    async releaseMachineAllocation() {
        let allocationFailure = this.executionInfo.results.agentAllocationError;

        if (this.executionInfo.dynamicAgentId) {
            //it just start the task, no need to wait for it to complete
            await stopAll(this.executionInfo.dynamicAgentId);
        }

        if (!allocationFailure) {
            let pendingAllocations = await release(this.executionInfo, this.testFSM);
            if (pendingAllocations) {
                await Promise.all(_.map(pendingAllocations, async(jobInfo: IJobInfo) => await this.addNowJob(jobInfo)));
            }
        }

    }

    async getAssets(fullBlobName: string, log: any): Promise<any> {
        try {
            if (this.executionInfo.options['read-replay'] && fullBlobName.indexOf('getstat_logs') !== -1) {
                // In case we are running replay, let's try to mock getstat blob with a local file
                //  which should have a name {{logname}}.getstat.json
                let filename = this.executionInfo.options['read-replay'].split(',')[0];
                filename = `${filename}.getstat.json`;
                if (!fs.existsSync(filename)) {
                    filename = path.join(config.tmpPath, filename);
                }

                try {
                    let data = await this.getJsonFileLocal(filename);
                    console.log('Mocking getstat data using local file');
                    return data;
                } catch (err) {
                    // Do nothing, just go ahead and read blob from Azure
                }
            }

            if (this.executionInfo.options['read-replay'] && fullBlobName.indexOf('browser_logs') !== -1) {
                // In case we are running replay, let's try to mock browser logs blob with a local file
                //  which should have a name {{logname}}.browser.json
                let filename = this.executionInfo.options['read-replay'].split(',')[0];
                filename = `${filename}.browser.json`;
                if (!fs.existsSync(filename)) {
                    filename = path.join(config.tmpPath, filename);
                }

                try {
                    let data = await this.getJsonFileLocal(filename);
                    //console.log('Mocking browser data using local file');
                    return data;
                } catch (err) {
                    // Do nothing, just go ahead and read blob from Azure
                }
            }
            let storage = this.storage.getStorageByPrefix(fullBlobName);
            return storage.readAsObject(fullBlobName);
        } catch (err) {
            log.error('getAssets Failed: ' + fullBlobName, {err: err.stack});
            throw err;
        }
    }

    setV8Profile() {
        if (this.executionInfo.options.v8profile) {
            throw Error('v8profile not supported, npm install failed on windows due to https://github.com/swig/swig/issues/804 can try again in later time');
            /*
             this.log('setV8Profile');
             this.v8profile = require('v8-profiler');
             this.log('setV8Profile (a2)');
             this.v8profile.startProfiling('start', true);
             */
        }
    }

    async connectWebHook(testRun: any, webHook: any) {
        if (webHook) {
            let req: any = {};
            let url: string;
            let fieldName = null;
            if (webHook.url) {
                url = webHook.url;
            } else if ((typeof webHook) === 'string') {
                if (webHook.indexOf('{') >= 0) {
                    try {
                        this.log('Parse webhook', webHook);
                        webHook = JSON.parse(webHook);
                        req = _.clone(webHook);
                        if (webHook.fieldname) {
                            fieldName = webHook.fieldname;
                            delete req['fieldname'];
                        }
                    } catch (err) {
                        this.log('Failed to parse webhook data', err.stack);
                    }
                } else {
                    req.url = webHook;
                }
            }

            if (req.url) {
                // prepare test run status if it has specific flags
                testRun = (await handleTestRunStatus({ docs: [ testRun ]})).docs[0];

                let data = {
                    testRunId: testRun._id.toString(),
                    testName: testRun.name,
                    runName: testRun.runName,
                    runType: testRun.runMode,
                    status: testRun.status,
                    error: testRun.textError,
                    failureReasons: this.executionInfo.results.allErrors,
                    input: webHook.input
                };

                if (fieldName) {
                    req.json = {};
                    req.json[fieldName] = data;
                } else {
                    req.json = data;
                }

                try {
                    let answer = await rp.post(req);
                    this.log('POST webHook', {req, answer});
                } catch (err) {
                    this.log('POST webHook failed with error, ignore error', {err: err});
                }
            } else {
                this.log('webHook has value but url is missing', {webHook: webHook});
            }
        }
    }

    async writeHeapSnapshot(id) {
        //Not working, exit process
        /*
         console.log('writeHeapSnapshot', id);
         return new Promise<void>((resolve, reject) => {
         if (this.executionInfo.options.v8profile) {
         var tmpDir = process.env.DUMP_OBJECT_FOLDER || './tmp';
         var memDiffFiles = path.join(tmpDir, this.executionInfo.seedName + '-memdiff.' + id + '.heapsnapshot');
         this.log(`v8profile - writeSnapshot to ${memDiffFiles}`);

         console.log('writeHeapSnapshot - takeSnapshot', id);
         var snapshot = this.v8profile.takeSnapshot();
         console.log('writeHeapSnapshot - takeSnapshot2', id);
         snapshot.export()
         .pipe(fs.createWriteStream(memDiffFiles))
         .on('finish', () => {
         console.log('writeHeapSnapshot - finish', id);
         //snapshot.delete();
         resolve();
         });
         } else {
         resolve();
         }
         });
         */
    }

    async writeCPUProfile(id) {
        if (this.executionInfo.options.v8profile) {
            var tmpDir = process.env.DUMP_OBJECT_FOLDER || './tmp';
            var memDiffFiles = path.join(tmpDir, this.executionInfo.seedName + '-memdiff.' + id + '.cpuprofile');
            this.log(`v8profile - writeCPUSnapshot to ${memDiffFiles}`);
            var profile1 = this.v8profile.stopProfiling();
            try {
                let result = await promisify(profile1.export.bind(profile1))();
                fs.writeFileSync(memDiffFiles, result);
            } finally {
                profile1.delete();
            }
        }
    }


    getMediaObject(testProfile: any): any {
        var mediaFileName = testProfile.media || 'VOA-VGA';
        return _.find(this.executionInfo.configDataMain['media-list'], (item: any) => {
            return (item.originalFilename === mediaFileName || // pre 0.7.0
            item.id === mediaFileName);
        });
    };

    getMediaProfile(testProfile: any): string {
        var media = this.getMediaObject(testProfile);
        if (media) {
            if (media.video) {
                return util.format('%s (%dx%d)', media.displayName, media.video.resolution.h, media.video.resolution.w);
            } else {
                return util.format('%s', media.displayName);
            }
        } else {
            return 'unknown';
        }
    }

    getHasVideo(testProfile: any): boolean {
        var media = this.getMediaObject(testProfile);
        return media && media.video;
    }

    isFinalState (status) {
      return ['completed', 'finished', 'warnings', 'failure', 'service-failure', 'terminated', 'timeout'].indexOf(status) !== -1;
    }

    sendStatusdMessage (testRunId: string, reportMessage: any, projectId: string) {
      messaging.send('testrun.update.' + testRunId, reportMessage, {projectId: projectId, ttl: 3600});
    }

    progressReport(status: any): void {
        //1 - For large test status is too verbose and big, need to send delta for what was changed since last send?
        //2 - do we throttle the messages, no need to send messages more often then 1 sec,
        // those are just progress notifications and not critical, can collect everything during 1sec from last message and then send.
        if (status) {
            if (!this.executionInfo.options.notificationsOff && messaging) {
                const testRunMessageFrequency = 1; // in second
                var itIsFinalState = this.isFinalState(this.executionInfo.testRun.status);

                if (!throttleStatusMessage) {
                  throttleStatusMessage = _.throttle((testRunId, reportMessage, projectId) => {
                    this.sendStatusdMessage(testRunId, reportMessage, projectId)
                  }, 1000);
                }

                var reportMessage: any = {
                  runStatus: status,
                  testRunStatus: this.executionInfo.testRun.status
                };

                if (itIsFinalState) {
                  reportMessage.testRun = this.executionInfo.testRun;
                  this.sendStatusdMessage(this.executionInfo.testRun._id, reportMessage, this.executionInfo.testRun.project);
                  throttleStatusMessage.cancel();
                  throttleStatusMessage = null
                } else {
                  throttleStatusMessage(this.executionInfo.testRun._id, reportMessage, this.executionInfo.testRun.project);
                }
            }
        }
    }

    pickHighestPriorityMessage(rtcWarnings: any[]): any {
        let trimText = (text) => {
            if (text.length > 120) {
                return text.substring(0, 100) + '...';
            } else {
                return text;
            }
        };


        let cats = ['SYSTEM', 'Script', 'Nightwatch', 'TestExpectations', 'no-data', 'Misc', 'Metric', 'packet-loss', 'rtt', 'ssrc-info', 'BROWSER'];
        let result = '';
        let level = '';
        let topRate = cats.length * 2;
        _.each(rtcWarnings, (warn: any) => {
            let ignore = false;
            if (warn.topic === 'BROWSER' && warn.alertType != 'err') {
                ignore = true;
            }

            if (!ignore) {
                let cat = cats.indexOf(warn.topic);
                if (cat < 0) {
                    cat = cats.indexOf(warn.channel);
                }
                let rate = cat + (warn.alertType == 'err' ? 0 : cats.length);
                if (cat >= 0) {
                    if (rate < topRate) {
                        //let padMachine = warn.machineName ? warn.machineName + ': ' : '';
                        result = trimText(warn.message);

                        if (warn.topic === 'no-data') {
                            result = warn.channel + ' ' + result;
                        }

                        if (warn.machineName) {
                            result = warn.machineName + ': ' + result;
                        }

                        if (this.executionInfo.iterationsCount > 1 && warn.runIndex) {
                            result += ' in iteration ' + warn.runIndex;
                        }
                        level = warn.alertType;
                        topRate = rate;

                    }
                } else {
                    this.executionInfo.log.error('pickHighestPriorityMessage: Unknown category in rtcWarnings', cat, warn.topic, warn.channel, warn);
                }
            }
        });

        return {
            text: result,
            level: level
        };
    }

    addError(testIteration: any, channel: string, msg: string, source: string): void {
        let warn = {
            channel: channel,
            topic: channel,
            alertType: 'err',
            message: msg
        };

        if (!testIteration.sysWarnings) {
            testIteration.sysWarnings = [];
        }
        testIteration.sysWarnings.push(warn);
        this.log('ADD sysWarnings(#2) - err ' + msg, {source: source, warn: warn});
    }

    addUnknownErrorRecord(testIteration: any) {
        if ((testIteration.status === 'error' || testIteration.status === 'failure') && !_.some(testIteration.sysWarnings, (warn: any) => warn.alertType == 'err')) {
            this.addError(testIteration, 'SYSTEM', 'Test failed, unknown error', 'unknown');
        }
    }

    private async getJsonFileLocal(fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, (err, data) => {
                if (err) {
                    return reject(err);
                }

                try {
                    data = JSON.parse(data.toString());
                } catch (err) {
                    return reject(err);
                }

                resolve(data);
            });
        });
    };

    private async reportExecution() {
        const calcSecDiff: (s, e) => number = (startDate: any, endDate: any): number => {
            const _endDate: any = moment(this.executionInfo.testRun.endDate);
            const _startDate: any = moment(this.executionInfo.testRun.createDate);
            return Math.ceil(moment.duration(_endDate.diff(_startDate)).asSeconds());
        };

        const systemNames: any = {
            prod: 'app.testrtc.com',
            production: 'app.testrtc.com',
            dev: 'dev.testrtc.com',
            staging1: 'staging.testrtc.com',
            staging2: 'staging.testrtc.com'
        };
        const eventType = this.executionInfo.options.runMode === 'monitor' ? 'event-monitor-run' : this.executionInfo.projectSetup.adminLoginAs ? 'event-admin-test-run' : 'event-test-run';
        const projectName: string = this.executionInfo.projectSetup.projectName || 'unknown';
        const testName: string = this.executionInfo.testRun.name || 'unknown';
        const testRunName: string = this.executionInfo.testRun.runName || 'unknown';
        const isDA = this.executionInfo.options['dynamic-probe'] != 'false' &&
                     (this.executionInfo.options['dynamic-probe'] || this.executionInfo.threadsCount > 
                     deepGet(this.executionInfo.projectSetup.configData, ['test-execution', 'auto-da' , 'max-static-probe'], 10));
        const listOfIterations: any[] = this.executionInfo.testIterations;
        const DADescEntry: any = await getDAByRunName(this.executionInfo.testRun.runName); //maybe better with try catch, or let this exception propagate?

        // prepare iterations depending on flags
        const originStatus = this.executionInfo.testRun.status;
        const prepareStatusForIteration = require('../../api/test_definition/testRun').prepareStatusForIteration;
        for (let iteration of listOfIterations) {
            prepareStatusForIteration(this.executionInfo.testRun.runOptions, iteration);
        }

        if (this.executionInfo.testRun.status !== 'started' && this.executionInfo.testRun.status !== 'running') {
            // check for test run
            let anyWarnings, anyErrors;

            for (let iter of listOfIterations) {
            if (iter.sysWarnings) {
                for (let item of iter.sysWarnings) {
                if (item.alertType === 'warn') {
                    anyWarnings = true;
                }

                if (item.alertType === 'err') {
                    anyErrors = true;
                }
                }
            }
            }

            if (anyWarnings) { this.executionInfo.testRun.status = 'warnings'; }
            if (anyErrors) { this.executionInfo.testRun.status = 'failure'; }

            if (!anyErrors && !anyWarnings && this.executionInfo.testRun.status !== 'service-failure') {
                this.executionInfo.testRun.status = 'completed';
            }

            if (originStatus && originStatus === 'terminated') {
                this.executionInfo.testRun.status = originStatus;
            }
        }

        const result = this.executionInfo.testRun.status || 'unknown'; // should check for flags on this?

        const numberOfProbesSuccess = this.executionInfo.testIterations.filter( iter => iter.status === 'completed').length; // to be done
        const numberOfProbesWarning = this.executionInfo.testIterations.filter( iter => iter.status === 'warnings').length; // to be done
        const numberOfProbesFailure = this.executionInfo.testIterations.filter( iter => iter.status === 'failure').length; //to be done

        let actualTestTimeSec: number; // in seconds
        let startupTimeSec: number; //in seconds
        if (isDA) { //need to check on dev server with DA allocation
            const startDate: any = DADescEntry.createDate;
            const endDate: any = this.executionInfo.testRun.endDate;
            const readyDate: any = DADescEntry.readyDate || DADescEntry.createDate;
            actualTestTimeSec = calcSecDiff(readyDate, endDate);
            startupTimeSec = calcSecDiff(readyDate, startDate);
        } else {
            const endDate: any = this.executionInfo.testRun.endDate;
            const startDate: any = this.executionInfo.testRun.createDate;
            actualTestTimeSec = calcSecDiff(startDate, endDate);
            startupTimeSec = 0;
        }

        const totalTestTimeMin: number = actualTestTimeSec / 60 < 10 ? 10 : Math.ceil(actualTestTimeSec / 60); // minutes
        const subscriptionProbesNum: number = +this.executionInfo.threadsCount;

        const maxSession = this.executionInfo.options.hasVideo ? this.executionInfo.projectSetup.maxVideoSessions : this.executionInfo.projectSetup.maxAudioSessions;
        const testRun = this.executionInfo.testRun;
        const paygProbesNum: number = Math.max(0, testRun.parameters.concurrentUsers - maxSession); //used previous implementetion, hope will work
        const loadFactor: number = +this.executionInfo.options['probe-load-factor'] || 1;
        const paygMinutes: number = paygProbesNum * totalTestTimeMin;
        // INFO: we had an issue with double calculation so if customer exceeded a limit we should calculate only PAYG
        const subscriptionMinutes: number = paygMinutes <= 0 ? subscriptionProbesNum * totalTestTimeMin : 0;
        // const subscriptionMinutes: number = subscriptionProbesNum * totalTestTimeMin;
        const totalMinutes: number = subscriptionMinutes + paygMinutes;
        const testRunStartDate: Date = moment(this.executionInfo.testRun.createDate).format('DD-MMM-YYYY');
        const testRunStartTime: string = moment(this.executionInfo.testRun.createDate).format('HH:mm');
        const teardownTimeSec: number = 0; //need to research on it
        const projectId: any = this.executionInfo.testRun.project;
        const userName: string = this.executionInfo.projectSetup.userName || 'unknown';
        const countMinutes: string = result === 'service-failure' ? 'N' : 'Y';
        const totalCountedMinutes: number = countMinutes === 'Y' ? totalMinutes : 0;
        const systemName: string = systemNames[process.env.SYSTEM_NAME] || '';
        const resultUrl: string = `https://${systemName}/app/testRunDetails/${this.executionInfo.testRun._id}`;

        // presave output for generated usage report
        const usage_report = { eventType, projectName, testName, testRunName, result, numberOfProbesSuccess, numberOfProbesWarning,
                                numberOfProbesFailure, actualTestTimeSec, totalTestTimeMin, subscriptionProbesNum, paygProbesNum, loadFactor,
                                subscriptionMinutes, paygMinutes, totalMinutes, countMinutes, totalCountedMinutes, testRunStartDate, testRunStartTime, 
                                startupTimeSec, teardownTimeSec, projectId, userName, resultUrl };
        this.executionInfo.testRun.usage_report = usage_report;

        globalLogger.notice(`%s projectName:%s testName:%s result:%s numberOfProbesSuccess:%d numberOfProbesWarning:%d numberOfProbesFailure:%d actualTestTimeSec:%s TotalTestTimeMin:%s subscriptionProbesNum:%d paygProbesNum:%d loadFactor:%d subscriptionMinutes:%d paygMinutes:%s totalMinutes:%s countMinutes:%s totalCountedMinutes:%d testRunStartDate:%s testRunStartTime:%s startupTimeSec:%s teardownTimeSec:%s projectId:%s userName:%s testRunName:%s resultUrl:%s `,
            eventType,
            projectName,
            testName,
            result,
            numberOfProbesSuccess,
            numberOfProbesWarning,
            numberOfProbesFailure,
            actualTestTimeSec,
            totalTestTimeMin,
            subscriptionProbesNum,
            paygProbesNum,
            loadFactor,
            subscriptionMinutes,
            paygMinutes,
            totalMinutes,
            countMinutes,
            totalCountedMinutes,
            testRunStartDate,
            testRunStartTime,
            startupTimeSec,
            teardownTimeSec,
            projectId,
            userName,
            testRunName,
            resultUrl
        );
    }

    private reportExecutionDelay() {
        if (this.executionInfo.options.monitorScheduleStart) {

            var msg = util.format('event-test-execution-delay: %s sec (%s) reschedule:%s monitor:[%s] test:[%s] project:[%s]',
                Math.round(this.executionInfo.testRun.runDelay / 1000),
                moment((new Date()).getTime() - this.executionInfo.testRun.runDelay).toNow(true),
                this.executionInfo.options.monitorRescheduleCount,
                this.executionInfo.options.monitorName,
                this.executionInfo.testRun.name,
                this.executionInfo.projectSetup.projectName);

            if (this.executionInfo.testRun.runDelay > 1000 * 60 * 5) {
                globalLogger.notice(msg);
            } else {
                globalLogger.info(msg);
            }
        }
    }

    async updateStatistic(stat: any) {
        let testRun = this.executionInfo.testRun;
        let projectSetup = this.executionInfo.projectSetup;
        let options = this.executionInfo.options;
        let now = testRun.lastUpdate;

        let shouldSaveStat =
            !this.executionInfo.results.systemFailure && !this.executionInfo.results.agentAllocationError;

        let shouldReportExec =
            !this.executionInfo.results.agentAllocationError;

        if (shouldReportExec) {
            await this.reportExecution();
            this.reportExecutionDelay();

            //no await, want to run in parallel and don't care when complete
            await saveTestRunInflux(testRun, stat, 0);
        }

        if (shouldSaveStat) {
            if (options.runMode === 'test') {
                await updateProjectStat(projectSetup.projectId, {lastTestRun: now, testRunCount: 1});

                let update = {
                    "$inc": {runCount: 1},
                    "$set": {lastRunDate: now}
                };
                await TestDefinition.update({_id: testRun.testId}, update);
            } else {
                await updateProjectStat(projectSetup.projectId, {lastMonitorRun: now});
            }
        }
    }

    async callSchedule(testFSM: TestFSM) {
        //check if need to create DA, right now logic is simple agents > 10
        let configDataMain = this.executionInfo.projectSetup.configData;
        let projectAgents = this.executionInfo.projectSetup.machineAgentGroups;
        let configAgent = config.agentGroupName;
        let agentTimeout:number = 10 + this.executionInfo.timeouts.runTest * 1.25 / (1000 * 60);

        if (this.executionInfo.options['dynamic-probe'] != 'false' &&
            (this.executionInfo.options['dynamic-probe'] ||
            this.executionInfo.threadsCount > deepGet(configDataMain, ['test-execution', 'auto-da' , 'max-static-probe'], 10))) {
            // calculate how much agents on each region are needed

            let reqName = this.executionInfo.seedName;
            let agentLoadFactor:number = Number(this.executionInfo.options['probe-load-factor']) || 1;
            let maxSessions = Number(deepGet(configDataMain, ['test-execution', 'auto-da' ,
                this.executionInfo.options.hasVideo ? 'maxVideoSessions' : 'maxAudioSessions'], 6));
            let adjustedMaxSession =  Math.floor(1 / (Math.floor(agentLoadFactor * 10000 / (maxSessions)) / 10000));

            let daAgentsPerLocation = {};
            _.each(testFSM.machineFSMs, (machine: MachineFSM) => {
                let location = machine.testProfile.location;
                if (location === 'any') {
                    location = 'East-US';
                }
                daAgentsPerLocation[location] = 1 + (daAgentsPerLocation[location] || 0);
            });

            let daAgents = [];
            _.each(daAgentsPerLocation, (count, location) => {
                let qnt = Math.ceil(count / adjustedMaxSession);
                this.notice('DBG:DA request', { location, count, adjustedMaxSession, maxSessions, qnt, hasVideo: this.executionInfo.options.hasVideo});

                for (let i = 0; i < qnt; i++) {
                    daAgents.push({
                        locationId: location,
                        status: 'init'
                    });
                }
            });

            let provider: string = configDataMain['da_api_provider'] || 'aws'; // by default we use aws

            console.log(`deepGet provider: ${JSON.stringify(deepGet(configDataMain, ['test-execution', 'auto-da' , 'cloud'], provider))}`);
            let dynamicAgent = {
                mstep: agentTimeout,
                runOptions: '#sync',
                // TODO: probably we do not need getting audo-da['cloud'] because we already have da_api_provider var in config
                cloudProvider: deepGet(configDataMain, ['test-execution', 'auto-da' , 'cloud'], provider),
                instanceSize: deepGet(configDataMain, ['test-execution', 'auto-da' , 'agent-size'], 'm4.large'),
                // instanceSize: 'm4.large',
                instanceName: deepGet(configDataMain, ['test-execution', 'auto-da' , 'instance-name'], 'test-agent'),
                reqName: reqName,
                agents: daAgents,
                agentGroup: reqName,
                customer: this.executionInfo.projectSetup.projectName,
            };

            //create and wait for DA to be created
            testFSM.setStatus('Allocating resources');
            let startTime = new Date().getTime();
            let dynamicAgentRecord = await createNewDARequest(this.executionInfo.projectSetup, dynamicAgent, (agentCreated:number, totalAgent:number)=> {
                let pctComplete = Math.floor(100 * agentCreated/totalAgent);
                testFSM.setStatus(`Allocating resources, ${pctComplete}% completed`);
                this.log('DA created', { agentCreated, totalAgent, delay: (new Date().getTime() - startTime) / 1000} );
            });

            testFSM.setStatus('Allocating resources completed, loading probes');
            this.executionInfo.dynamicAgentId = dynamicAgentRecord._id;

            // set schedule to use only those DA, probably need to get fancy in later versions
            this.executionInfo.options['probe'] = reqName;
            projectAgents = reqName;
            configAgent = reqName;
        }

        const _agentInitializePause: number = this.executionInfo.options['delay'] || 1000;
        await pause( _agentInitializePause );

        this.log('DBG: start schedule');
        await schedule(
            this.executionInfo,
            testFSM,
            projectAgents,
            configAgent);

        try {
            let allocation = await getMachineAgentStatus();
            this.log('machine-agent allocation', { allocation: allocation} );
            await sendMachineAgentAllocation(allocation);
        } catch (err) {
            globalLogger.error('Error: Failed to sendMachineAgentAllocation to influxdb, ignore error', err.stack);
        }
    }

}

// stat it is reference
export async function getAccomodatedStats(testIterations: any[], stat: any): Promise<any> {
    let chartsData = [];
    if (stat && testIterations.length > 0) {
        let unzip = promisify(zlib.gunzip);

        testIterations = testIterations.filter( iter => {
          return iter.stat && iter.stat.voiceStartTime;
        });

        // INFO: we don't use stop on the front-end so
        // let's allow only one iteration
        if (testIterations.length) {
            let emptyDate:any = new Date(0).getTime();
            testIterations.sort((a, b) => {
                let aDate:any = emptyDate;
                let bDate:any = emptyDate;
                if (a.stat && a.stat.voiceStartTime) {
                    aDate = a.stat.voiceStartTime;
                }
                if (b.stat && b.stat.voiceStartTime) {
                    bDate = b.stat.voiceStartTime;
                }
                return aDate - bDate;
            });

            // first element had to be the earliest
            // use slice to not save references to array element
            stat.chartBuilding = {
                start: testIterations.slice(0, 1)[0],
                stop: testIterations.slice(testIterations.length - 1)[0],
                firstProbEndsIn: testIterations[0].stat.voiceDuration
            };
        }

        for (let idx = 0; idx < testIterations.length; idx++) {
            if (testIterations[idx].chartData && testIterations[idx].chartData.buffer) {
                let iteration = await unzip(testIterations[idx].chartData.buffer);
                let decodedChartData = JSON.parse(iteration);

                // add needed params to distinguish audio and video
                // also let's make it easier to check direction using
                // directions field instead of using .indexOf
                for (let prop in decodedChartData) {
                    //  get direction and type
                    let chnl = testIterations[idx].stat.channels[prop];
                    if (chnl) {
                        let direction = chnl.direction,
                            type = chnl.media;
                        let conf = {enumerable: true};
                        let props = {
                            direction: Object.assign({}, conf, {value: direction}),
                            type: Object.assign({}, conf, {value: type})
                        };

                        Object.defineProperties(decodedChartData[prop], props);
                    }
                }

                chartsData.push(decodedChartData);
            }
        }
    }

    return chartsData;
}
