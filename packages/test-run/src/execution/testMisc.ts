'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import * as errors from '../../utils/errors';
import {SeriesStat} from "./testResultTypes";

const filtrex = require('../../utils/filtrex/filtrex');

interface ISystemWarning {
    channel: string;
    topic: string;
    message: string;
    alertType: string;
}

export class TestExpectations {
    static EXPECTATION_ON_DATA: RegExp = /.*\.(in|out|count|data|packets)\s*(==|<=|>=|!=).*/i;

    private static CHANNEL_PREFIXES = [
        'video.in',
        'video.out',
        'audio.in',
        'audio.out'
    ];


    private static CHANNEL_ATTRIBUTES = [
        'count',
        'empty',
        'bitrate',
        'packets',
        'data',
        'roundtrip',
        'packetloss',
        'jitter',
        'fps',
        'resolution',
        'codec',
        'channel.bitrate',
        'channel.bitrate.maxDrop',
        'channel.packetloss',
        'channel.jitter',
        'channel.fps',
        'channel.resolution',
        'channel.codec',
        'max_count',
        // Internal use:
        'total_packetloss'
    ];

    //globals
    //callSetupTime

    private static CUSTOM_METRICS_NAME_MAP = {
        'VoiceQuality:MOS': 'audio.in.mos',
        'VoiceQuality:Click': 'audio.in.click',
        'VoiceQuality:DeadAir': 'audio.in.deadair',
    };

    private channelInfo: any;
    private warnings: ISystemWarning[];
    private rtcWarnings: ISystemWarning[] = [];

