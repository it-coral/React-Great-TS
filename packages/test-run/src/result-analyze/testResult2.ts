'use strict';

/// <reference path='../../../typings/tsd.d.ts' />
/// <reference path="../../utils/utils.d.ts" />

/// <reference path="./testResultTypes.ts" />

import _ = require('lodash');
var dumpObject = require('../../utils/utils').dumpObject;
import TestResultTypes = require('./testResultTypes');
const logger = require('../../config/topic.global.Logging')('test-result', false);

import { inflate } from 'zlib';

import ChannelInfo = TestResultTypes.ChannelInfo;
import ChannelsChartData = TestResultTypes.ChannelsChartData;
import ChartData = TestResultTypes.ChartData;
import ChannelsInfo = TestResultTypes.ChannelsInfo;
import ChannelStat = TestResultTypes.ChannelStat;
import StatInfo = TestResultTypes.StatInfo;
import SeriesStat = TestResultTypes.SeriesStat;

var dbg = false;

class DataAnalyze {
    static cleanSeriesData(series: number[]): number[] {
        return _.map(series, function(value: number) {
            return value && value >= 0 ? value : 0;
        });
    }

    /*
    //Converted accumulated data series (packetsLost) to normal per item value
    static unAccumulate(series: number[]): number[] {
        let prevValue = 0;
        return _.map(series, function(value: number) {
            let newValue = value - prevValue;
            prevValue = value;
            return newValue;
        });
    }
    */

    static seriesData(series: any): number[] {
        if (series) {
            return JSON.parse(series.values);
        } else {
            return [];
        }
    }

    static seriesData0(series: any): string {
        if (series) {
            return JSON.parse(series.values)[0];
        } else {
            return null;
        }
    }

    static extractCodecName(series: string[]): string {
        let stats = {},
            results = [];

        series.filter((el) => !!el).forEach((el) => {
            if (!(el in stats)) {
                stats[el] = 0;
            }
            stats[el]++;
        });

        let maxSamples = 0,
            maxSamplesCodec = '';

        for (let codec in stats) {
            if (stats[codec] >= 5) {
                results.push(codec);
            }
            if (stats[codec] > maxSamples) {
                maxSamples = stats[codec];
                maxSamplesCodec = codec;
            }
        }

        if (!results.length) {
            // No codec has been present more than 5 seconds, use the longer one
            results.push(maxSamplesCodec);
        }

        return results.join(', ');
    }

    static emptyChannel(series: any): boolean {
        let data = DataAnalyze.seriesData(series);
        let totalValue: number = _.reduce(data, (total: number, value: number) => total + value);
        return totalValue === 0;
    }

