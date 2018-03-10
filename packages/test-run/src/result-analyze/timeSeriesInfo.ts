'use strict';
import * as _ from 'lodash';

const Project = require('../project/project.model');
const TestDefinition = require('../test_definition/test_definition.model');
const _testRun = require('../test_definition/testRun');
const InfluxDB = require('../../config/influxdb');
const project = require('../project/project');
const config = require('../../config/environment');
const promisify = require('es6-promisify');
const probesStatistic = require('./probesStatistic')

const illegalRe = /[\(\){}\[\]\/\?<>\\:\*\|":]/g;
const controlRe = /[\x00-\x1f\x80-\x9f]/g;
const reservedRe = /^\.+$/;
const space = /[\s]/g;
const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const logger = require('../../config/topic.global.Logging')('influxdb', false);

let influxdb = new InfluxDB().getRawClient();

function sanitizeTag(input) {
    let replacement = '-';
    let sanitized;
    if (input) {
        sanitized = input
            .replace(illegalRe, replacement)
            .replace(controlRe, replacement)
            .replace(reservedRe, replacement)
            .replace(space, replacement)
            .replace(windowsReservedRe, replacement);
    } else {
        sanitized = '';
    }
    return sanitized;
}

export async function saveTestRunInflux(testRun, stat:any, idx:number) {
    async function writeTestRun(testRun, stat:any, idx:number, projectId:string, projectName:string, userName:string, company:string, testName:string) {
        function addNum(name:string, val:any) {
            if (isNaN(val) || val === undefined || val === null) {
            } else {
                points[name] = val;
            }
        }

        function addValue(name:string, val:any) {
            if (val) {
                values[name] = sanitizeTag(val);
            }
        }

        let points = {
            idx: idx
        };

        let testDuration = (testRun.lastUpdate - testRun.createDate) / 1000;

        addNum('voiceSetupTime', stat.voiceSetupTime);
        addNum('voiceDuration', stat.voiceDuration);
        addNum('testDuration', testDuration);
        addNum('send_bytes', stat.send.bytes);
        addNum('send_jitter', stat.send.jitter);
        addNum('send_rtt', stat.send.rtt);
        addNum('send_packetLoss', stat.send.packetLoss);
        addNum('send_totalBytes', stat.send.totalBytes);
        addNum('send_totalPackets', stat.send.totalPackets);
        addNum('send_channels', stat.send.channels);
        addNum('send_duration', stat.send.duration);
        addNum('recv_bytes', stat.recv.bytes);
        addNum('recv_jitter', stat.recv.jitter);
        addNum('recv_rtt', stat.recv.rtt);
        addNum('recv_packetLoss', stat.recv.packetLoss);
        addNum('recv_totalBytes', stat.recv.totalBytes);
        addNum('recv_totalPackets', stat.recv.totalPackets);
        addNum('recv_channels', stat.recv.channels);
        addNum('recv_duration', stat.recv.duration);

        addNum('run_delay', testRun.runDelay);
        addNum('status_num',
            testRun.status === 'service-failure' ? 5 :
            testRun.status === 'error' ||
            testRun.status === 'failure' ||
            testRun.status === 'timeout' ? 10 :
                testRun.status === 'warnings' ? 20 :
                    30);

        if (testRun.parameters) {
            addNum('iterations_total', testRun.parameters.loopCount);
            addNum('concurrent_count', testRun.parameters.concurrentUsers);
            addNum('agent_total', testRun.parameters.loopCount * testRun.parameters.concurrentUsers);
            addNum('agent_total_time', testRun.parameters.loopCount * testRun.parameters.concurrentUsers * testDuration);
        }

        let values = {};
        addValue('test_name', testName);
        //addValue('run_name', testRun.runName); // remove run_name, no value to keep this and we hit influxdb limit of 100000 max-values-per-tag limit exceeded
        addValue('runMode', testRun.runMode);
        addValue('monitor_name', testRun.monitorName);
        addValue('monitor_id', testRun.monitorId);
        addValue('project_name', projectName);
        addValue('project_id', projectId);
        addValue('user_name', userName);
        addValue('company', company);
        addValue('status', testRun.status);

        //logger.log('influxdb - write point', testName, testRun.runName, points, values);

        let answer = await influxdb.writePoints([{
            measurement: 'runstat',
            fields: points,
            tags: values,
            timestamp: testRun.createDate.getTime()
        }], {
           precision: 'ms'
        });

        logger.info('InfluxDB.WritePoint: ' + projectId, {points, values, answer});
    }

    if (!stat) {
        let answer = await _testRun.analyzeTestResults(testRun, 0);
        stat = answer.stat;
    }

    let projectId = testRun.project.toString();
    let userName = testRun.userName;
    let project = await Project.findById(testRun.project, 'name company').exec();
    let projectName = 'unknown';
    let company = 'unknown';
    if (project) {
        projectName = project.name;
        company = project.company;
    }

    let testName = 'unknown';
    let testDefinition = await TestDefinition.findById(testRun.testId, 'name').exec();
    if (testDefinition) {
        testName = testDefinition.name;
    }
    if (config.influxdb.enable) {
        let retry = 3;
        while (retry > 0) {
            try {
                await writeTestRun(testRun, stat, idx, projectId, projectName, userName, company, testName);
                logger.info('save to influxdb data', idx, testRun.createDate, projectId, projectName, testRun.monitorName, userName, testName);
                retry = -1;
            } catch (err) {
                retry--;
                logger.error('saveTestRunInflux failed retry:', retry, err.stack);
            }
        }
    } else {
        logger.notice('INFLUX_DB_ENABLE = false, NOT save to influxdb data', idx, testRun.createDate, projectId, projectName, testRun.monitorName, userName, testName);
    }
}

export async function sendMachineAgentAllocation(stat) {
    try {
        let statistic = probesStatistic.getStat(stat.allocation);
        let points = statistic.map((dataCenterStat) => {
            return {
                fields: {
                    amount_of_test_probes: dataCenterStat.amount_of_test_probes || 0,
                    amount_of_monitor_probes: dataCenterStat.amount_of_monitor_probes || 0,
                    total_capacity: dataCenterStat.data_center_capacity || 0,
                    dynamic_probes_capacity: dataCenterStat.dynamic_probes_capacity || 0,
                    static_probes_capacity: dataCenterStat.static_probes_capacity || 0
                },
                tags: {
                    location: sanitizeTag(dataCenterStat.data_center_name)
                }
            }
        });
        logger.notice('AgentAllocState', {statistic, points});
        if (config.influxdb.enable) {
            return await influxdb.writeMeasurement('machine-agent-statistic', points);
        } else {
            //logger.info('INFLUX_DB_ENABLE=false, NOT save to influxdb data');
            return;
        }
    } catch (err) {
        logger.error('AgentAllocState Error-v2', {msg: err.message, stack: err.stack});
    }
}