    constructor(testIteration: any, expectation: any, log: any) {
        this.channelInfo = {};
        this.warnings = [];

        this.addDefaultValues();
        if (testIteration.customTestMetric) {
            this.addCustomMetricValues(testIteration.customTestMetric);
        }

        let hasExpectations = (expectation && Array.isArray(expectation.expectation)),
            hasStats = (testIteration.stat && Object.keys(testIteration.stat).length > 0);

        if (hasStats) {
            this.addValues(testIteration);

            let channelReadyTime = new Date(testIteration.stat.channelReadyTime).getTime();
            this.channelInfo['callsetuptime'] = this.round((channelReadyTime - new Date(testIteration.stat.setupStartTime).getTime()) / 1000);

            log.debug('callSetupTime calc ' + testIteration.machine, {
                channelReadyTime: testIteration.stat.channelReadyTime,
                channelReadyTime2: channelReadyTime,
                setupStartTime: testIteration.stat.setupStartTime,
                setupStartTime2: new Date(testIteration.stat.setupStartTime).getTime(),
                callSetupTime: this.channelInfo['callsetuptime']
            });
        }


        // Check non-channel items
        let nonChannelItemsPassed = 0;
        if (hasExpectations) {
            expectation.expectation.forEach((ex) => {
                if (_.isString(ex.expression)) {
                    if (ex.expression.indexOf('.channel.') !== -1) {
                        return;
                    }
                    if (this.checkExpectation('', ex, true)) {
                        //expectation passed but we want to count only data expectation to decided if to have expectation or just no data
                        //must have sapce in the end for not identify .packetloss istead of .packet
                        if (TestExpectations.EXPECTATION_ON_DATA.test(ex.expression)) {
                            if (nonChannelItemsPassed === 0) {
                                log.debug('Expectation passed, will not show No WebRTC Data collected', {ex: ex});
                            }
                            nonChannelItemsPassed++;
                        }
                    }
                } else {
                    this.addWarning('err', 'Invalid expectation expression in test, must be a string', '');
                }
            });
        }

        if (!hasStats && !nonChannelItemsPassed) {
            let warning : ISystemWarning = {
                channel: 'Nightwatch',
                topic: 'pass',
                message: 'No WebRTC Data collected',
                alertType: 'err'
            };

            //remove any other expectation
            this.warnings = [];
            // We do not have any data, add a warning on that and exit
            this.warnings.push(warning);
            return;
        }

        // Check channel items
        let totalPackages = 0;
        if (testIteration.stat) {
            for (let name in testIteration.stat.channels) {
                let channel = testIteration.stat.channels[name],
                    channelDirection = (channel.direction == 'recv' ? 'in' : 'out');

                let isEmpty = channel.totalPackets === 0;
                totalPackages += channel.totalPackets;

                if (channel.media === 'audio' || channel.media === 'video') {
                    let expectationCount = 0;
                    let failedCount = 0;
                    if (hasExpectations) {
                        /*
                        //use to debug
                        if (testIteration.sessionIdx === 7 && name.indexOf('2142310352') >= 0) {
                            console.log('break');
                        }
                        */

                        var part = `${channel.media}.${channelDirection}.channel`;

                        // Reset previous channel values
                        for (let varName in this.channelInfo) {
                            if (varName.indexOf(part) !== -1) {
                                this.channelInfo[varName] = 0;
                            }
                        }

                        this.channelInfo[`${part}.packetloss`] = this.round(((channel.packetLoss || 0) / channel.totalPackets) * 100);
                        this.channelInfo[`${part}.bitrate`] = this.round(channel.bytes.average);
                        this.channelInfo[`${part}.packets`] = channel.totalPackets;
                        this.channelInfo[`${part}.data`] = channel.totalBytes;
                        this.channelInfo[`${part}.roundtrip`] = this.getAverage(channel.rtt);
                        this.channelInfo[`${part}.jitter`] = this.getAverage(channel.jitter);
                        this.channelInfo[`${part}.fps`] = this.round(channel.videoFrameRate) || 0;
                        this.channelInfo[`${part}.resolution`] = channel.videoResolution || '';
                        this.channelInfo[`${part}.codec`] = channel.audioCoddec ? channel.audioCoddec.toLowerCase() : '';
                        this.channelInfo[`${part}.bitrate.maxDrop`] = 20;
                        Object.defineProperty(this.channelInfo, `${part}.bitrate.drop`, {
                            set: function(value) {
                                this.drops = this.drops || {};
                                this.drops[`${part}.bitrateDrop`] = value;
                            },
                            get: function() {
                                return this.drops[`${part}.bitrateDrop`];
                            },
                            configurable: true,
                            enumerable: true
                        });
                        this.channelInfo[`${part}.bitrate.drop`] = this.percentageCalc(testIteration, name);

                        expectation.expectation.forEach((ex) => {
                            if (_.isString(ex.expression)) {
                                if (ex.expression.indexOf(part + '.') === 0) {
                                    expectationCount++;
                                    let ok = this.checkExpectation(`Channel ${channel.channelDisplayName}: `, ex, !isEmpty);
                                    if (!ok) {
                                        failedCount++;
                                        if (!isEmpty) {
                                            this.setChannelError(channel, 'Failed expectation', this.getExpectationAlertType(ex) === 'err' ? 'error' : 'warnings');
                                        }
                                    }
                                }
                            }
                        });
                    }

                    if ((expectationCount === 0 || failedCount > 0) && isEmpty) {
                        this.addChannelError(channel, 'no-data', 'No data ' + (channel.direction === 'send' ? 'sent' : 'received'));
                        this.setChannelError(channel, 'No data ' + (channel.direction === 'send' ? 'sent' : 'received'), 'warnings');
                    }
                }
            }
        }

        if (!totalPackages && !nonChannelItemsPassed) {
            let warning : ISystemWarning = {
                channel: 'TestExpectations',
                topic: 'pass',
                message: 'No media is sent or received',
                alertType: 'err'
            };

            // We do not have any data, add a warning on that and exit
            this.warnings.push(warning);
        }
    }

    setChannelError(channel:any, message:string, status:string) {
        if (!channel.error || (channel.status !== 'error' && status == 'error')) {
            channel.status = status;
            channel.error = message;
        }
    }


    private percentageCalc (testIteration: any, name: string): number {
      let cdRef = testIteration.chartData[name];
      let cnlRef = testIteration.stat.channels[name];

      // because in chartData we have bits not bytes
      let average = cnlRef.bytes.average * 1000;

      // find minimum number for comparison
      let preparedBitsArray = cdRef.bits.slice(cnlRef.bytes.rampUpTime);
      let maxDropInNumber = Math.min.apply(Math, preparedBitsArray);

      // get max drop in percentage
      return ( (average - maxDropInNumber) / average ) * 100;
      // return (maxDropInNumber / average) * 100;
    };