    static getChannelData(item: any, sendChannel: string, isSend: boolean, isVideo: boolean): ChartData {
        let isSSRC: boolean = sendChannel.indexOf('ssrc_') === 0;
        let bitsSentName = isSend ? 'bitsSentPerSecond' : 'bitsReceivedPerSecond';
        let packetsSent = !isSSRC || isSend ? 'packetsSentPerSecond' : 'packetsReceivedPerSecond';

        let data: ChartData;

        if (!sendChannel || !item.stats[sendChannel + bitsSentName] || !item.stats[sendChannel + bitsSentName].values) {
            //console.log('unknown channel', sendChannel, bitsSentName);

            data = {
                bits: [],
                packets: [],
                loss: [],
                jitter: []
            };
        } else {
            data = {
                bits: DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[sendChannel + bitsSentName])),
                packets: DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[sendChannel + packetsSent])),
                //loss: DataAnalyze.unAccumulate(DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[sendChannel + 'packetsLost']))),
                loss: DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[sendChannel + 'packetsLost'])),
                jitter: DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[sendChannel + 'googJitterBufferMs']))
            };

            if (isVideo) {
                data.videoFrameRate = DataAnalyze.cleanSeriesData(
                    DataAnalyze.seriesData(item.stats[sendChannel + (isSend ? 'googFrameRateSent' : 'googFrameRateReceived')]));
                data.videoDelay = DataAnalyze.cleanSeriesData(
                    DataAnalyze.seriesData(item.stats[sendChannel + 'googRtt']));
                data.videoCpuLimitedResolution = DataAnalyze.cleanSeriesData(
                    DataAnalyze.seriesData(item.stats[sendChannel + 'googCpuLimitedResolution']));
                data.videoBandwidthLimitedResolution = DataAnalyze.cleanSeriesData(
                    DataAnalyze.seriesData(item.stats[sendChannel + 'googBandwidthLimitedResolution']));
            }
        }

        return data;
    }

    static seriesStat(series: number[], fn: any, calcRampUpTime?: boolean): SeriesStat {
        let count = 0;
        let total = 0;

        //https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Online_algorithm
        let mean = 0;
        let M2 = 0;

        for (let i = 0; i < series.length; i++) {
            if (isNaN(series[i])) {
                // Do nothing for null and undefined values
                continue;
            }
            let value = fn(series[i]);
            total += value;

            if (i >= 5) { // Remove 1st 5 samples from the average
                count += 1;
                let delta = value - mean;
                mean = mean + delta / count;
                M2 = M2 + delta * (value - mean);
            }
        }

        let rampUpTime: number = null;
        if (calcRampUpTime) {
            let rampUpValue = mean / 2;

            for (let i = 0; i < series.length; i++) {
                if (isNaN(series[i])) {
                  // Do nothing for null and undefined values
                  continue;
                }
                let value = fn(series[i]);
                if (value > rampUpValue) {
                    rampUpTime = i;
                    break;
                }
            }
        }

        return {
            total: Math.round(total),
            average: mean,
            variance: count < 2 ? null : M2 / (count - 1),
            count: count,
            rampUpTime: rampUpTime
        };
    }

    static calcBitRate(item: any,
                startTime: Date,
                chartData: ChartData,
                channelId: string, // full name include prefix
                channelName: string, // just the ssr name
                bitsSentName: string, totalByteName: string, totalPacketName: string): ChannelStat {

        let bits = chartData.bits;
        let packets = chartData.packets;
        let loss = chartData.loss;
        let jitter = chartData.jitter;

        if (channelName) {
            let byteSent = DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[channelName + totalByteName]));
            let totalBytes = byteSent[byteSent.length - 1];

            let packetSent = DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[channelName + totalPacketName]));
            let totalPackets = packetSent[packetSent.length - 1];

            let codecName = '',
                codecStats = item.stats[channelName + 'googCodecName'];

            if (codecStats) {
                let codecValues = JSON.parse(codecStats.values);
                codecName = DataAnalyze.extractCodecName(codecValues);
            }

            let rttStat: SeriesStat;
            if (item.stats[channelName + 'googRtt']) {
                let rtt = DataAnalyze.cleanSeriesData(DataAnalyze.seriesData(item.stats[channelName + 'googRtt']));
                rttStat = DataAnalyze.seriesStat(rtt, function(val: number) {
                    return val;
                });
            }
            let length = bits.length;

            let totalLoss = loss[length - 1]; // Already accumulated

            return {
                channelDisplayName: 'tbd',
                direction: 'tbd',
                media: 'tbd',
                name: channelId + bitsSentName,
                startTime: startTime,
                totalBytes: totalBytes,
                totalPackets: totalPackets,
                //endTime: endTime,
                packets: DataAnalyze.seriesStat(packets, function(val: number) {
                    return val;
                }),
                bytes: DataAnalyze.seriesStat(bits, function(val: number) {
                    return val / 1000;
                }, true),
                packetLoss: totalLoss,
                audioCoddec: codecName,
                jitter: DataAnalyze.seriesStat(jitter, function(val: number) {
                    return val;
                }),
                rtt: rttStat,
                samples: length
            };
        } else {
            let emptySeriesStat: SeriesStat = {
                total: 0,
                average: 0,
                variance: 0,
                count: 0,
                rampUpTime: 0
            };

            return {
                channelDisplayName: 'tbd',
                direction: 'tbd',
                media: 'tbd',
                name: 'missing',
                startTime: startTime,
                totalBytes: 0,
                totalPackets: 0,
                packets: emptySeriesStat,
                bytes: emptySeriesStat,
                packetLoss: 0,
                audioCoddec: 'none',
                jitter: emptySeriesStat,
                rtt: emptySeriesStat,
                samples: 0
            };
        }
    }

    getChartData(channels: any): ChannelsChartData {
        let chartData: ChannelsChartData = {};
        _.each(channels, (channel: ChannelInfo, channelId: string) => {
            let item = channel.root;
            let isSend = channel.direction === 'send';
            let isVideo = item.stats[channel.name + (isSend ? 'googFrameRateSent' : 'googFrameRateReceived')];
            let isData = (channel.name.indexOf('ssrc_') !== 0 && channel.name.split('-').indexOf('data') !== -1);

            channel.isVideo = isVideo;
            channel.isData = isData;
            chartData[channelId] = DataAnalyze.getChannelData(item, channel.name, isSend, isVideo);
        });

        // Try to filter empty duplicate channels
        // dumpObject(chartData, 'chartData');
        // console.log(chartData);

        return chartData;
    }

    calcStatistic(chartData: ChannelsChartData, channels: ChannelsInfo, setupStartTime: number, testIteration:any) {
        //console.log('calcStatistic');

        let startTime: Date = null;
        let endTime: Date = null;
        _.each(channels, function(channel: ChannelInfo, channelId: string) {
            let item = channel.root;
            let isSend = channel.direction === 'send';

            //console.log(name + (isSend ? 'bitsSentPerSecond' : 'bitsReceivedPerSecond'));

            let items = item.stats[channel.name + (isSend ? 'bitsSentPerSecond' : 'bitsReceivedPerSecond')];
            channel.startTime = new Date(items.startTime);

            // chrome report end time 32 seconds while it has data for 20 sec
            // 947cab4ddad11676ae2a98f6214ad0c6c432051f06bc84d708ae2f17e1dd0e77.txt
            // So we ignore the end time and count how much data we have
            // channel.endTime = new Date(items.endTime);
            channel.endTime = new Date(items.startTime);
            channel.endTime.setSeconds(channel.endTime.getSeconds() + chartData[channelId].packets.length);

            if (!startTime || (channel.startTime && channel.startTime < startTime)) {
                startTime = new Date(channel.startTime.getTime());
            }

            if (!endTime || (channel.endTime && channel.endTime > endTime)) {
                endTime = new Date(channel.endTime.getTime());
                // console.log(endTime, name);
            }
        });

        let testDuration = endTime.getTime() - startTime.getTime();
        // console.log(testDuration);
        // console.log(endTime);

        let stat: StatInfo = {
            channelReadyTime: new Date(0),
            channels: {},
            rank: 85,
            setupStartTime: new Date(setupStartTime),
            voiceDuration: testDuration,
            voiceStartTime: startTime
        };

        _.each(channels, (channel: ChannelInfo, channelId: string) => {
            //console.log(name);
            let isSSRC: boolean = channelId.indexOf('ssrc_') === 0;
            let channelDisplayName: string;
            if (isSSRC) {
                channelDisplayName = channelId.substring(5, channelId.length - 6);
            } else {
                let parts = channelId.split('-');
                channelDisplayName = channelId;
                if (parts && parts.length >= 3) {
                    channelDisplayName = parts.slice(0, 3).join('-');
                }

                // For splitted data channels add in/out suffix
                if (parts.indexOf('in') !== -1) {
                    channelDisplayName += '-in';
                } else if (parts.indexOf('out') !== -1) {
                    channelDisplayName += '-out';
                }
            }

            let item = channel.root;
            let isSend = channel.direction === 'send';

            let channelStat: ChannelStat;
            channelStat = DataAnalyze.calcBitRate(
                item,
                channel.startTime || startTime,
                chartData[channelId],
                channelId,
                channel.name,
                isSend ? 'bitsSentPerSecond' : 'bitsReceivedPerSecond',
                (!isSSRC && !(channel.name + 'bytesReceived' in item.stats)) || isSend ? 'bytesSent' : 'bytesReceived',
                (!isSSRC && !(channel.name + 'packetsReceived' in item.stats)) || isSend ? 'packetsSent' : 'packetsReceived');

            // stat.channels[channelName].name = channelName;
            channelStat.channelDisplayName = channelDisplayName;
            channelStat.direction = channel.direction;

            if (channel.isData) {
                channelStat.media = 'data';
                // Calculate an average packet size for data channel
                if (channelStat.totalBytes && channelStat.totalPackets) {
                    channelStat.avgPacketSize = channelStat.totalBytes / channelStat.totalPackets;
                }
            } else {
                channelStat.media = channel.isVideo ? 'video' : 'audio';
            }

            stat.channels[channelId] = channelStat;

            if (dbg) {
                console.log('Stat:', channel.name, testDuration, stat.channels[channelId].totalBytes);
            }
        });

        //Calc ramp up time
        let channelReadyTime = setupStartTime;

        //Consider only channels which has data that is 30% of the avg channel data
        let total = 0;
        let count = 0;
        _.each(stat.channels, (channel: any) => {
            if (channel.media === 'audio') {
                total += channel.bytes.total;
                count++;
            }
        });

        let avg = total / count;

        _.each(stat.channels, (channel: any) => {
            if (channel.bytes.rampUpTime) {
                let channelReady = channel.startTime.getTime() + channel.bytes.rampUpTime * 1000;
                if (channelReadyTime < channelReady && channel.media === 'audio' && channel.bytes.total > avg * 0.3) {
                    channelReadyTime = channelReady;
                    // console.log('Update channelReadyTime', new Date(channelReadyTime),
                    // new Date(channel.startTime), channel.bytes.rampUpTime);
                }
            }
        });
        stat.channelReadyTime = new Date(channelReadyTime);

        return stat;
    }

    getSetupStartTime(data: any): number {
        //dumpPropertiesArray('PeerConnections', data.PeerConnections);
        let setupStartTime: number = 0;
        _.each(data, (item: any, peerindex: any) => {
            if (item && item.stats) {
                _.each(item.stats, (gitem: any, index: string) => {
                    //Locate for the earliest date recorded
                    //Cand channel date is unreliable and way too early
                    if (gitem.startTime && index.indexOf('Cand') !== 0) {
                        let date = new Date(gitem.startTime);
                        if (date.getTime() && date.getFullYear() > 2010) {
                            if (!setupStartTime || date.getTime() < setupStartTime) {
                                setupStartTime = date.getTime();
                            }
                        }
                    }
                });
            }
        });

        return setupStartTime;
    }

    getChannels(data: any, testIteration: any) {
        let channels: ChannelsInfo = {};
        let connections = {};
        _.each(data, (item: any, peerindex: any) => {
            function addChannel(peerindex: string, channel: string, direction: string) {
                channels[peerindex + '-' + channel] = new ChannelInfo(channel, direction, item);
                return channel;
            }

            function splitAndAddChannel(channel: string) {
                // Split one bidirectional channel into two (this is useful for data channels)
                let names = {
                    recv: `${channel}in-recv-`,
                    send: `${channel}out-send-`
                };

                _.each(item.stats, (gitem: any, index: string) => {
                    if (index.indexOf(channel) === 0) {
                        if (index.indexOf('packetsSent') === -1) {
                            // Do not copy packetsSent to recv channel
                            item.stats[names.recv + index.substr(channel.length)] = _.cloneDeep(item.stats[index]);
                        }
                        if (index.indexOf('packetsReceived') === -1) {
                            // Do not copy packetsReceived to send channel
                            item.stats[names.send + index.substr(channel.length)] = _.cloneDeep(item.stats[index]);
                        }
                    }
                });
                channels[peerindex + '-' + names.recv] = new ChannelInfo(names.recv, 'recv', item);
                channels[peerindex + '-' + names.send] = new ChannelInfo(names.send, 'send', item);
            }

            function getConnInfo(stats: any, channelName: string, testIteration: any): any {
                // find transportId prop
                let transportId, _response, _transport: string;
                for (let prop in stats) {
                    if (~prop.indexOf('transportId')) {
                        transportId = getValue(stats[prop]);
                    }
                }

                // get candidate pair
                let candidatePairId = getValue(stats[`${transportId}-selectedCandidatePairId`]);
                if (candidatePairId) {
                    // validate is it active connection
                    let isItActiveConnection = getValue(stats[`${candidatePairId}-googActiveConnection`]);

                    // collect local and remote addresses
                    let localAddress = getValue(stats[`${candidatePairId}-googLocalAddress`]);
                    let remoteAddress = getValue(stats[`${candidatePairId}-googRemoteAddress`]);

                    let typeOfTransport, _typeOfTransport = getValue(stats[`${candidatePairId}-googRemoteCandidateType`]);
                    if (_typeOfTransport === 'relay') {
                        let remoteCandidateId = getValue(stats[`${candidatePairId}-remoteCandidateId`]);
                        let priority: string | number | boolean = getValue(stats[`${remoteCandidateId}-priority`]);
                        let relayType: number = +priority >> 24;

                        switch(relayType) {
                            case 0:
                                // find browser, suppose browser is Chrome
                                let _browser: string = testIteration.browser;
                                if (_browser.toLowerCase() === 'chrome') {
                                    _transport = 'TURN/TLS';
                                } else if (_browser.toLowerCase() === 'firefox') {
                                    _transport = 'TURN/TCP';
                                } else {
                                    _transport = 'TURN';
                                }
                            break;

                            case 1:
                                _transport = 'TURN/TCP';
                            break;

                            case 2:
                                _transport = 'TURN/UDP';
                            break;

                            case 5:
                                _transport = 'TURN/UDP';
                            break;

                            default:
                                _transport = 'UNKNOWN';
                            break;
                        }
                    } else if (['host', 'srflx', 'prflx'].indexOf(_typeOfTransport.toString())) {
                        _transport = 'P2P';
                    }

                    _response = { localAddress, remoteAddress, transport: _transport };
                } else {
                    _response = false;
                }


                return _response;
            }

            function getValue(pseudoArray: any, idx: number = 0): string | number | boolean {
                if (pseudoArray && pseudoArray.values) {
                    let jsonValue = JSON.parse(pseudoArray.values);
                    return jsonValue[idx];
                }

                return false;
            }

            if (item && item.stats) {
                let foundSSRCChannels: any = [];

                _.each(item.stats, (gitem: any, index: string) => {
                    function getAndAddChannel(direction: string): void {
                        if (direction) {
                            let channel = index.substring(0, index.indexOf('packets'));
                            addChannel(peerindex, channel, direction);
                            if (dbg) {
                                console.log('+' + direction, index, channel, ' - ', peerindex);
                            }

                            if (item.stats[channel + 'transportId']) {
                                let channelId = DataAnalyze.seriesData0(item.stats[channel + 'transportId']);
                                foundSSRCChannels.push(channelId);
                                connections[`${channel}`] = getConnInfo(item.stats, channel, testIteration);
                            }
                        }
                    }

                    if (index.indexOf('ssrc_') === 0) {
                        if (index.indexOf('packetsReceivedPerSecond') >= 0) {
                            getAndAddChannel('recv');
                        } else if (index.indexOf('packetsSentPerSecond') >= 0) {
                            getAndAddChannel('send');
                        }
                    }
                });

                _.each(item.stats, (gitem: any, index: string) => {
                    //console.log(index);

                    if (index.indexOf('-googChannelId') > 0) {
                        let channelId = DataAnalyze.seriesData0(gitem);
                        //console.log(channelId);

                        if (foundSSRCChannels.indexOf(channelId) < 0) {
                            let channelName = index.substring(0, index.lastIndexOf('-'));

                            if (!DataAnalyze.emptyChannel(item.stats[channelName + '-packetsSent'])) {
                                // Not an empty channel

                                let bytesSentKey = channelName + '-bytesSent',
                                    bytesReceivedKey = channelName + '-bytesReceived',
                                    isSent = false,
                                    isRecv = false;

                                if (bytesSentKey in item.stats && !DataAnalyze.emptyChannel(item.stats[bytesSentKey])) {
                                    // Outgoing stats present
                                    isSent = true;
                                }

                                if (bytesReceivedKey in item.stats && !DataAnalyze.emptyChannel(item.stats[bytesReceivedKey])) {
                                    // Incoming stats present
                                    isRecv = true;
                                }

                                if (isSent && isRecv) {
                                    // Bidirectional channel
                                    splitAndAddChannel(`${channelName}-`);
                                } else if (isSent) {
                                    addChannel(peerindex, `${channelName}-`, 'send');
                                } else {
                                    addChannel(peerindex, `${channelName}-`, 'recv');
                                }
                            }
                        }
                    }
                });
            }
        });

        return { channels, connections };
    }

    analyzeData(testIteration: any, data: any) {
        if (data.PeerConnections) {
            data = data.PeerConnections;
        }

        if (data) {
            let setupStartTime = this.getSetupStartTime(data);
            let channelsData: any = this.getChannels(data, testIteration);
            let channels: ChannelsInfo = channelsData.channels;
            let connections: any = channelsData.connections;
            //dumpObject(channels,'channels');

            if (Object.keys(channels).length > 0) {
                let chartData: ChannelsChartData = this.getChartData(channels);

                //dumpObject(chartData, 'testIteration.chartData');

                let stat = this.calcStatistic(chartData, channels, setupStartTime, testIteration);
                testIteration.chartData = chartData;
                testIteration.stat = stat;

                // put here code for each channel (connection channel TCP etc)
                let sample = Object.keys(channels)[0], prefix = sample.substring(0, sample.indexOf("ssrc"));
                for (let cnlName in connections) {
                    let key = `${prefix}${cnlName}`;
                    if (key in testIteration.stat.channels) {
                        testIteration.stat.channels[key].connection = connections[cnlName];
                    }
                }
                //dumpObject(stat, 'testIteration.stat');
            }
        } else {
            logger.error('Failed to find results in object');
        }

        testIteration.stat = testIteration.stat || {};
    }
}

