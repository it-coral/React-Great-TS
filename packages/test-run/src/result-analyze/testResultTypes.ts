'use strict';

/// <reference path='../../../typings/tsd.d.ts' />
/// <reference path="../../utils/utils.d.ts" />

export class StatInfo {
    channels: ChannelsStat;
    channelReadyTime: Date;
    setupStartTime: Date;
    voiceStartTime: Date;
    voiceDuration: number;
    rank: number;
    maxChannelCount?: {
      audio: { in: number, out: number },
      video: { in: number, out: number }
    };
}

export class ChannelInfo {
    name: string;
    channelDisplayName: string;
    root: any;
    direction: string;
    isVideo: boolean;
    isData: boolean;
    startTime: Date;
    endTime: Date;
    totalBytes: number;
    time: number[];

    constructor(name: string, direction: string, root: any) {
        this.name = name;
        this.direction = direction;
        this.root = root;
    }
}

export interface ChannelsInfo {
    [index: string]: ChannelInfo;
}

export interface ChartData {
    bits: number[];
    packets: number[];
    loss: number[];
    jitter: number[];
    videoFrameRate?: number[];
    videoDelay?: number[];
    videoCpuLimitedResolution?: number[];
    videoBandwidthLimitedResolution?: number[];
}

export interface ChannelsChartData {
    [index: string]: ChartData;
}

export interface ChannelStat {
    channelDisplayName: string;
    direction: string;
    media: string;
    totalBytes: number;
    name: string;

    startTime: Date;
    totalPackets: number;
    packets: SeriesStat;
    bytes: SeriesStat;
    packetLoss: number;
    audioCoddec: string;
    jitter: SeriesStat;
    rtt: SeriesStat;
    samples: number;
    avgPacketSize?: number;

    videoFrameRate?: number;
    videoResolution?: string;
    videoResolutionChanges?: any;
}

export interface SeriesStat {
    total: number;
    average: number;
    variance: number;
    count: number;
    rampUpTime: number;
}

export interface ChannelsStat {
    [index: string]: ChannelStat;
}