    addChannelError(channel: any, topic: string, msg: string) {
        let name = (channel.direction === 'send' ? 'Outgoing' : 'Incoming') + ' - ' +
            (channel.media === 'video' ? 'Video' : 'Audio') + ' - ' +
            channel.channelDisplayName;

        let error = {
            channel: name,
            alertType: 'err',
            topic: topic,
            message: msg
        };

        this.rtcWarnings.push(error);
    }

    getWarnings(): ISystemWarning[] {
        return this.warnings;
    }

    getRtcWarnings(): ISystemWarning[] {
        return this.rtcWarnings;
    }

    private addDefaultValues() {
        for (let prefix of TestExpectations.CHANNEL_PREFIXES) {
            this.channelInfo[prefix] = 0;
            for (let attr of TestExpectations.CHANNEL_ATTRIBUTES) {
                this.channelInfo[`${prefix}.${attr}`] = 0;
            }
        }
    }

    private addCustomMetricValues(customTestMetric: any) {
        _.forEach(customTestMetric, (metric:any, name:string) => {
            let propName = TestExpectations.CUSTOM_METRICS_NAME_MAP[name] || name;
            this.channelInfo[propName] = metric.value;
        });
    }

    private addValues(testIteration: any) {
        const updateStrValues = (part:string, newValue:string, statName:string) => {
            //throw pcma https://redmine.testrtc.com/issues/1170#change-5875
            if (newValue && newValue !== '-1x-1' && newValue !== 'pcma') {
                newValue = newValue.toLowerCase();
                let value = this.channelInfo[`${part}.${statName}`];
                if (!value && newValue) {
                    value = newValue;
                } else if (value && newValue && value !== newValue) {
                    if ((',' + value + ',').indexOf(',' + newValue + ',') <= 0) {
                        value += ',' + newValue;
                    }
                }
                this.channelInfo[`${part}.${statName}`] = value;
            }
        };

        // part is media.direction (audio.in etc)
        // seriesStat is array of values like jitter
        const updateValues = (part: string, seriesStat: any, statName: string) => {
            if (!(part in valuesInfo[statName])) {
                valuesInfo[statName][part] = { sum: 0, count: 0 };
            }
            if (seriesStat && seriesStat.average) {
                valuesInfo[statName][part].sum += seriesStat.average;
                valuesInfo[statName][part].count++;
            }
        };

        // A hash containing roundtrip data per channel in order to calculate average
        let valuesInfo = {
            roundtrip: [],
            jitter: [],
            fps: []
        };

        // channels traverse, gathering general info
        // this info relates to iteration, not specific channel
        // so thus we travers all channels and accomodate info
        for (let name in testIteration.stat.channels) {
            let channel = testIteration.stat.channels[name],
                isWebkitSSRC = name.indexOf('ssrc_') >= 0,
                isFirefox = /^(in|out)bound_rtp_/i.test(name);

            if (!isFirefox && !isWebkitSSRC) {
                // Push this SSRC warning only for webkit channels (probably data ones)
                this.warnings.push({
                    channel: 'SDP',
                    topic: 'ssrc-info',
                    message: `Channel ${channel.channelDisplayName} without ssrc information (probably issue in SDP) limited/skewed stats`,
                    alertType: 'warn'
                });
            }

            // INFO: we do not support data channels but we
            // have data channels support in top level charts
            if (channel.media === 'audio' || channel.media === 'video') {
                let part = channel.media + '.' + (channel.direction == 'recv' ? 'in' : 'out');

                if (channel.totalPackets) {
                    this.channelInfo[part]++; //Don't get for what it is
                    this.channelInfo[`${part}.count`]++;
                    this.channelInfo[`${part}.packets`] += channel.totalPackets || 0;
                    this.channelInfo[`${part}.data`] += channel.totalBytes || 0;
                    this.channelInfo[`${part}.total_packetloss`] += channel.packetLoss || 0;
                    this.channelInfo[`${part}.packetloss`] += (100 * this.channelInfo[`${part}.total_packetloss`] / this.channelInfo[`${part}.packets`]) || 0;
                    this.channelInfo[`${part}.bitrate`] += channel.bytes.average || 0;

                    // because we can't set .bitrate and after .bitrate.drop
                    // it would override .bitrate prop
                    Object.defineProperty(this.channelInfo, `${part}.bitrate.drop`, {
                        set: function(value) {
                            this.drops = this.drops || {};
                            this.drops[`${part}.bitrateDrop`] = value;
                        },
                        get: function() {
                            return this.drops[`${part}.bitrateDrop`];
                        },
                        configurable: true,
                        enumerable: true
                    });

                    this.channelInfo[`${part}.bitrate.drop`] = this.percentageCalc(testIteration, name);
                    // this.channelInfo[`${part}.channel.bitrate.drop`] = percentageCalc();

                    this.channelInfo[`${part}.jitter`] += this.getAverage(channel.jitter);
                    this.channelInfo[`${part}.fps`] += channel.videoFrameRate || 0;
                    updateValues(part, channel.rtt, 'roundtrip');
                    updateValues(part, channel.jitter, 'jitter');
                    if (channel.media === 'video') {
                        updateValues(part, {average: channel.videoFrameRate}, 'fps'); // fake SeriesStat
                    }

                    updateStrValues(part, channel.audioCoddec, 'codec');
                    updateStrValues(part, channel.videoResolution, 'resolution');
                } else {
                    this.channelInfo[`${part}.empty`]++;
                }
            }
        }

        for (let prefix of TestExpectations.CHANNEL_PREFIXES) {
            this.channelInfo[`${prefix}.bitrate`] = this.round(this.channelInfo[`${prefix}.bitrate`]) || 0;
            this.channelInfo[`${prefix}.packetloss`] = this.round(this.channelInfo[`${prefix}.packetloss`]) || 0;
            if (testIteration.stat.maxChannelCount) {
              this.channelInfo[`${prefix}.max_count`] = prefix.split('.').reduce((o, i) => { 
                return o[i];
              }, testIteration.stat.maxChannelCount);
            }
            _.each(valuesInfo, (value, key) => {
                if (prefix in value) {
                    this.channelInfo[`${prefix}.${key}`] = this.round(value[prefix].sum / value[prefix].count) || 0;
                }
            });
        }
    }