interface SideDescription {
    type: string;
    sdp: string;
}

interface SideInfoTime {
    channels: string[];
    timestamp: number;
}

interface SideInfo {
    localDescription: SideDescription;
    remoteDescription: SideDescription;
    time: SideInfoTime[];
    channelId: number;
    sampleCount: number;
    stat: StatObject;
    client: string;
}

interface StatObject {
    [index: string]: any;
}

interface SideInfoArray {
    [index: string]: SideInfo;
}

enum GetStatFormat {
    Webkit,
    Firefox,
    Unknown
}

class GetStatAnalyze extends DataAnalyze {

    static WEBKIT_CHANNEL_PATTERN: RegExp = /^(ssrc_\w+_(recv|send))|(Conn-(data|audio|video)-\w+.*)$/i;
    static FIREFOX_CHANNEL_PATTERN: RegExp = /^(in|out)bound_rtp/;

    format: GetStatFormat = GetStatFormat.Unknown;

    detectFormat(rawdata: any): GetStatFormat {
        for (let idx in rawdata) {
            // First try to use client property of the channel
            if (typeof rawdata[idx] !== 'object' || !rawdata[idx].hasOwnProperty('client')) {
                return GetStatFormat.Unknown;
            } else if (rawdata[idx].client === 'webkit') {
                return GetStatFormat.Webkit;
            } else if (rawdata[idx].client === 'firefox') {
                return GetStatFormat.Firefox;
            }

            // Examine GetStats() raw data
            //  to determine a format

            if (!rawdata[idx].stat) {
                continue;
            }

            if (!rawdata[idx].stat)

            for (let key in rawdata[idx].stat) {
                // Return early, no need to traverse all the object

                if (GetStatAnalyze.WEBKIT_CHANNEL_PATTERN.test(key)) {
                    return GetStatFormat.Webkit;
                }
                if (GetStatAnalyze.FIREFOX_CHANNEL_PATTERN.test(key)) {
                    return GetStatFormat.Firefox;
                }
            }
        }

        return GetStatFormat.Unknown;
    }