    private getExpectationAlertType(expectation: any):string {
        let alertType = (expectation.alert || 'err').toLowerCase();

        if (alertType == 'err' || alertType == 'error') {
            alertType = 'err';
        } else {
            alertType = 'warn';
        }

        return alertType;
    }

    private checkExpectation(prefixMsg: string, expectation: any, shouldAddWarnings: boolean) {
        let result = false,
            expression = expectation.expression.split("'").join('"').toLowerCase(); // filtrex seem to work only with double quote

        try {
            let msg = expectation.msg,
                alertType = this.getExpectationAlertType(expectation);

            var func = filtrex(expression);
            result = func(this.channelInfo);

            if (!result && shouldAddWarnings) {
                let actualValue = null,
                    actualVar = null,
                    isDropCheck = expression.indexOf('channel.bitrate.drop') !== -1;

                if (isDropCheck) {
                  const splittedExp = expression.split('.');
                  const part = [ splittedExp[0], splittedExp[1], splittedExp[2] ].join('.');
                  const fullPath = `${part}.bitrateDrop`;
                  actualValue = this.channelInfo.drops[`${fullPath}`] || 0;
                  actualVar = `${part}.channel.bitrate.drop`;
                } else {
                  for (let varName in this.channelInfo) {
                      if (expression.indexOf(varName) !== -1 && expression.indexOf(varName + '.') === -1) {
                          actualValue = this.channelInfo[varName] || 0;
                          actualVar = varName;
                      }
                  }
                }

                if (actualVar) {
                    //this.addWarning(alertType, prefixMsg + (msg || 'Failed test expectation'), util.format('[%s], Actual [%s == %s]', expression, actualVar, actualValue));
                    this.addWarning(alertType, prefixMsg + (msg || 'Failed test expectation'), util.format('[%s], Actual [%s]', expression, actualValue));
                } else {
                    this.addWarning(alertType, prefixMsg + (msg || 'Failed test expectation'), util.format('[%s]', expression));
                }
            }
        } catch (err) {
            this.addWarning('err', 'Invalid expression in rtcSetTestExpectation', util.format('[%s]', expression));
        }

        return result;
    }