    static seriesData(series: any): number[] {
        if (Array.isArray(series) && series.length) {
            return series.map((el) => +el);
        } else {
            return [];
        }
    }

    static seriesData0(series: any): string {
        if (Array.isArray(series) && series.length) {
            return series[0];
        } else if (typeof series === 'string') {
            return series;
        } else {
            return '';
        }
    }

    static emptyChannel(series: any): boolean {
        let data = GetStatAnalyze.seriesData(series);
        let totalValue: number = _.reduce(data, (total: number, value: number) => total + value);
        return totalValue === 0;
    }

    consolidateData(data: any): SideInfoArray {
        function customMerge(dest: any, src: any, count: number) {
            _.each(src, (value: any, name: string) => {
                if (_.isObject(dest) && !(name in dest)) {
                    // New property has come from source
                    // Let's create an array for it in destination

                    if (typeof value === 'object') {
                        dest[name] = {};
                    } else {
                        dest[name] = new Array(count - 1);
                    }
                }

                if (Array.isArray(dest[name])) {
                    dest[name].push(value);
                } else if (_.isObject(dest[name])) {
                    customMerge(dest[name], src[name], count);
                } else if (src[name] !== dest[name]) {
                    let oldValue = dest[name];
                    dest[name] = [];
                    for (let i = 0; i < count - 1; i++) {
                        dest[name].push(oldValue);
                    }
                    dest[name].push(value);
                } else {
                    // Do nothing
                }

            });
        }

        let channels: any = {};
        _.each(data, (item: any, idx: number) => {
            let channelId = item.channelId;

            if (!channels[channelId]) {
                channels[channelId] = item;
                item.sampleCount = 1;
            } else {
                channels[channelId].sampleCount++;
                customMerge(channels[channelId], item, channels[channelId].sampleCount);
            }
        });
        return channels;
    }

    getSetupStartTime(data: SideInfoArray): number {
        let startTime: number = Date.now();

        _.each(data, (sideInfo: SideInfo, idx: string) => {
           if (sideInfo && sideInfo.time && sideInfo.time[0] && sideInfo.time[0].timestamp) {
             startTime = Math.min(sideInfo.time[0].timestamp, startTime);
           }
        });

        return startTime;
    }

    getChannels(data: SideInfoArray) {
        let channels: ChannelsInfo = {};

        _.each(data, (sideInfo: SideInfo, peerIndex:string) => {
            function addChannel(name, direction, statItem) {
                channels[peerIndex + '-' + name] = new ChannelInfo(name, direction, statItem);
                channels[peerIndex + '-' + name].time = _getChannelTime(sideInfo, name);
            }

            function splitAndAddChannel(channel: string, statItem: any) {
                // Split one bidirectional channel into two (this is useful for data channels)
                let names = {
                    recv: `${channel}-in`,
                    send: `${channel}-out`
                };

                let statItems = {
                    recv: {},
                    send: {}
                };

                _.each(statItem, (gitem: any, index: string) => {
                    if (index.indexOf('packetsSent') === -1) {
                        // Do not copy packetsSent to recv channel
                        statItems.recv[index] = _.cloneDeep(gitem);
                    }
                    if (index.indexOf('packetsReceived') === -1) {
                        // Do not copy packetsReceived to send channel
                        statItems.send[index] = _.cloneDeep(gitem);
                    }
                });
                addChannel(names.recv, 'recv', statItems.recv);
                addChannel(names.send, 'send', statItems.send);
            }

            if (!sideInfo.stat) {
                return;
            }

            if (this.format === GetStatFormat.Webkit) {
                let foundSSRCChannels: string[] = [];

                _.each(sideInfo.stat, (statItem: any, key: string) => {
                    // Iterate over each stat item
                    //  and detect channels

                    if (GetStatAnalyze.WEBKIT_CHANNEL_PATTERN.test(key) && key.indexOf('ssrc_') === 0) {
                        // Webkit channel names have the following format:
                        // ssrc_2436043240_send, ssrc_2436043240_recv, etc...

                        // Skip channels that do not contain any useful data
                        if (!statItem['bytesReceived'] && !statItem['bytesSent']) {
                            return;
                        }

                        let direction = key.substring(key.length - 4, key.length);
                        addChannel(key, direction, statItem);

                        if (statItem['transportId']) {
                            let channelId = GetStatAnalyze.seriesData0(statItem['transportId']);
                            foundSSRCChannels.push(channelId);
                        }
                    }
                });

                _.each(sideInfo.stat, (statItem: any, key: string) => {
                    // Iterate once again to detect non-ssrc channels

                    if (GetStatAnalyze.WEBKIT_CHANNEL_PATTERN.test(key) && key.indexOf('ssrc_') !== 0) {
                        let channelId = statItem['googChannelId'];
                        if (!channelId) {
                            // Skip this channel
                            return;
                        }

                        channelId = GetStatAnalyze.seriesData0(channelId);

                        if (foundSSRCChannels.indexOf(channelId) !== -1) {
                            // Skip this channel
                            return;
                        }

                        if (GetStatAnalyze.emptyChannel(statItem['packetsSent'])) {
                            // Skip empty channel
                            return;
                        }

                        let channelName = key.substring(0, key.lastIndexOf('-')),
                            isSent = false,
                            isRecv = false;

                        if ('bytesSent' in statItem && !GetStatAnalyze.emptyChannel(statItem['bytesSent'])) {
                            // Outgoing stats present
                            isSent = true;
                        }

                        if ('bytesReceived' in statItem && !GetStatAnalyze.emptyChannel(statItem['bytesReceived'])) {
                            // Incoming stats present
                            isRecv = true;
                        }

                        if (isSent && isRecv) {
                            // Bidirectional channel
                            splitAndAddChannel(channelName, statItem);
                        } else if (isSent) {
                            addChannel(channelName, 'send', statItem);
                        } else {
                            addChannel(channelName, 'recv', statItem);
                        }
                    }
                });
            } else if (this.format === GetStatFormat.Firefox) {
                _.each(sideInfo.stat, (statItem: any, key: string) => {
                    // Firefox channel names have the following format:
                    // outbound_rtp_video_1, inbound_rtp_audio_1, etc...

                    let direction = (key.indexOf('outbound') === 0) ? 'send' : 'recv';
                    channels[key] = new ChannelInfo(key, direction, statItem);
                    channels[key].time = _getChannelTime(sideInfo, key);
                });
            }
        });

        // Return array of timestamps for specified "subchannel"
        //  based on information we have in SideInfo.time.channels[]
        function _getChannelTime(sideInfo: SideInfo, channelName: string): number[] {
            return sideInfo.time.filter((item) => item.channels.indexOf(channelName) !== -1).map((item) => item.timestamp);
        }

        return channels;
    }