    private addWarning(alertType: string, userMsg: string, msg: string) {
        let warning: ISystemWarning = {
            channel: 'TestExpectations',
            topic: 'TestExpectations',
            message: userMsg + ' ' + msg,
            alertType: alertType
        };

        this.warnings.push(warning);
    }

    private getAverage(seriesStat:SeriesStat):number {
        let value = 0;
        if (seriesStat && seriesStat.average) {
            value = this.round(seriesStat.average);
        }

        return value;
    }

    private round(value: number) {
        return Math.round(100 * value) / 100;
    }

}

export class TestMetric {

    private warnings: ISystemWarning[];
    private testMetrics: any;

    constructor(metric: any) {
        this.testMetrics = {};
        this.warnings = [];

        for (let name in metric) {
            let ops = metric[name],
                value = 0,
                aggregationType = 'sum';

            for (let op of ops) {
                if (op.agg) {
                    aggregationType = op.agg;
                }
                if (typeof op.op !== 'string') {
                    this.addWarning(util.format('Invalid operation in rtcSetMetric [%s]', op.op));
                    continue;
                }

                let operation = op.op.trim().toLowerCase(),
                    opValue = Number(op.val);

                if (operation === 'add' || operation === '+') {
                    value += opValue;
                } else if (operation === 'sub' || operation === '-') {
                    value -= opValue;
                } else if (operation === 'set') {
                    value = opValue;
                } else {
                    this.addWarning(util.format('Invalid operation in rtcSetMetric [%s]', operation));
                }
            }

            this.testMetrics[name] = {
                value: value,
                agg: aggregationType.toLowerCase() === 'avg' ? 'avg' : 'sum'
            };
        }
    }

    private addWarning(msg: string) {
        let warning: ISystemWarning = {
            channel: 'Metric',
            topic: 'Metric',
            message: msg,
            alertType: 'err'
        };

        this.warnings.push(warning);
    }

    getWarnings(): ISystemWarning[] {
        return this.warnings;
    }

    getMetrics(): any {
        return this.testMetrics;
    }

}

export function checkDeprecatedCode(script: string) {
    const customErrorMessages = {
        'end': 'end() is always called internally and should be removed from test script'
    };

    const deprecatedMethods = [
        'takeScreenshot',
        'setRoomInfo',
        'waitForRoomInfo',
        'rtcSetSessionInfo',
        'rtcSetTestInfo',
        'rtcWaitForTestInfo',
        'end'
    ];

    const deprecatedTokens = [
        //'info',
        'NAME',
        'SERVICE_URL',
        'TEST_IDX',
        'SESSION_ID',
        'SESSION_MEMBER'
    ];

    if (script) {
        let tokenRegex = /\w+/g,
            tokenMatches = script.match(tokenRegex),
            methodRegex = /\.\s*([$A-Z_][0-9A-Z_$]*)\s*\(/ig; // will find method calls (prefixed by a dot and suffixed by open bracket)

        let validationErrors = [],
            customValidationErrors = [];

        for (let token of tokenMatches) {
            if (deprecatedTokens.indexOf(token) !== -1 && validationErrors.indexOf(token) === -1) {
                validationErrors.push(token);
            }
        }

        let methodMatch;
        while ((methodMatch = methodRegex.exec(script)) !== null) {
            let method = methodMatch[1];
            if (deprecatedMethods.indexOf(method) !== -1 && validationErrors.indexOf(method) === -1) {
                if (method in customErrorMessages) {
                    customValidationErrors.push(customErrorMessages[method]);
                } else {
                    validationErrors.push(method);
                }
            }
        }

        if (validationErrors.length) {
            throw new errors.ValidationError('deprecated-api', 'Deprecated API: ' + validationErrors.join(', '));
        }

        if (customValidationErrors.length) {
            throw new errors.ValidationError('deprecated-api', 'Deprecated API: ' + customValidationErrors.join('; '));
        }
    }
}