    static calcBitRate(item: any,
                       startTime: Date,
                       chartData: ChartData,
                       channelName: string, totalByteName: string, totalPacketName: string,
                       testIteration:any): ChannelStat {

      let bits = chartData.bits;
      let packets = chartData.packets;
      let loss = chartData.loss;
      let jitter = chartData.jitter;

      if (channelName) {
        // if codecName is an array - find the first non-empty element
        let codecName = '',
            videoFramerate: any = null,
            videoResolution: any = null,
            videoResolutionChanges = {};

        if (Array.isArray(item['googCodecName'])) {
            codecName = DataAnalyze.extractCodecName(item['googCodecName']);
        } else {
            codecName = item['googCodecName'];
        }

        if (chartData.videoFrameRate) {
          // Calculate average video frame rate
          let count = 0;
          let sum = chartData.videoFrameRate.reduce((prev, val) => {
            if (val === null) {
              return prev;
            }

            count++;
            return prev + val;
          }, 0);

          // TODO: perhaps need to use the same algo as in the DataAnalyze.seriesStat
          videoFramerate = sum / count;
        }

        [['googFrameWidthSent', 'googFrameHeightSent'], ['googFrameWidthReceived', 'googFrameHeightReceived']].forEach((keys) => {
            if (!item[keys[0]]) {
                return;
            }

            videoResolution = keys.map((k) => {
              if (Array.isArray(item[k])) {
                return item[k].find((v: any) => v !== null);
              } else {
                return item[k];
              }
            }).join('x');

            // item[k] present direction [widthSent, heightSent]
            // k it's f.g. googFrameWidthSent
            // videoResolutionChanges is the array of difference and timestamp for them
            let widthKey = keys[0];
            videoResolutionChanges[widthKey] = [[null, null]];

            let len = item[widthKey].length;
            if (typeof item[widthKey] !== 'string') {
                for (let stepCounter = 0; stepCounter < len; stepCounter++) {
                    let res = videoResolutionChanges[widthKey];
                    if (res[res.length - 1] && res[res.length - 1][1] != item[widthKey][stepCounter] && item[widthKey][stepCounter] !== null) {
                        res.push([stepCounter, item[widthKey][stepCounter]]);
                    }
                }
            }

            videoResolutionChanges[widthKey].shift();

        });

        let rttStat: SeriesStat,
            rttKey: string;

        if (item['googRtt']) { rttKey = 'googRtt'; }
        if (item['mozRtt']) { rttKey = 'mozRtt'; }
        if (rttKey) {
          let rtt = DataAnalyze.cleanSeriesData((Array.isArray(item[rttKey]) ? item[rttKey] : []).map((item: number) => +item));
          rttStat = DataAnalyze.seriesStat(rtt, function(val: number) {
            return val;
          });
        }
        let length = bits.length;

        let totalLoss;
        if (loss.length === length) {
            totalLoss = loss[length - 1]; // Already accumulated
        } else {
            // In case loss is empty (audio channels on FF)
            totalLoss = 0;
        }
        //let totalLoss: number = _.reduce(loss, (total: number, value: number) => total + value);

        let emptySeriesStat: SeriesStat = {
          total: 0,
          average: 0,
          variance: 0,
          count: 0,
          rampUpTime: 0
        };

        /*
        // use to debug
        if (testIteration.sessionIdx === 7 && channelName.indexOf('2142310352') >=0) {
            console.log('break');
        }
        */

        let packetsStat = DataAnalyze.seriesStat(packets, (val: number) => +val);
        let bytesStat = DataAnalyze.seriesStat(bits, (val: number) => val / 1000, true);
        let totalPackets = packetsStat.total;
        let totalBytes = bytesStat.total * 1000 / 8;

        return {
          channelDisplayName: 'tbd',
          direction: 'tbd',
          media: 'tbd',
          videoFrameRate: videoFramerate,
          videoResolution: videoResolution,
          videoResolutionChanges: videoResolutionChanges,
          name: channelName,
          startTime: startTime,
          totalBytes: totalBytes,
          totalPackets: totalPackets,
          //endTime: endTime,
          packets: packetsStat,
          bytes: bytesStat,
          packetLoss: totalLoss,
          audioCoddec: codecName,
          jitter: jitter.length ? DataAnalyze.seriesStat(jitter, (val: number) => val) : emptySeriesStat, // Jitter can be empty for audio channels on FF
          rtt: rttStat,
          samples: length
        };
      } else {
        let emptySeriesStat: SeriesStat = {
          total: 0,
          average: 0,
          variance: 0,
          count: 0,
          rampUpTime: 0
        };

        return {
          channelDisplayName: 'tbd',
          direction: 'tbd',
          media: 'tbd',
          name: 'missing',
          startTime: startTime,
          totalBytes: 0,
          totalPackets: 0,
          packets: emptySeriesStat,
          bytes: emptySeriesStat,
          packetLoss: 0,
          audioCoddec: 'none',
          jitter: emptySeriesStat,
          rtt: emptySeriesStat,
          samples: 0
        };
      }
    }

    getChannelData(item: any, sendChannel: string, isSend: boolean, isVideo: boolean): ChartData {
        if (sendChannel.indexOf('899688373') >=0) {
            //need to skip agent 1 and break on agent 3
            console.log('break');
        }
        // We use bytes here since we don't have bitsSentPerSecond available
        let bytesSentKey = isSend ? 'bytesSent' : 'bytesReceived';
        let packetsSentKey = isSend ? 'packetsSent' : 'packetsReceived';
        let packetsLostKey = 'packetsLost';
        let jitterKey = (this.format === GetStatFormat.Webkit ? 'googJitterBufferMs' : 'jitter');
        let framerateKey: string;

        if (this.format === GetStatFormat.Webkit) {
            framerateKey = (isSend ? 'googFrameRateSent' : 'googFrameRateReceived');
        } else {
            framerateKey = 'framerateMean';
        }

        let data: ChartData;

        function parseSeries(item: string) {
            let num = parseFloat(item);
            return !isNaN(num) && num > 0 ? num : 0;
        }

        /**
         * The function below is used as a map function and should always return non-negative value as it's used on arrays where values are increased with each index
         */
        function perSecond(item: number, idx: number, src: any) {
            if (idx === 0) {
                return item;
            } else {
                let diff = item - src[idx-1];
                return diff > 0 ? diff : 0;
            }
        }

        // TODO: take a look at some values - for some reason some of them could be an integer istead of array
        function safeParseSeries(data: any) {
            if (!Array.isArray(data)) {
                data = [];
            }
            return data.map(parseSeries);
        }

        if (!sendChannel || !item[bytesSentKey] || !item[bytesSentKey].length) {
            data = {
                bits: [],
                packets: [],
                loss: [],
                jitter: []
            };
        } else {
            data = {
                bits: safeParseSeries(item[bytesSentKey]).map(perSecond).map((el: number) => el * 8),
                packets: safeParseSeries(item[packetsSentKey]).map(perSecond),
                loss: safeParseSeries(item[packetsLostKey]),
                jitter: safeParseSeries(item[jitterKey])
            };

            if (isVideo) {
                data.videoFrameRate = safeParseSeries(item[framerateKey]);

                data.videoDelay = safeParseSeries(item['googRtt']);
                data.videoCpuLimitedResolution = safeParseSeries(item['googCpuLimitedResolution']);
                data.videoBandwidthLimitedResolution = safeParseSeries(item['googBandwidthLimitedResolution']);
            }
        }

        return data;
    }

    calcStatistic(chartData: ChannelsChartData, channels: ChannelsInfo, setupStartTime: number, testIteration:any) {
        let startTime: Date = null;
        let endTime: Date = null;
        _.each(channels, function(channel: ChannelInfo, name: string) {
            channel.startTime = new Date(_.find(channel.time, (el) => !!el));
            channel.endTime = new Date(channel.time[channel.time.length - 1]);
            //channel.endTime.setSeconds(channel.endTime.getSeconds() + chartData[name].packets.length);

            if (!startTime || (channel.startTime && channel.startTime < startTime)) {
                startTime = new Date(channel.startTime.getTime());
            }

            if (!endTime || (channel.endTime && channel.endTime > endTime)) {
                endTime = new Date(channel.endTime.getTime());
            }
        });

        //let testDuration = endTime.getTime() - startTime.getTime();
        let testDuration = endTime.getTime() - setupStartTime;

        let stat: StatInfo = {
            channelReadyTime: new Date(0),
            channels: {},
            rank: 85,
            setupStartTime: new Date(setupStartTime),
            voiceDuration: testDuration,
            voiceStartTime: startTime
        };

        _.each(channels, (channel: ChannelInfo, name: string) => {
            let channelDisplayName: string;
            if (this.format === GetStatFormat.Webkit) {
                if (name.indexOf('ssrc_') === 0) {
                    // Crop "ssrc_" part for Webkit
                    channelDisplayName = name.substring(5, name.length - 5);
                } else {
                    let parts = name.split('-');
                    channelDisplayName = name;
                    if (parts && parts.length >= 3) {
                        channelDisplayName = parts.slice(0, 3).join('-');
                    }

                    // For splitted data channels add in/out suffix
                    if (parts.indexOf('in') !== -1) {
                        channelDisplayName += '-in';
                    } else if (parts.indexOf('out') !== -1) {
                        channelDisplayName += '-out';
                    }
                }
            } else {
                // For others (Firefox) just use channel's name
                channelDisplayName = name;
            }

            let item = channel.root;
            let isSend = (channel.direction === 'send');

            let channelStat: ChannelStat;
            channelStat = GetStatAnalyze.calcBitRate(
                item,
                channel.startTime || startTime,
                chartData[name],
                name,
                isSend ? 'bytesSent' : 'bytesReceived',
                isSend ? 'packetsSent' : 'packetsReceived',
                testIteration);

            channelStat.channelDisplayName = channelDisplayName;
            channelStat.direction = channel.direction;
            if (channel.isData) {
                channelStat.media = 'data';
            } else {
                channelStat.media = channel.isVideo ? 'video' : 'audio';
            }

            stat.channels[name] = channelStat;

            if (dbg) {
                console.log('Stat:', name, testDuration, stat.channels[name].totalBytes);
            }
        });

        //Calc ramp up time
        let channelReadyTime = setupStartTime;
        _.each(stat.channels, (channel: any) => {
            if (channel.bytes.rampUpTime) {
                let channelReady = channel.startTime.getTime() + channel.bytes.rampUpTime * 1000;
                if (channelReadyTime < channelReady && channel.media === 'audio') {
                    channelReadyTime = channelReady;
                    // console.log('Update channelReadyTime', new Date(channelReadyTime),
                    // new Date(channel.startTime), channel.bytes.rampUpTime);
                }
            }
        });
        stat.channelReadyTime = new Date(channelReadyTime);

        return stat;
    }

    getChartData(channels: any): ChannelsChartData {
        let chartData: ChannelsChartData = {};

        _.each(channels, (channel: ChannelInfo, name: string) => {
            let item = channel.root;
            let isSend = (channel.direction === 'send');
            let isVideoKey: string;
            if (this.format === GetStatFormat.Webkit) {
                isVideoKey = (isSend ? 'googFrameRateSent' : 'googFrameRateReceived');
            } else {
                isVideoKey = 'framerateMean';
            }

            let isData = (channel.name.indexOf('ssrc_') !== 0 && name.split('-').indexOf('data') !== -1);
            channel.isData = isData;

            // Simply check if we have the frame rate key in the object
            channel.isVideo = (isVideoKey in item);

            chartData[name] = this.getChannelData(item, name, isSend, channel.isVideo);
        });

        // Try to filter empty duplicate channels
        // dumpObject(chartData, 'chartData');
        // console.log(chartData);

        return chartData;
    }

    getMaxChannelCount(channelsSeq: any[], knownChannels: any): any {
      let maxCounts = {
        audio: { in: 0, out: 0 },
        video: { in: 0, out: 0 }
      };

      // traverse every second and find max active channels number
      // need to find max audio active connections (send and recv)
      // and max video active connections (send and recv)
      for (let media in maxCounts) {
        for (let dir in maxCounts[media]) {
          // audio (send|recv) & video (send|recv)
          let direction = dir === 'in' ? 'recv' : 'send';
          let max = this.checkForMax(channelsSeq, media, direction, knownChannels);
          if (maxCounts[media][dir] < max) {
            maxCounts[media][dir] = max;
          }
        }
      }

      return maxCounts;
    }

    checkForMax(seq: any[], mediaType: string, direction: string, stats: any): any {
      const ssrc_pattern = /(send|recv)/i;
      const conn_pattern = /audio|video/i; 
      
      let byMedia: string[] = [];
      let byDirection: string[] = [];
      
      // find media
      for (let i = 0; i < seq.length; i++) {
        for (let chl of seq[i].channels) {
          if (!!~chl.indexOf(mediaType) && !!!~byMedia.indexOf(chl)) {
            byMedia.push(chl);
          } else if (ssrc_pattern.test(chl)) {
            if (stats[chl].mediaType === mediaType && !!!~byMedia.indexOf(chl)) {
              byMedia.push(chl);
            }
          }
        }
      }

      // find direction
      for (let chl of byMedia) {
        if (!!~chl.indexOf(mediaType)) {

        } else if (ssrc_pattern.exec(chl)[0] === direction) {
          if (!!!~byDirection.indexOf(chl)) {
            byDirection.push(chl);
          }
        }
      }

      // [media][direction].max_count
      return byDirection.length;
    }

    analyzeData(testIteration: any, data: SideInfoArray) {
        if (data && _.size(data)) {
            // check for duplicates  
            let _data = {};
            for (let obj in data) {
              if (!_.size(_data)) {
                _data[obj] = data[obj];
                continue;
              }

              if (data[obj].stat) {
                let shouldTake = true;
                for (let _obj in data[obj].stat) {
                  for (let idx in _data) {
                    for (let channName in _data[idx].stat) {
                      if (channName.startsWith('ssrc') && channName === _obj) {
                        shouldTake = false;
                      }
                    }
                  }
                }

                if (shouldTake) {
                  _data[obj] = data[obj];
                }
              }

            }

            // swap data and _data so we have unique channels
            data = _data;
            debugger;

            // Detect GetStat format
            this.format = this.detectFormat(data);

            let setupStartTime = this.getSetupStartTime(data);

            let channels: ChannelsInfo = this.getChannels(data);

            //dumpObject(channels, 'GetStat.channels');

            if (_.size(channels) > 0) {
                let maxChannelCount: number = 0;
                let chartData: ChannelsChartData = this.getChartData(channels);
                let stat = this.calcStatistic(chartData, channels, setupStartTime, testIteration);
                if (data['0'] && data['0'].time && data['0'].stat) {
                  stat.maxChannelCount = this.getMaxChannelCount(data[0].time, data[0].stat);
                }
                testIteration.chartData = chartData;
                testIteration.stat = stat;
            }
        } else {
            logger.error('Failed to find results in object');
        }

        testIteration.stat = testIteration.stat || {};
    }
}

export function analyzeData(testIteration: any, data: any) {
    console.log(`starting to analyze data without getstat`);
    let dataAnalyze = new DataAnalyze();
    dataAnalyze.analyzeData(testIteration, data);
    testIteration.stat = testIteration.stat || {};
}

export function analyzeGetStat(testIteration: any, data: any) {
    console.log(`starting to analyze data with getstat`);
    let getStatAnalyze = new GetStatAnalyze();
    getStatAnalyze.analyzeData(testIteration, data);
    testIteration.stat = testIteration.stat || {};
}
