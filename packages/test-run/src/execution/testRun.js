'use strict';

var _ = require('lodash');
var testResult = require('./testResult2');
var testRunSchedule2 = require('./testRunSchedule2');
var testRun2 = require('./testRun2');
var Moniker = require('moniker');
var util = require('util');
var nameGenerator = Moniker.generator([Moniker.adjective, Moniker.noun]);
var sendMachineAgentAllocation = require('./timeSeriesInfo').sendMachineAgentAllocation;
var sanitize = require('sanitize-filename');
var moment = require('moment');
var globalLogger = require('../../config/topic.global.Logging')('testrun', false);
const { deepGet, pause } = require('../../utils/tsutils');

var Agent = require('../agent/agent');
var Project = require('../project/project');
var roomInfo = require('../agent/roomInfo');
var TestRun = require('../test_run/test_run.model');
var TestIteration = require('../test_iteration/test_iteration.model');
var TestIterationStat = require('../test_iteration/test_iteration.stat');
var TestFSM = require('./testFSM2');
var testMisc = require('./testMisc');
var config = require('../../config/environment');
var reportCriticalError = require('../../utils/criticalErrors').reportCriticalError;
var topicLog = require('../../config/topicLogging');
var utils = require('../../utils/tsutils');

var calcTestRunCharts = require('./calcTestRunCharts');

var errors = require('../../utils/errors');
var parseOptionsString = require('../../utils/utils').parseOptionsString;
var Q = require('q');
var co = require('co');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var geoip = require('geoip-native');

var executeRunTest = require('../docker/AgentConnect');
var dockerAgentMachine = require('../docker/dockerAgentMachine');
var defaultTestTimeout = 5;

let emailService = require('../adminop/emailService');

var messaging = null;
if (config.role_isWeb) {
  messaging = require('../../config/messaging');
}

var runTestIteration = function(executionInfo, machineFSM, timeout) {
  var log = machineFSM.log;
  var machineId = machineFSM.machineId;
  var runIndex = machineFSM.currentLoop;

  //testRun, machineId, runIndex, options
  var testRun = executionInfo.testRun;
  var options = executionInfo.options;
  var threadsCount = executionInfo.threadsCount || 1;

  //TODO: can remove this and wait for selenium ready from container stdout, need to refactor startContainer code
  var seleniumWait = options.runMode === 'test' ? 10000 : 20000;

  //
  if (threadsCount > 25) {
    seleniumWait = 30000;
  }

  if (options.seleniumWait) {
    seleniumWait = options.seleniumWait;
  }

  var deferred = Q.defer(); // will be resolved after the test is really completed

  var now = new Date();
  var startDate = new Date(now);

  var setup = executionInfo.configDataMain;
  var netSetup = setup['network-profiles'];
  var networkProfile = machineFSM.testProfile.network;
  var networkIdx = _.findIndex(netSetup, {id: networkProfile});
  var blobBaseName = executionInfo.blobFolderName + '/' + machineId + '/itr_' + runIndex + '/';
  var commandExec;
  var networkProfileName;
  if (networkIdx >= 0) {
    commandExec = netSetup[networkIdx].commandExec;
    networkProfileName = netSetup[networkIdx].name;
    log.debug('Selected Network profile', networkProfileName);
  } else {
    log.error('Failed to find Network profile', networkProfile);
  }

  var firewallSetup = setup['firewall-profiles'];
  var firewallProfile = machineFSM.testProfile.firewall;
  var firewallIdx = _.findIndex(firewallSetup, {id: firewallProfile});
  var firewallProfileName;
  commandExec = commandExec || [];
  if (firewallIdx >= 0) {
    commandExec = commandExec.concat(firewallSetup[firewallIdx].commandExec);
    firewallProfileName = firewallSetup[firewallIdx].name;
    log.debug('Selected Firewall profile', firewallProfileName);
  } else {
    log.error('Failed to find Firewall profile', firewallProfile);
  }

  var mediaId = machineFSM.testProfile.media;

  //Simulation
  if (config.testRun.simulated) {
    now = new Date();
    startDate = new Date(now);
  }
  var status = 'started';
  var testIteration = new TestIteration({
    //_id: testRun._id + '' + machineId + '' + runIndex,
    testRunId: testRun._id,
    machine: machineId,
    runName: executionInfo.seedName,
    dockerAgentId: machineFSM.machineGroup.agentSetup.name,
    //dockerId: executionInfo.options.sim ? 'simulated-result-id' : executionInfo.status[machineId].agentInfo.id,
    os: 'unknown',
    browser: 'unknown',
    location: machineFSM.machineGroup.locationName, //testProfile.location,
    networkProfile: networkProfileName,
    firewallProfile: firewallProfileName,
    mediaId: mediaId,
    mediaProfile: executionInfo.testRun2.getMediaProfile(machineFSM.testProfile),
    runIndex: runIndex,
    rank: 85,
    sessionIdx: machineFSM.session.sessionIdx,
    inSessionIdx: machineFSM.inSessionIdx,
    sessionSize: machineFSM.session.machines.length,
    status: 'started',
    statusId: utils.getStatusId(status),
    createDate: now,
    startDate: startDate,
    blobBaseName: blobBaseName,
  });

  executionInfo.testIterations.push(testIteration);
  machineFSM.currentTestIteration = testIteration;
  log.debug('Create memory testIteration', {sftpFileName: testRun.testId + '_' + testRun._id + '_' + testIteration._id + '.zip', testIteration: testIteration._doc});

  function* run(executionInfo, machineFSM) {
    const _agentInitializePause = executionInfo.options['delay'] || 1000;
    yield pause(_agentInitializePause);
    var container = machineFSM.container;
    var runTestExecution = machineFSM.runTestExecution;
    var options = executionInfo.options;

    var mediaObject = executionInfo.testRun2.getMediaObject(machineFSM.testProfile);
    var runEnv = {
      'RTC_ITERATION_NUM': machineFSM.currentLoop
    };

    var audioFileName;
    var videoFileName;
    if (machineFSM.testProfile.media) {
      if (mediaObject) {
        var basePath = '/video/';
        if (mediaObject['audio']) {
          audioFileName = basePath + mediaObject['audio']['convertedFilename'];
        }

        if (executionInfo.testRun2.getBrowserType(machineFSM) === 'chrome') {
          if (mediaObject['video']) {
            videoFileName = basePath + mediaObject['video']['convertedFilename'];
          }
        } else {
          if (mediaObject['webm']) {
            videoFileName = basePath + mediaObject['webm']['convertedFilename'];
          } else {
            videoFileName = audioFileName;
          }
          audioFileName = null;
        }
      } else {
        throw new Error(util.format('Failed to find media files in storage [%s]', machineFSM.testProfile.media));
      }
    }

    var browserEnv = executionInfo.testRun2.getBrowserType(machineFSM);
    var browserSetup = _.find(executionInfo.configDataMain['docker-machines'], function(browserSetup) {
      return browserSetup.id === machineFSM.testProfile.browser;
    });

    var testRunOption = {
      testScript: Agent.preprocessTestScript(testRun.testScript, browserEnv),
      options: options,
      seleniumWait: seleniumWait,
      browserEnv: browserEnv,
      browserSetup: browserSetup,
      useGetStat: executionInfo.testRun2.useGetStat(machineFSM),
      getStatUseAPI: false,
      //resultPath: '/test-results/' + machineId + '/itr_' + runIndex,
      resultPath: '/tmp/itr_' + runIndex,
      runEnv: runEnv,
      //audioPath: options.hasAudio ? '/media/audio.wav' : null,
      //videoPath: options.hasVideo ? '/video/' + executionInfo.videoFileName : null,
      audioPath: audioFileName,
      videoPath: videoFileName,

      iteartionOptions: {runIndex: runIndex},
      commandExec: [],
      retryCount: 0,
      "blobOptions": {
        "container": config.azure.containerName,
        "folder": blobBaseName
      },

      "screenshotLimit": executionInfo.projectSetup.screenshotLimit,
      netSetup: netSetup
    };

    if (options.mediaStorage) {
      if (executionInfo.projectSetup.userConfig && executionInfo.projectSetup.userConfig['sftpOptions']) {
        options.useSFTP = true;
        testRunOption.sftpOptions = _.clone(executionInfo.projectSetup.userConfig['sftpOptions']);
        //testRunOption.sftpOptions.fileName = sanitize(testRun.name) + '_' + testRun._id + '_' + machineId + '_' + runIndex + '.zip';
        testRunOption.sftpOptions.fileName = testRun.testId + '_' + testRun._id + '_' + testIteration._id + '.zip';
      }
    }

    if (options['remote-service']) {
      var availableRemoteServices = executionInfo.projectSetup.userConfig['remote-service'];

      if (!availableRemoteServices || !Object.keys(availableRemoteServices).length) {
        log.notice('#remote-service are not configured for the project', {availableRemoteServices: availableRemoteServices});
        throw new Error('#remote-service are not configured for the project');
      }

      var serviceOption = options['remote-service'],
        serviceName;

      try {
        serviceOption = JSON.parse(serviceOption);
        serviceName = serviceOption.name;
      } catch (e) {
        serviceName = serviceOption;
      }

      // Search for service name in user config
      if (!availableRemoteServices[serviceName]) {
        log.notice('Unknown remote service name', {availableRemoteServices: availableRemoteServices, serviceName: serviceName});
        throw new Error(util.format('Unknown remote service name: %s', serviceName));
      }

      testRunOption.remoteService = {
        name: serviceName,
        selenium_host: availableRemoteServices[serviceName].selenium_host,
        selenium_port: availableRemoteServices[serviceName].selenium_port,
        capabilities: availableRemoteServices[serviceName].capabilities
      };

      if (typeof serviceOption === 'object') {
        for (var key in serviceOption) {
          // Override capabilities from the option
          testRunOption.remoteService.capabilities[key] = serviceOption[key];
        }
      }

      // Collect getstats data using API instead of embedded server (which is not available on remote side)
      testRunOption.getStatUseAPI = true;
    }

    if (browserEnv === 'firefox') {
      testRunOption.videoServer = config.videoServer;
      testRunOption.audioFile = testRunOption.audioPath ? path.basename(testRunOption.audioPath) : null;
      testRunOption.videoFile = testRunOption.videoPath ? path.basename(testRunOption.videoPath) : null;

      delete testRunOption.audioPath;
      delete testRunOption.videoPath;
    }

    //Need to run only on 1st iteration
    // if (runIndex === 1 && !options.disableCommandExec) {
    //   testRunOption.commandExec = testRunOption.commandExec.concat(commandExec);
    // }

    // As we are resetting firewall rules after each run to allow Azure and SSH uploaders work
    //  we have to run rules before each iteration
    if (!options.disableCommandExec) {
      testRunOption.commandExec = testRunOption.commandExec.concat(commandExec);
    }

    testRunOption.allowedCommands = []; // white list of commands

    yield runTestExecution.executeTest(machineFSM, machineId, testRunOption, timeout);
  }

  machineFSM.testRunDeferred = deferred; // will be solved when test complete
  var _run = co.wrap(run);
  _run.call(this, executionInfo, machineFSM)
    .then(function() {
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
};

// find first occurence
const hasTestExpectationErrors = (listOfIterations) => {
  for (let iteration of listOfIterations) {
    const hasErrors = iteration.sysWarnings.findIndex( entry => {
      return entry.alertType === 'err' && entry.topic === 'TestExpectations';
    });

    return hasErrors !== -1;
  }

  return false;
};

function prepareStatusForIteration (options, testIteration) {
  var browserErrorsFlag = options && !!~options.indexOf('ignore-browser-errors'); 
  var browserWarningsFlag = options && !!~options.indexOf('ignore-browser-warnings'); 
  var nightwatchWarningsFlag = options && !!~options.indexOf('ignore-nightwatch-warnings'); 
  var sysWarn = !!testIteration.sysWarnings;
  var originStatus = testIteration.status;

  if ( (browserErrorsFlag || browserWarningsFlag || nightwatchWarningsFlag) && testIteration.sysWarnings ) {
    testIteration.sysWarnings.forEach( function (item) {
      var condition = item.channel === 'Browser' && (
        item.alertType === 'err' || item.level === 'SEVERE' || item.alertType === 'excep' 
      );
      if (condition) {
        item.alertType = 'warn';
        item.level = 'WARNING';
      }

      if (browserWarningsFlag) {
        if (item.alertType === 'warn' && (item.channel === 'BROWSER' || item.channel === 'Browser')) {
          item.alertType = 'info';
          item.level = 'INFO';
        }
      }

      if (nightwatchWarningsFlag) {
        if (item.alertType === 'warn' && item.channel === 'Nightwatch') {
          item.alertType = 'info';
          item.level = 'INFO';
        }
      }
    });
  }

  // set statuses
  var SystemErrors = sysWarn && !!testIteration.sysWarnings.filter( function(item) {
    return (item.channel === 'TestExpectations' && item.alertType === 'err') ||
            (item.channel === 'SYSTEM' && item.alertType === 'err') ||
            (item.channel === 'Nightwatch' && item.alertType === 'err');
  }).length;

  var anyWarnings = sysWarn && !!testIteration.sysWarnings.filter( function(item) {
    return item.alertType === 'warn';
  }).length;


  if (anyWarnings) {
    testIteration.status = 'warnings';
  }

  if (!SystemErrors && !anyWarnings && testIteration.status !== 'service-failure') {
    testIteration.status = 'completed';
  }

  if(SystemErrors) {
    testIteration.status = 'failure';
  }

  if (originStatus && originStatus === 'terminated') {
    testIteration.status = originStatus;
  }
  
}

var analyzeTestResults = function(testRun, maxWarnings) {
  return new Promise( (resolve, reject) => {
    // pass slices array of iterations here
    const processStats = iterations => {
      return new Promise( (resolve, reject) => {
        let prepared_iteration = iterations.filter( iter => {
          return !!iter.stat;
        });
        let pIterCount = prepared_iteration.length;

        // calculate it by calcStat and give it to controller
        var stat = analyzeTestResults_Internal(prepared_iteration, maxWarnings);

        if (pIterCount > 0) {
          testRun2.getAccomodatedStats(prepared_iteration, stat)
            .then(
              chartsData => {
                // calc chart data for audio and video
                stat.chartData = calcTestRunCharts.calcAudioAndVideoSum(_.cloneDeep(chartsData));
                // calc max and min band
                stat.maxMinBand = calcTestRunCharts.getMinMaxBand(chartsData, stat.chartData);
                // calc data for filtering by average
                stat.filterData = calcTestRunCharts.calcFilterOptions(stat.chartData, prepared_iteration);
                // calc data for probs charts
                stat.probsData = calcTestRunCharts.calcProbs(iterations);
                resolve({stat: stat, test_iterations: iterations});
              }
            )
            .catch((err) => reject(err));
        } else {
          return resolve({stat: stat, test_iterations: iterations});
        }
      });
    };
    
    // get number of loops to show on top level charts
    const loops = testRun.parameters.loopCount || 1;
    const numOfProbes = testRun.parameters.concurrentUsers; // hope it always has number type

    // Find all iterations by test
    TestIteration
      .find({testRunId: testRun._id})
      .select('+chartData')
      .lean()
      .exec( (err, test_iterations) => {
        // work with statuses
        if (err) { return deferred.reject(err) };
        const originStatus = testRun.status;

        // TODO: find a better way to change status
        // yes, this hard but it still takes some time
        // to load a page for 500+ test runs
        // INFO: set needed status
        for (let iter of test_iterations) {
          prepareStatusForIteration(testRun.runOptions, iter);
        }
        
        // prepating status of test run
        if (testRun.status !== 'started' && testRun.status !== 'running') {
          // check for test run
          let anyWarnings, anyErrors;

          for (let iter of test_iterations) {
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

          if (anyWarnings) { testRun.status = 'warnings'; }
          if (anyErrors) { testRun.status = 'failure'; }

          if (!anyErrors && !anyWarnings && testRun.status !== 'service-failure') {
            testRun.status = 'completed';
          }

          if (originStatus && originStatus === 'terminated') {
            testRun.status = originStatus;
          }
        }
        
        // INFO: first I'll try to divide it in number of loops
        // so on front-end I will get [n] top level charts
        // each will represent specific loop
        // ISSUE: for some reason calculation is wrong here
        // and on front-end I get incorrect duration and lots
        // of space left on the right side
        if (loops > 1) {
          let slicedIterations;
          let promisses = [];
          for (let i = 0; i < loops; i++) {
            const startPos = !i ? i : i + numOfProbes;
            const endPos = startPos + numOfProbes;
            slicedIterations = test_iterations.slice(startPos, endPos);
            promisses.push( processStats(slicedIterations) );
          }

          Promise.all( promisses ).then(
            iters => resolve(iters),
            err => reject(err)
          );
        } else {
          // do for all
          processStats( test_iterations ).then( iter => resolve(iter) );
        }
      });
  });
};

function analyzeTestResults_Internal(testIterations, maxWarnings) {
  return TestIterationStat.calcStat(testIterations, maxWarnings);
}

var notifyReady = function(executionInfo) {
  var deferred = Q.defer();
  if (executionInfo.executionAgent) {
    executionInfo.executionAgent.notifyReady()
      .then(function() {
        deferred.resolve();
      })
      .catch(function(err) {
        deferred.reject(err);
      });
  } else {
    deferred.resolve();
  }
  return deferred.promise;
};

var remoteTestCompleted = function(executionInfo, testFSM, failure, textError) {
  var log = executionInfo.log;
  var deferred = Q.defer();

  log.info('Remote Test Complete, saving logs', {
    failure: failure,
    textError: textError}
  );

  executionInfo.executionAgent.testCompleted({
    logUrl: '',
    failure: failure,
    textError: textError
  }).then( () => {
    return saveLogs(executionInfo, log);
  })
  // saveLogs(executionInfo, log)
  //   .then(function(logUrl) {
  //     return executionInfo.executionAgent.testCompleted({
  //       logUrl: logUrl,
  //       failure: failure,
  //       textError: textError
  //     })
  //   })
    .then(function() {
      deferred.resolve();
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
};

function sendRemoteProgressReport(executionInfo, status) {
  var log = executionInfo.log;
  //_.throttle(_notifyAllSockets, 1000);
  //testRunSocketIO.updateRunStatus(executionInfo.testRun, status);
  executionInfo.executionAgent.sendProgressReport(status);
}

function saveLogs(executionInfo, log) {
  var deferred = Q.defer();
  var testRun = executionInfo.testRun;

  executionInfo.testRun2.saveLogs()
    .then(function (url) {
      globalLogger.info('Saved logs', url);
      deferred.resolve(url);
    })
    .catch(function (err) {
      globalLogger.error('failed to save logs', err.stack);
      deferred.reject(err);
    });

  return deferred.promise;
}

function saveTestRun(testRun) {
  var deferred = Q.defer();

  testRun.save(function(err, answer) {
    if (err) { return deferred.reject(err); }
    deferred.resolve(answer);
  });

  return deferred.promise;
}

var testCompleted = function(executionInfo, testFSM, serviceFailure, runError) {
  var log = executionInfo.log;
  var failure = serviceFailure;

  function analyzeMonitorsAlerts() {
    var testErrors = executionInfo.results.testErrors;
    var errAnalyzeOptions = executionInfo.options.errAnalyzeOptions;

    var removeDuplicates = {};
    var shouldRetry = false;
    var alertErrors = _.filter(testErrors, function(err) {
      shouldRetry = shouldRetry || ((err.topic === 'pass') && errAnalyzeOptions.testFailed);

      var shouldAlert =
        ((err.topic === 'pass') && errAnalyzeOptions.testFailed) ||
        ((err.topic === 'TestExpectations' && err.alertType === 'err') && errAnalyzeOptions.testFailed) ||
        ((err.topic === 'TestExpectations' && err.alertType === 'warn') && errAnalyzeOptions.monitorWarnings);

      if (shouldAlert) {
        if (err.message in removeDuplicates) {
          shouldAlert = false;
        }
      }

      if (shouldAlert) {
        removeDuplicates[err.message] = 1;
      }

      return shouldAlert;
    });

    alertErrors = _.sortBy(alertErrors, function(item) {
      if (item.topic === 'pass') {
        return 1
      } else if (item.topic === 'packet-loss') {
        return 2
      } else if (item.topic === 'rtt') {
        return 3
      } else {
        return 4
      }
    });

    // use by webhook to report all errors
    //https://redmine.testrtc.com/issues/989
    var allErrors = [];
    _.forEach(alertErrors,function(item) {
      if (allErrors.length < 50) {
        allErrors.push({
          message: item.message,
          channel: item.channel
        });
      }
    });

    _.forEach(alertErrors,function(item) {
      if (item.channel) {
        item.message = (item.machineName ? item.machineName + ': ' : '') + item.channel + ' - ' + item.message;
      }
    });

    if (alertErrors.length > 7) {
      var length = alertErrors.length;
      alertErrors = _.take(alertErrors, 5);
      alertErrors.push({
        message: 'and ' + (length - 5) + ' More errors.',
        topic: 'info'
      });
    }


    executionInfo.results.alertErrors = alertErrors;
    executionInfo.results.allErrors = allErrors;
    executionInfo.results.shouldRetry = shouldRetry;

    // notify users about test end
    if (executionInfo.options.runMode !== 'monitor') {
      notifyAboutTestEnd(executionInfo.testRun._id, executionInfo.currentHost);
    }

  }

  function notifyAboutTestEnd(testRunId, host) {
    TestRun.findOne({ _id: testRunId })
      .then(
        _testRun => {
          const emails = (_testRun && _testRun.emailsToSendNotification) || [];
          const internalVars = { 
            testName: _testRun.name,
            testLink: `app/testRunDetails/${_testRun._id}`,
            baseLink: emailService.getFrontendUrl(process.env.DOMAIN || '', config.frontpageUrl)
          };
          for (let email of emails) {
            emailService.sendRaw('TEST_RESULT', null, internalVars, email, (err) => {
              globalLogger.notice(`Message notification about test run end sent to ${email}`);
              console.warn(arguments);
            });
          }
        }
      )
      .catch( err => {
        console.log(err);
      });
  }

  function saveTestIteration(testIteration) {
    var deferred = Q.defer();

    var _testIteration = _.clone(testIteration);
    //delete _testIteration['_id'];

    //log.info('Create TestIteration ID=', _testIteration._id);
    TestIteration.create(_testIteration, function(err, answer) {
      if (err) { return deferred.reject(err); }
      deferred.resolve(answer);
    });

    return deferred.promise;
  }

  function* sendAllocationStat() {
    var allocation = yield testRunSchedule2.getMachineAgentStatus();

    //Do it async
    sendMachineAgentAllocation(allocation)
      .then(function() {
      })
      .catch(function() {
        globalLogger.error('Failed to sendMachineAgentAllocation to influxdb, ignore error');
      });
  }

  var deferred = Q.defer();
  var runMode = executionInfo.options.runMode;
  var testRun = executionInfo.testRun;
  var logPrefix = testRun.runName;
  var stat = null;

  testRun.endDate = new Date();

  var textError;
  if (runError) {
    if (runError.message) {
      textError = runError.message;
    } else if (typeof runError === 'string') {
      textError = runError;
    }
  }

  if (!failure &&
    (!executionInfo.testIterations || executionInfo.testIterations.length === 0)) {
    failure = true;
    textError = 'No agent results';
  }

  executionInfo.results.runError = executionInfo.results.runError || runError;
  textError = testRun.textError || textError;
  failure = testRun.status == 'failure' || failure;
  if (failure && !executionInfo.results.agentAllocationError) {
    executionInfo.results.systemFailure = true;
  }

  if (failure && textError) {
    executionInfo.results.testErrors.push({
      channel: 'SYSTEM',
      topic: 'pass',
      message: textError,
      alertType: 'err'
    });
  }

  var allocationFailure = executionInfo.results.agentAllocationError;
  var isSaveTestRun = !allocationFailure || executionInfo.options.runMode === 'test';

  //need to sort status and errors
  function addTestIterationError(testIteration) {
    if (textError) {
      var sysWarnings = testIteration.sysWarnings || [];

      var warn = {
        channel: 'SYSTEM',
        topic: 'SYSTEM',
        message: textError,
        alertType: 'err'
      };

      sysWarnings.push(warn);
      log.info('Add sysWarnings', {warn: warn});
      testIteration.sysWarnings = sysWarnings;
    }
  }

  var testRunSaved;
  co(executionInfo.testRun2.releaseMachineAllocation())
    .then(function() {
      return co(sendAllocationStat());
    })
    .then(function() {
      if (executionInfo.testIterations) {
        return analyzeTestResults_Internal(executionInfo.testIterations, 50);
      } else {
        return {};
      }
    })
    .then(function(_stat) {
      var anyManualTermination = testFSM.anyManualTermination();
      var testIterations = executionInfo.testIterations;
      stat = _stat;

      executionInfo.results.testErrors = stat.rtcWarnings;
      if (anyManualTermination) {
        testRun.status = 'terminated';
        textError = 'Terminated by user';
        failure = false;
      } else if (stat.hasFailure || failure) {
        if (serviceFailure || executionInfo.results.systemFailure) {
          testRun.status = 'service-failure';
        }
        else if (textError && textError.indexOf('terminated with Timeout')>=0) {
          testRun.status = 'timeout';
        } else {
          testRun.status = 'failure';

          _.each(testIterations, function(testIteration) {
            executionInfo.testRun2.addUnknownErrorRecord(testIteration);
          });
        }
        failure = true;
      } else if (stat.hasWarnings) {
        testRun.status = 'warnings';
      } else {
        testRun.status = 'completed';
      }


      analyzeMonitorsAlerts(); // used only in monitor but cheap, do it anyway

      var pArray = [];
      if (testIterations) {
        log.info('testCompleted', {status: testRun.status, hasFailure: stat.hasFailure, testIterationsCount: testIterations.length}); // , results: executionInfo.results

        _.each(testIterations, function(testIteration) {
          if (testIteration.status === 'started') {
            testIteration.status = 'timeout';
            addTestIterationError(testIteration);
          } else if (failure) { // System failure
            //testIteration.status = 'failure';
            addTestIterationError(testIteration);
          } else if (testRun.status === 'terminated') {
            testIteration.status = 'terminated';
          }
          pArray.push(saveTestIteration(testIteration));
        });
      } else {
        log.info('testCompleted without any testIteration', {status: testRun.status, hasFailure: stat.hasFailure, stat: stat});
      }

      return Q.all(pArray);
    })
    .then(function() {
      var textErrorLevel = 'err';
      if (!textError) {
        var answer = executionInfo.testRun2.pickHighestPriorityMessage(stat.rtcWarnings);
        textError = answer.text;
        textErrorLevel = answer.level;
      }
      testRun.textError = textError;
      testRun.textErrorLevel = textErrorLevel;
      executionInfo.results.failed = failure;

      testRun.lastUpdate = new Date(); // we need this when save to influx but put it here in case will be used in hook
      return executionInfo.testRun2.updateStatistic(stat);
    })
    .then(function() {
      return co(executionInfo.testRun2.connectWebHook(testRun, executionInfo.options.webhook));
    })
    .then(function() {

      if (isSaveTestRun) {
        return saveLogs(executionInfo, log);
      }
    })
    .then(function(url) {
      if (url) {
        var logUrls = testRun.logUrls || {};
        var agentName = executionInfo.executionAgent ? executionInfo.executionAgent.name : 'main';
        logUrls[agentName] = url;
        testRun.logUrls = logUrls;
      }

      if (executionInfo.results.systemFailure &&
        executionInfo.options.ignoreTestRunOnFailure) {
        //not saving the record to user account but to samples@testrtc.com

        globalLogger.error(logPrefix, 'Monitor failed to run, save result to support@testrtc.com');
        return Project.getSupportProject();
      } else {
        return testRun.project;
      }
    })
    .then(function(projectId) {
      // don't save allocation failures
      if (isSaveTestRun) {
        testRun.project = projectId;
        testRun.statusId = utils.getStatusId(testRun.status);
        return saveTestRun(testRun);
      } else {
        //log.info('Monitor allocation error, dont save record'); // log will not be saved
      }
    })
    .then(function(testRun) {
      testRunSaved = testRun;

      if (!executionInfo.options.notificationsOff && messaging) {
        executionInfo.progressReport(executionInfo);
        setTimeout(function () { // let the last packet sent
          // testRunSocketIO.cleanTestRun(testRun);
          messaging.send('testrun.status', {id: testRun._id, status: testRun.status}, {projectId: testRun.project});
        }, 2000);
      }
      return co(executionInfo.testRun2.writeHeapSnapshot('testend'));
    })
    .then(function() {
      return co(executionInfo.testRun2.writeCPUProfile('testend'));
    })
    .then(function() {
      deferred.resolve(testRunSaved);
    })
    .catch(function(err) {
      globalLogger.error('testCompleted error, catch', err.stack); // log will not be saved
      deferred.reject(err);
    });

  return deferred.promise;
};

var progressReport = function(executionInfo, status) {
  executionInfo.testRun2.progressReport(status);
};

//don't break the test in case influxdb is not working
function* ignoreError(log, func) {
  try {
    return yield func();
  } catch (err) {
    log.error(err.stack);
    return null;
  }
}

var schedule = function(executionInfo, testFSM) {
  var log = executionInfo.log;
  var promise;
  if (!executionInfo.executionAgent) {
    promise = function*() {
      yield executionInfo.testRun2.callSchedule(testFSM);
    }
  } else {
    // we are on a remote machine,
    promise = function*() {
      yield testRunSchedule2.remoteSchedule(executionInfo, testFSM);
    }
  }

  var deferred = Q.defer();
  co(promise)
    .then(function(answer) {
      deferred.resolve(answer);
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
};

var getRunGroup = function(executionInfo, machineFSM, concurrentIndex) {
  //Room Logic

  var groups = machineFSM.machineId; // by default no groups, each machine execute test by itself
  var roomIdx = 1;
  var roomId = '';
  var roomMember = 0;
  var testRun = executionInfo.testRun;

  var sessionSize = executionInfo.options.room || executionInfo.options.session;
  if (sessionSize) {
    if (typeof sessionSize === 'boolean') {
      sessionSize = 2;
    } else {
      sessionSize = Number(sessionSize);
      // if (sessionSize < 2) {
      //   sessionSize = 2;
      // }
    }

    roomIdx = (Math.floor(concurrentIndex / sessionSize) + 1);
    roomId = 'room' + roomIdx;
    roomMember = (concurrentIndex % sessionSize);
    groups = roomId;
  }

  machineFSM.room = {
    roomIdx: roomIdx,
    roomId: roomId,
    roomMember: roomMember,
    sessionSize: sessionSize
  };

  return groups;
};

var prepareGroupIteration = function(executionInfo, machineId, machineFSM) {
  var log = machineFSM.log;
  // remove server variables
  if (machineFSM.room.roomMember === 0) {
    roomInfo.clearRoomInfo(machineFSM.room.roomId);
    log.debug('Clear room variable', machineFSM.room.roomId);
  }
  return true;
};

var resetTest = function(executionInfo, machineFSM, reason) {
  var log = machineFSM.log;
  if (machineFSM.runTestExecution) {
    log.info('Reset Test: (deprecated?)', {reason: reason});
    machineFSM.runTestExecution.resetTest(reason);
  } else {
    log.info('Seem container was not loaded yet, not reset Test: ' + reason);
  }
};

var createAgent = function(executionInfo, machineId, machineFSM, machineGroup) {
  var deferred = Q.defer();
  var log = machineFSM.log;

  function handleEventError(event, err) {
    log.error('Test result processing error ' + event, err.stack);

    sysWarnings.push({
      channel: 'SYSTEM',
      topic: 'SYSTEM',
      message: 'Test result processing error: ' + event,
      alertType: 'err'
    });
  }

  function saveStdout(executionInfo, machineId, machineFSM, parseStdOut) {
    var testIteration = machineFSM.currentTestIteration;
    var sysWarnings = testIteration.sysWarnings || [];
    //var foundValues = parseAgentStdOut(executionInfo, stdout, sysWarnings, log);

    var capabilities = parseStdOut.values.capabilities;
    if (capabilities) {
      testIteration.os = capabilities.platform || 'unknown';
      if (capabilities.browserName && capabilities.version) {
        testIteration.browser = capabilities.browserName + ':' + capabilities.version;
      }
    }

    _.each(parseStdOut.sysWarnings, function(warn) {
      sysWarnings.push(warn);
    });

    if (parseStdOut.values.systemFailure) {
      executionInfo.results.systemFailure = true;
    }

    if (parseStdOut.values.suspectedSystemFailure) {
      executionInfo.results.suspectedSystemFailure = true;
    }

    testIteration.sysWarnings = sysWarnings;
  }

  function saveExceutionResult(executionInfo, machineId, machineFSM, json) {
    var log = machineFSM.log;
    var testIteration = machineFSM.currentTestIteration;

    var sysWarnings = testIteration.sysWarnings || [];
    var warn;

    if (json.additonalMessages) {
      _.each(json.additonalMessages, function(msg) {
        warn = {
          channel: msg.topic,
          topic: msg.topic,
          message: msg.message,
          alertType: msg.msgType
        };

        sysWarnings.push(warn);
        log.info('results.messages add sysWarnings', {warn: warn, json: json});
      })
    }

    testIteration.status = json.shouldRetry ? 'retry' : json.status;
    if ((json.status === 'service-failure' || json.status === 'failure' || json.status === 'error')) {
      if (json.shouldRetry) {
        if (!json.message) {
          json.message = 'Test failed, unknown error';
        }
        //Don't update status to failure, keep it started as we still retry
        //Retry?
        warn = {
          channel: 'SYSTEM',
          topic: 'SYSTEM',
          message: json.message,
          alertType: 'info'
        };

        sysWarnings.push(warn);
        log.info('saveExceutionResult add sysWarnings', {warn: warn, json: json});
      }
    }

    testIteration.sysWarnings = sysWarnings;
  }

  function saveBrowserLogs(executionInfo, machineId, machineFSM, json) {
    var testIteration = machineFSM.currentTestIteration;

    var browserLogs = json;
    //testIteration.browserLog = browserLogs;
    var sysWarnings = testIteration.sysWarnings || [];
    var lastMessage = null;
    _.each(browserLogs, function(log) {
      if (log != null && log.message) {
        if (log.level === 'SEVERE' || log.level === 'ERROR' || log.level === 'TEST-ERROR' || log.level === 'WARNING') {
          var filter = false;

          //Filter some wierd messages, not sure where they are coming from redmine 180
          if (log.message.indexOf('{') === 0 &&
            (log.message.indexOf('executeAsyncScript') >=0 || log.message.indexOf('executionContextId') >=0) &&
            log.message.indexOf('"column"') >=0) {
            filter = true;
          }

          if (log.message.indexOf('Trying to re-register CID') === 0) {
            filter = true;
          }

          if (!filter && lastMessage !== log.message) { // avoid some duplicates the browser sometimes do like ERR_NAME_NOT_RESOLVED
            sysWarnings.push({
              channel: 'BROWSER',
              topic: 'BROWSER',
              level: log.level,
              message: log.message,
              alertType: 'warn'
            });
            lastMessage = log.message;
          }
        }
      }
    });

    testIteration.sysWarnings = sysWarnings;
  }

  function saveJson(executionInfo, machineId, machineFSM, jsonAnswer) {
    var testIteration = machineFSM.currentTestIteration;
    //dumpObject(jsonAnswer, 'data-AnalyzeData');

    if (!executionInfo.testRun2.useGetStat(machineFSM)) {
      var now = new Date();
      testIteration.testDuration = now.getTime() - (new Date(testIteration.startDate)).getTime();
      testResult.analyzeData(testIteration, jsonAnswer);
      log.debug('save json - webrtc.internal - analyzeData', {
        stat: testIteration.stat,
        sysWarnings: testIteration.sysWarnings
      });
    } else {
      log.debug('save json - ignore data, use getstat', {browser: executionInfo.testRun2.getBrowserType(machineFSM), getstats: executionInfo.options.getstats});
    }
  }

  function saveGetStat(executionInfo, machineId, machineFSM, jsonAnswer) {
    var testIteration = machineFSM.currentTestIteration;
    //dumpObject(jsonAnswer, 'data-GetStat');


    if (executionInfo.testRun2.useGetStat(machineFSM)) {
      var now = new Date();
      testIteration.testDuration = now.getTime() - (new Date(testIteration.startDate)).getTime();
      testResult.analyzeGetStat(testIteration, jsonAnswer);
      // log.debug('save json - getStat - analyzeData', {stat: testIteration.stat, sysWarnings: testIteration.sysWarnings});
    }
  }

  function completeTestIteration(executionInfo, machineId, machineFSM, jsonResult) {
    var deferred = Q.defer();
    var testIteration = machineFSM.currentTestIteration;
    var sysWarnings = testIteration.sysWarnings || [];
    var ignoreTestErrors = executionInfo.options['ignore-test-errors'];
    var log = machineFSM.log;

    var warn;
    var now = new Date();
    testIteration.testDuration = now.getTime() - (new Date(testIteration.startDate)).getTime();
    testIteration.endDate = new Date();

    /* store events */
    Array.prototype.push.apply(testIteration.events, jsonResult.events);

    if (jsonResult.rtcTestInfo) {
      if (jsonResult.rtcTestInfo.metric) {
        var testMetric = new testMisc.TestMetric(jsonResult.rtcTestInfo.metric);
        testIteration.customTestMetric = testMetric.getMetrics();
        if (testMetric.getWarnings().length) {
          sysWarnings = sysWarnings.concat(testMetric.getWarnings());
        }
      }

      var testExpectations = new testMisc.TestExpectations(testIteration, jsonResult.rtcTestInfo.expectation, log);
      var warnings = testExpectations.getWarnings();
      if (warnings.length) {
        sysWarnings = sysWarnings.concat(warnings);
      }
      warnings = testExpectations.getRtcWarnings();
      if (testIteration.rtcWarnings && testIteration.rtcWarnings.length > 0) {
        log.error('Code refactoring error, expected to be empty', {warn: testIteration.rtcWarnings});
        throw new Error('Code refactoring error, expected to be empty');
      }

      testIteration.rtcWarnings = warnings;
    }

    var addError = function (msg, source) {
      warn = {
        channel: 'SYSTEM',
        topic: 'SYSTEM',
        alertType: 'err',
        message: msg
      };

      sysWarnings.push(warn);
      log.info('completeTestIteration ADD sysWarnings(#2) - err ' + msg, {source: source, warn: warn});
    };

    if (jsonResult.additionalMessages) {
      _.forEach(jsonResult.additionalMessages, function(item) {
        warn = {
          channel: item.channel || 'Misc',
          topic: item.topic || 'Misc',
          alertType: item.msgType,
          message: item.message
        };

        sysWarnings.push(warn);
      })
    }

    if (machineFSM.wasFailed && machineFSM.error.message) {
      addError(machineFSM.error.message, 'machineFSM.error.message');
    } else if (jsonResult && (jsonResult.status === 'failure' || jsonResult.status === 'error'))  {
      executionInfo.results.systemFailure = executionInfo.results.suspectedSystemFailure || executionInfo.results.systemFailure;
      //jsonResult.message can be array of lines or string
      if (Array.isArray(jsonResult.message) && jsonResult.message.length) {
        _.each(jsonResult.message, function (msg) {
          addError(msg, 'jsonResult.message[]');
        });
      } else if (jsonResult.message && !Array.isArray(jsonResult.message)) {
        addError(jsonResult.message, 'jsonResult.message');
      } else if (ignoreTestErrors) {
        log.info('completeTestIteration test failed, but #ignore-test-errors so ignore the failure');
      } else {
        var errCount = 0;
        var changeCount = 0;
        _.each(sysWarnings, function(warn) {
          if (warn.channel === 'Test' &&
            warn.alertType === 'warn') {
            warn.alertType = 'err';
            changeCount++;
            log.info('completeTestIteration convert test from warn to err', {warn: warn});
          } else if (warn.alertType === 'err') {
            errCount++;
          }
        });

        //Moved to end of test so we know if was simple error or terminated manually
        //if (changeCount === 0 && errCount === 0) {
        //  addError('Test failed, unknown error', 'unknown');
        //}
      }
    }

    var stat = testIteration.stat;
    var status = testIteration.status;
    if (status === 'completed') {
      if (testIteration.rtcWarnings.length) {
        status = 'warnings';
        log.info('test status is warnings because of testIteration.rtcWarnings', {rtcWarnings: testIteration.rtcWarnings});
      }

      _.each(sysWarnings, function(warn) {
        //Ignore info messages
        if (warn.alertType === 'warn' && status === 'completed') {
          status = 'warnings';
          log.info('test status is warnings because of custom warning', warn.message);
        } else if (warn.alertType === 'err' && status !== 'failure') {
          status = 'failure';
          log.info('test status is failure because of custom warning', warn.message);
        }
      });
    }

    testIteration.status = status;
    testIteration.sysWarnings = sysWarnings;

    log.info('Test-Iteration complete', {
      status: testIteration.status,
      //stat: testIteration.stat,
      startDate: testIteration.startDate,
      testDuration: testIteration.testDuration,
      os: testIteration.os,
      browser: testIteration.browser,
      location: testIteration.location,
      networkProfile: testIteration.networkProfile,
      runIndex: testIteration.runIndex,
      runName:testIteration.runName,
      machine: testIteration.machine
    });

    function done() {
      machineFSM.testRunDeferred.resolve(testIteration);
      deferred.resolve(testIteration);
    }


    var isRemoteExecution = !!executionInfo.executionAgent;
    if (isRemoteExecution) {
      executionInfo.executionAgent.iterationCompleted(testIteration)
        .then(function() {
          done();
        })
        .catch(function(err) {
          deferred.reject(err);
        })
    } else {
      done();
    }

    return deferred.promise;
  }

  function* containerStart(executionInfo, machineId, machineFSM, machineGroup) {

    var testRun = executionInfo.testRun;
    var cmd;

    let storageService = executionInfo.blobFolderName.startsWith('gcs') ? 'gcs' : 'aws';
    debugger;
    if (executionInfo.options['force-storage']) {
      storageService = executionInfo.options['force-storage'];
    }

    var env = [
      'RTC_TEST_SCRIPT_NAME=' + testRun.name,
      'RTC_SERVICE_URL=' + executionInfo.options.serviceUrl,
      'RTC_TEST_NAME=' + executionInfo.seedName,
      'RTC_AGENT_COUNT=' + executionInfo.threadsCount,
      'RTC_AGENT_NAME=' + machineId,
      'RTC_AGENT_NUM=' + (machineFSM.concurrentIndex + 1),
      'RTC_PROBE_COUNT=' + executionInfo.threadsCount,
      'RTC_PROBE_NAME=' + machineId,
      'RTC_PROBE_NUM=' + (machineFSM.concurrentIndex + 1),
      'RTC_ITERATION_COUNT=' + executionInfo.iterationsCount,
      'RTC_ITERATION_NUM=' + (machineFSM.currentLoop + 1),
      'RTC_SESSION_NAME=' + executionInfo.seedName+'-'+machineFSM.room.roomId,
      'RTC_SESSION_IDX=' + machineFSM.room.roomIdx,
      'RTC_SESSION_SIZE=' + machineFSM.room.sessionSize,
      'RTC_IN_SESSION_ID=' + (machineFSM.room.roomMember + 1),
      'RTC_TIMEOUT=' + executionInfo.timeouts.runTest,
      'RTC_OS=' + 'LINUX',
      'RTC_LOCATION=' + machineFSM.testProfile.location,
      'RTC_BROWSER=' + machineFSM.testProfile.browser,
      'RTC_NETWORK_PROFILE=' + machineFSM.testProfile.network,
      'RTC_FIREWALL_PROFILE=' + machineFSM.testProfile.firewall,
      'RTC_ITERATION_MACHINE_ID=' + machineId,
      'RTC_TEST_RUN_ID=' + testRun._id.toString(),
      'API_URL=' + config.apiProperties.url,
      'SUPPORT_API_KEY=' + config.apiProperties.supportKey,
      'ADMIN_URL=' + config.adminUrl,
      'TEST_RESULTS_PATH=/test-results/' + machineId,
      'AZURE_STORAGE_CONNECTION_STRING=' + process.env.AZURE_STORAGE_CONNECTION_STRING,
      'GCS_CONFIG_BUCKET=' + config.gcs_config.bucket,
      'GCS_CONFIG_PROJECT=' + config.gcs_config.projectId,
      'GCS_CONFIG_CLIENT_EMAIL=' + config.gcs_config.client_email,
      'GCS_CONFIG_PRIVATE_KEY=' + config.gcs_config.private_key,
      // TODO: here I set for aws and gcs, but should set for azure as well in future
      'STORAGE_SERVICE=' + storageService,
      'CREATED_BY=' + config.instanceName,
      'DEBUG=*', // to enable npm debug
      "S3_CONFIG_ACCESS_KEY=" + "AKIAJRQ2WK4BLV6PI3RA",
      "S3_CONFIG_SECRET_KEY=" + "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",
      "S3_CONFIG_REGION=" + "eu-central-1",
      "S3_CONFIG_BUCKET=" + "rtctmp"
    ];
    if (executionInfo.options.environmentVariables && Array.isArray(executionInfo.options.environmentVariables)) {
      console.log(`envVars: preparing env vars to be added`);
      for (let item of executionInfo.options.environmentVariables) { 
        const chunk = `${item.variable}=${item.value}`
        env.push( chunk );
      }
    } else { // leaving it simply to know if something bad happen
      console.log(`No env vars`);
    }


    log.debug('containerStart', {env: env, blobFolderName: executionInfo.blobFolderName, apiProperties: config.apiProperties});


    var runTestExecution;
    if (executionInfo.options['read-replay']) {
      //var _executeRunTest = require('../docker/executeRunTest.read-replay');
      //runTestExecution = new _executeRunTest.RunTestExecution(machineGroup.DockerAgentMachine, executionInfo.options, executionInfo.configDataMain, executionInfo.testRun2, log);

      var _executeRunTest = require('../docker/AgentConnect.read-replay');
      runTestExecution = new _executeRunTest(machineFSM, machineGroup.DockerAgentMachine, executionInfo.options, executionInfo.configDataMain, executionInfo.testRun2, log);
    } else {
      runTestExecution = new executeRunTest(machineFSM, machineGroup.DockerAgentMachine, executionInfo.options, executionInfo.configDataMain, executionInfo.testRun2, log);
    }

    var imageShortName = 'agent-chrome'; // 'agent-chrome'; // 'agent+hub'; //
    machineFSM.runTestExecution = runTestExecution;

    var browserEnv = executionInfo.testRun2.getBrowserType(machineFSM);
    var browserSetup = _.find(executionInfo.configDataMain['docker-machines'], function(browserSetup) {
      return browserSetup.id === machineFSM.testProfile.browser;
    });

    // Additional selenium options which are being appended to selenium JAR (as JAVA_OPTS env variable)
    var additionalSeleniumOptions = [];

    if (browserEnv === 'firefox') {
      // additionalSeleniumOptions.push('-Dwebdriver.firefox.profile=nightwatch');

      imageShortName = 'agent-firefox';

      if (browserSetup && browserSetup.binary) {
        // additionalSeleniumOptions.push('-Dwebdriver.firefox.bin=' + browserSetup.binary);
      }
    }

    if (browserEnv === 'chrome' && executionInfo.options['webdriver-verbose-logging']) {
      additionalSeleniumOptions.push('-Dwebdriver.chrome.logfile=/tmp/chromedriver.log');
    }

    if (machineFSM.vncPort) {
      if (imageShortName === 'agent-firefox') {
        imageShortName = 'agent-debug-firefox'; // agent-chrome-vnc';
      } else {
        imageShortName = 'agent-debug-chrome'; // agent-chrome-vnc';
      }
    }

    var JAVA_OPTS = additionalSeleniumOptions.join(' ');
    env.push('JAVA_OPTS=' + JAVA_OPTS);
    log.debug('Setting additional selenium options:', JAVA_OPTS);

    log.debug('Created RunTestExecution', imageShortName);

    runTestExecution.on('report-message', function(msg) {
      try {
        machineFSM.reportMessage(msg);
        //setProgressReport
      } catch (err) {
        log.error('on - report-message', err.stack);
      }
    });

    runTestExecution.on('inspect', function(inspect) {
      try {
        machineFSM.agentInfo = inspect;

        var shortAnswer = {
          agentId: machineFSM.machineGroup.agentSetup._id,
          id: inspect.Id,
          vnc: runTestExecution.buildVNCUrl(inspect),
        };

        executionInfo.status[machineId].agentInfo = shortAnswer;

        log.debug('on - inspect', {shortAnswer: shortAnswer});
      } catch (err) {
        log.error('on - inspect', err.stack);
      }
    });

    runTestExecution.on('rtc-inspect', function _saveJson(header, jsonObject) {
      try {
        log.debug('on - rtc-inspect', {header: header /*, jsonObject: jsonObject*/});
        saveJson(executionInfo, machineId, machineFSM, jsonObject);
      } catch (err) {
        log.error('on - rtc-inspect', err.stack);
      }
    });

    runTestExecution.on('getStat', function _saveGetStat(header, jsonObject) {
      try {
        log.debug('on - getStat'); //, {header: header, jsonObject: jsonObject});
        saveGetStat(executionInfo, machineId, machineFSM, jsonObject);
      } catch (err) {
        log.error('on - getStat', err.stack);
      }
    });

    runTestExecution.on('browser-logs', function _saveBrowserLogs(header, jsonObject) {
      log.debug('on - browser-logs'); // , {header: header, jsonObject: jsonObject});
      try {
        saveBrowserLogs(executionInfo, machineId, machineFSM, jsonObject);
      } catch (err) {
        log.error('on - browser-logs', err.stack);
      }
    });

    runTestExecution.on('agent-mem-diff', function _agentMemDiff(header, jsonObject, fileName) {
      //log.debug('on - agent-mem-diff', {header: header, jsonObject: jsonObject});
      try {
        var memDiffIdRegExp = new RegExp("memdiff.(.*).json");
        if (memDiffIdRegExp.test(fileName)) {
          var parts = memDiffIdRegExp.exec(fileName);
          var id = parts[1];

          if (process.env.NODE_ENV !== 'production') {
            fs.writeFileSync('./tmp/' + machineId + '-agent-mem-diff-' + id + '.heapsnapshot', JSON.stringify(jsonObject, null, 4));
          }
        }
      } catch (err) {
        log.error('on - agent-mem-diff', err.stack);
      }
    });

    runTestExecution.on('execution-stdout', function _saveStdout(parseStdOut) {
      //log.info('on - execution-stdout', {stdout: stdout});
      try {
        saveStdout(executionInfo, machineId, machineFSM, parseStdOut);
      } catch (err) {
        log.error('on - execution-stdout', err.stack);
      }
    });

    runTestExecution.on('execution-result', function _ExecutionResults(jsonObject) {
      try {
        log.debug('on - execution-result', {jsonObject: jsonObject});
        saveExceutionResult(executionInfo, machineId, machineFSM, jsonObject);
      } catch (err) {
        log.error('on - execution-result', err.stack);
      }
    });

    runTestExecution.on('end-test', function(jsonObject) {
      try {
        log.debug('on - end-test', {jsonObject: jsonObject});
        //dumpObject(jsonObject, 'end-test.stub');
        //machineFSM.runTestExecution.stopContainer();
        completeTestIteration(executionInfo, machineId, machineFSM, jsonObject);
      } catch (err) {
        log.error('on - end-test', err.stack);
      }
    });

    // we can use two different agent image for DA and static
    let version;
    if (executionInfo.options['dynamic-probe'] != 'false' &&
        (executionInfo.options['dynamic-probe'] ||
        executionInfo.threadsCount > deepGet(executionInfo.projectSetup.configData, ['test-execution', 'auto-da' , 'max-static-probe'], 10))) {
          version = executionInfo.configDataMain['test-execution']['dynamicAgentVersion'];
        } else {
          version = executionInfo.configDataMain['test-execution']['staticAgentVersion'];
        }

    // var version =  executionInfo.configDataMain['test-execution'].agentVersion;
    if (!version) {
      throw new Error('Agent version not configured');
    }

    if (executionInfo.options.dockerImageVersion) {
      version = executionInfo.options.dockerImageVersion;
    }


    var dockerImageMap = {
      'agent-chrome': 'chrome-stable',
      'agent-firefox': 'firefox-stable',
      'agent-debug-firefox': 'firefox-debug-stable',
      'agent-debug-chrome': 'chrome-debug-stable',
    };
    var dockerImageName = dockerImageMap[imageShortName];

    var configure = {
      conf: {
        Image: dockerImageName + ':' + version,
        Tty: true,
        Cmd: ['/opt/bin/entry_point.sh'],
        HostConfig: {
          Privileged: true
        },
      }
    };

    //Change image name based on selected version
    if (machineFSM.testProfile) {
      var imageName = configure.conf.Image;
      var browserId = machineFSM.testProfile.browser;

      _.each(['-unstable', '-beta', '-stable1'], function(version) {
        if (browserId.indexOf(version) > 0) {
          imageName = imageName.replace('-stable', version);
        }
      });

      //Check if we override the docker name and version in the config file
      //Todo: delete all the old logic to get the image name?
      if (browserSetup['id']) {
        const _version = browserSetup['id'].split('-')[2] || 'stable';
        const _chromedriver = executionInfo.configDataMain['test-execution']['chromedriver-versions'][_version];
        executionInfo.options.chromedriver = _chromedriver;
        log.debug(`Setting chromedriver to ${_chromedriver} for Chrome ${_version}`);
      }

      if (browserSetup["image-name"]) {
        imageName = browserSetup["image-name"];
        if (machineFSM.vncPort) {
          if (browserSetup["debug-image-name"]) {
            imageName = browserSetup["debug-image-name"];
          } else {
            //generate it
            var pos = imageName.indexOf('-');
            imageName = imageName.substring(0,pos) + '-debug' + imageName.substring(pos);
          }
        }
        if (imageName.indexOf(':') <=0 ) {
          imageName = imageName + ':' + version;
        }
      }

      log.debug('Use image', imageName);
      configure.conf.Image = imageName;
    }

    configure.conf.name = machineId;
    configure.conf.HostConfig = configure.conf.HostConfig || {};
    //configure.conf.HostConfig.VolumesFrom = ['/test-results', '/media-storage2'];
    //configure.conf.HostConfig.VolumesFrom = ['/test-results'];

    /*
     if (executionInfo.options.hasVideo) {
     configure.conf.HostConfig.VolumesFrom.push('/video-storage');
     }
     if (executionInfo.options.hasAudio) {
     configure.conf.HostConfig.VolumesFrom.push('/' + mediaId);
     }
     */
    configure.conf.Env = env;

    //Needed for resetTest
    runTestExecution.machineFSM = machineFSM;
    machineFSM.runTestExecution = runTestExecution;

    const prepareEnvVars = (arr, startsWith) => {
      // let resultObj = {};
      arr.filter( item => {
        return item.startsWith(startsWith);
        // let parsed = item.split('=');
        // if (item.startsWith(startsWith)) {
        //   resultObj[parsed[0]] = parsed[1];
        // }
      });

      return arr;
    };

    // save env before it gets running because at staging we loose this info
    const filteredEnvs = prepareEnvVars(env, "RTC_");
    console.log(`beginning of a test, reading env vars`);
    TestRun.update({ _id: executionInfo.testRun._id }, {
      $set: { env: filteredEnvs }
    }).then( updated => { });

    log.debug('Calling runTestExecution.startContainer: ' + machineId, {conf: configure.conf});
    var container = yield runTestExecution.startContainer(machineId, configure, executionInfo.options, false, false, machineFSM.vncPort);
    log.debug('Returned from runTestExecution.startContainer: ' + machineId);

    var shortAnswer = {
      vnc: runTestExecution.buildVNCUrl(machineFSM.vncPort),
    };

    executionInfo.status[machineId].agentInfo = shortAnswer;
  }

  var _containerStart = co.wrap(containerStart);
  _containerStart.call(this, executionInfo, machineId, machineFSM, machineGroup)
    .then(function() {
      deferred.resolve();
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

var pingAgent = function(executionInfo, machineFMS) {
  /*
   var machineId = machineFMS.machineId;
   var retry = executionInfo.status[machineId].retry || 1;
   executionInfo.status[machineId].retry = retry;
   retry++;

   var testRun = executionInfo.testRun;

   return Agent.ping(agentUrl, testRun);
   */

  return true;
};

//should be converted to generator
var cleanContainer = function*(executionInfo, machineFMS, runTestExecution, machineId, projectId) {
  var log = machineFMS.log;
  if (runTestExecution) {
    var container = runTestExecution.container;

    if (container) {
      /*
       var isRemoteExecution = !!executionInfo.executionAgent;
       if (!isRemoteExecution) {
       //Continue archive the container in async way
       try {
       var data = yield runTestExecution.getArchiveContainerInfo();

       yield async(DockerArchive, DockerArchive.create, {
       project: projectId.toString(),
       containerId: container.id,
       data: data,
       });
       } catch (err) {
       console.log('runTestExecution.getArchiveContainerInfo', err.stack);
       }
       }
       */

      yield runTestExecution.removeContainer(null, true); // ignore error, sometimes container stop manually and we cannot remove it as already removed
      /* now doing this on testComplete
       if (testRunSchedule2) {
       yield testRunSchedule2.releaseAllocatedLoad(executionInfo, machineFMS);
       }
       */
    }
  }
};

var stopContainer = function(executionInfo, machineFMS) {
  var deferred = Q.defer();
  var log = machineFMS.log;

  var machineId = machineFMS.machineId;

  if (executionInfo.options.keep) {
    deferred.resolve();
  } else {
    //dumpObject(util.inspect(machineFMS), 'stopContainer');
    if (machineFMS.wasFailed && machineFMS.error) {
    }

    log.debug('Stopping container');
    var _cleanContainer = co.wrap(cleanContainer);
    _cleanContainer.call(this, executionInfo, machineFMS, machineFMS.runTestExecution, machineId, executionInfo.testRun.project)
      .then(function(answer) {
        log.debug('Stopped container completed');
        machineFMS.containerCreatedStatus = 'stop';
        deferred.resolve();
      })
      .catch(function(err) {
        log.error(machineId, 'Error stop container', err.stack);
        deferred.reject(err);
      });
  }

  return deferred.promise;
};

var createStubMachine = function(executionInfo, machineGroup) {
  var deferred = Q.defer();
  var log = executionInfo.log;
  var DockerAgentMachine = {
    log: log
  };
  machineGroup.DockerAgentMachine = DockerAgentMachine;
  deferred.resolve();

  return deferred.promise;
};

var loadRemoteExecution = function(executionInfo, executionGroup /*: IExecutionGroup */) {
  var deferred = Q.defer();

  co(executionGroup.load(deferred))
    .then(function(answer) { // Need to wrap this as co.wrap is not a Q promise and does not have timeout()
      executionInfo.log.info('loadRemoteExecution completed ' + executionGroup.name);
    })
    .catch(function(err) {
      globalLogger.error('Load RemoteExecution failed', err.stack);
      deferred.reject(err);
    });

  return deferred.promise;
};

var startRemoteExecution = function(executionInfo, executionGroup /*: IExecutionGroup */) {
  var deferred = Q.defer();

  co(executionGroup.runTest(deferred))
    .then(function(answer) { // Need to wrap this as co.wrap is not a Q promise and does not have timeout()
    })
    .catch(function(err) {
      globalLogger.error('Start RemoteExecution failed', err.stack);
      deferred.reject(err);
    });

  return deferred.promise;
};

var loadAndStartRemoteExecution = function(executionInfo, executionGroup /*: IExecutionGroup */) {
  var deferred = Q.defer();

  co(executionGroup.loadAndRunTest(deferred))
    .then(function(answer) { // Need to wrap this as co.wrap is not a Q promise and does not have timeout()
    })
    .catch(function(err) {
      globalLogger.error('Load & Start RemoteExecution failed', err.stack);
      deferred.reject(err);
    });

  return deferred.promise;
};

var createMachine = function(executionInfo, machineGroup) {
  var deferred = Q.defer();
  var log = executionInfo.log;

  var testProfile = machineGroup.testProfile;

  //Todo: not used for anything anymore but to create the docker, can remove DockerAgentMachine object
  var DockerAgentMachine = new dockerAgentMachine.DockerAgentMachine(log, machineGroup.agentSetup , testProfile, executionInfo.options);
  machineGroup.DockerAgentMachine = DockerAgentMachine;
  //console.log(DockerAgentMachine.docker);

  /*
   var mp3streamId = null;
   if (executionInfo.options.hasAudio) {
   mp3streamId = executionInfo.testRun.testId;
   }
   */

  co.wrap(DockerAgentMachine.prepareMachine).call(DockerAgentMachine, executionInfo.seedName)
    .then(function(answer) { // Need to wrap this as co.wrap is not a Q promise and does not have timeout()
      deferred.resolve(answer);
    })
    .catch(function(err) {
      globalLogger.error('createMachine failed', err.stack);
      deferred.reject(err);
    });


  return deferred.promise;
};

var nullMethod = function() {
  var deferred = Q.defer();

  setTimeout(function() {
    console.info('Null Method completed');
    deferred.resolve(true);
  }, 1);
  return deferred.promise;
};

var buildMediaUrl = function(testDefinitionId, fileType, fileName) {
  //'http://1d3bd25d.ngrok.com/api/test_definitions/media/audio/552a4a49ffa10c301daa12b0/message.mp3'

  return config.adminUrl +
    '/api/test_definitions/media/' +
    fileType + '/' +
    testDefinitionId.toString() + '/' +
    fileName;
};

function executeTest(testDefinitionOptions, testRun, options, configDataMain, projectSetup) {
  var deferred = Q.defer();
  try {
    var simulatedResults = options.sim;
    var seedName = testRun.runName;
    var iterationsCount = testDefinitionOptions.testParameters.loopCount || 1;
    var isRemoteExecution = !!testDefinitionOptions.executionAgent;
    var logLevel = 'info';

    if ((!options.timeout || options.timeout < 15) && iterationsCount === 1 && testDefinitionOptions.testParameters.concurrentUsers < 5) {
      //Todo: Set default to true in case of short test
      options['save-replay'] = true;
      logLevel = 'debug';
    } else if (iterationsCount > 1 || testDefinitionOptions.testParameters.concurrentUsers > 25) {
      logLevel = 'notice';
    }

    if (options.agent) {
      options.probe = options.agent;
    }

    if (options['agent-load-factor']) {
      options['probe-load-factor'] = options['agent-load-factor'];
    }

    if (options['log-level']) {
      logLevel = options['log-level'];
    }

    if (options['upload-speed-limit']) {
      options['upload-speed-limit'] = '4000k';
    }

    var log;
    if (testDefinitionOptions.log) {
      log = testDefinitionOptions.log;
    } else {
      log = topicLog(seedName, testDefinitionOptions.log, {level: logLevel});
    }

    if (options.timeout > 15 && options['no-getstat'] !== 'true') {
      //Todo: remove when getstat become the default
      //Set default to true in case of long test
      options['getstat'] = true;
    }

    if (!options.notificationsOff && testDefinitionOptions.testParameters.concurrentUsers > 1200) {
      options.notificationsOff = true;
      log.info('Large test, turn off progress notifications');
    }

    if (options.runMode === 'monitor') {
      log.notice(util.format('Start monitor %s->%s->%s %s (%s) log:%s', projectSetup.projectName, options.monitorName, testRun.name, seedName, options.monitorRescheduleCount, logLevel));
    } else {
      log.notice(util.format('Start test %s->%s %s log:%s', projectSetup.projectName, testRun.name, seedName, logLevel));
    }

    if (options.vnc && (options.runMode === 'monitor' || iterationsCount > 1)) {
      log.info('Disable VNC');
      options.vnc = false;
    }

    var testExecutionInfo = {
      testRun: testRun,
      testIterations: [], // key = runIndex, value = TestIteration Model, results of iteration
      options: options,
      logLevel: logLevel,
      configDataMain: configDataMain,
      projectSetup: projectSetup,
      threadsCount: testDefinitionOptions.testParameters.concurrentUsers || 1,
      iterationsCount: iterationsCount,
      testParameters: testDefinitionOptions.testParameters,
      dynamicAgentId: '', // used later ot identify the DA record
      //simulatedResults: simulatedResults,
      seedName: seedName,
      results: {
        testRun: testRun,
        options: options,
        failed: false,
        systemFailure: false,
        testErrors: [],
        runError: null, // err
        agentAllocationError: false,
        projectSetup: projectSetup, // used for monitor in email details

        shouldRetry: false, // used for monitor
        alertErrors: [],    // used for monitor


        remoteExecutionResults: {
          //testIterations: null, // same as testExecution.testIterations but also send in answer
        } // key=machineId
      },
      //videoFileName: testDefinitionOptions.videoFileName,
      testProfiles: testDefinitionOptions.testProfiles,
      executionGroup: testDefinitionOptions.executionGroup,
      executionAgent: testDefinitionOptions.executionAgent,
      //blobFolderName: testRun.project + '-' + testRun._id.toString(),
      blobFolderName: (config.storageService.default === 'gcs' ? 'gcs/' : '') + testRun._id.toString(),
      log: log,

      //validate: validateTestData,
      schedule: schedule,
      getRunGroup: getRunGroup, // function(executionInfo, machineFSM, concurrentIndex)
      createMachine: simulatedResults || options.stub ? createStubMachine : createMachine,
      createAgent: simulatedResults ? nullMethod : createAgent,
      pingAgent: simulatedResults ? nullMethod : pingAgent, // function(executionInfo, machineId) {
      prepareGroupIteration: prepareGroupIteration, // function(executionInfo, machineId, machineFSM) {
      resetTest: resetTest,
      runTest: runTestIteration, // function(executionInfo, machineFSM) {
      stopContainer: simulatedResults ? nullMethod : stopContainer, // function (executionInfo, machineId) {
      testCompleted: isRemoteExecution ? remoteTestCompleted : testCompleted, // function(executionInfo)
      progressReport: isRemoteExecution ? sendRemoteProgressReport : progressReport, // function(executionInfo, status)
      loadRemoteExecution: loadRemoteExecution,
      notifyReady: notifyReady,
      startRemoteExecution: startRemoteExecution,
      loadAndStartRemoteExecution: loadAndStartRemoteExecution,
      currentHost: testDefinitionOptions.host,

      timeouts: { // for testing
        schedule: 10 * 60 * 1000, // wait to get list of machines + create DA can take time
        createMachine: 120000,
        createAgent: 180000, // was 30000 was not enogh in some cases https://staging.testrtc.com/app/testLogs/56cbee58d841c21000510fdc
        pingAgent: 10000,
        // more time for monitors to retry
        runTest: options.stub ? 10000 : (options.timeout || (options.runMode === 'test' ? defaultTestTimeout : defaultTestTimeout * 1.2)) * 60 * 1000,
        stopContainer: 60 * 1000,
        retryPause: config.env === 'test' ? 1 : 2500,
        loadRemoteExecution: options.stub ? 20000 : 500000, // on very large test 200000 is not enough
        runRemoteExecution: options.stub ? 20000 : 120000,
      }
    };

    if (!testExecutionInfo.testProfiles || testExecutionInfo.testProfiles.length < 1) {
      testExecutionInfo.testProfiles = [{
        browser: 'linux-chrome-stable',
        location: 'any',
        network: 'No throttling',
        condition: 'all'
      }]
    }

    if (!options.notificationsOff && messaging) {
      messaging.send('testrun.status', { id: testRun.id, status: 'started' }, { projectId: testRun.project });
    }

    let testFSM = new TestFSM.TestFSM(testExecutionInfo);
    testExecutionInfo.testRun2 = new testRun2.TestRun(testExecutionInfo, testFSM);

    options.hasVideo = _.find(testDefinitionOptions.testProfiles, function(testProfile) {
      let media = testExecutionInfo.testRun2.getMediaObject(testProfile);
      if (!media) {
        return false; // will catch in validation later, throw new Error(util.format('Failed to find media [%s]', JSON.stringify(testProfile)));
      }
      return media.video;
    });

    setRegisterTestRun(seedName, testExecutionInfo);
    co(testExecutionInfo.testRun2.validate())
      .then(function() {
        // can now save testRun and resolve the async promise so UI can start show test progress
        if (testDefinitionOptions.asyncPromise) {
          return saveTestRun(testRun);
        }
      })
      .then(function(testRun) {
        if (testDefinitionOptions.asyncPromise) {
          testDefinitionOptions.asyncPromise.resolve(testRun);
          testDefinitionOptions.asyncPromise = null;
        }
      })
      .then(function() {
        return testExecutionInfo.testRun2.writeHeapSnapshot('start');
      })
      .then(function() {
        return testFSM.run();
      })
      .then(function(answer) {
        log.notice(`after testFSM.run | 1989 line testRun.js}`);
        deferred.resolve(answer);
      })
      .catch(function(err) {
        // validation failed, return the error to the UI
        if (testDefinitionOptions.asyncPromise) {
          testDefinitionOptions.asyncPromise.reject(err);
          testDefinitionOptions.asyncPromise = null;
        }

        log.notice(`before reject | 1999 line testRun.js | err: ${err}`);
        deferred.reject(err);
      });
  } catch (err) {
    globalLogger.error('executeTest', err.stack);
    log.notice(`executeTest error: ${err}`);
    deferred.reject(err);
  }

  return deferred.promise;
}

var _registerTestRun = {};
function registerTestRun(runName) {
  //console.log('registerTestRun', runName);
  _registerTestRun[runName] = {
    time: new Date()
  }
}

var dumpRegisterTestRun = function(timesAgoMinutes) {
  var cutTime = new Date();
  cutTime.setMinutes(cutTime.getMinutes() - timesAgoMinutes);

  var toDelete = [];
  _.each(_registerTestRun, function(value, key) {
    if (value.time < cutTime) {
      var dumpId = key;

      var log = value.info.log;
      var transport = log.transports['memory'];

      reportCriticalError(
        'dumpRegisterTestRun found staled test',
        dumpId,
        {
          errorOutput: transport.errorOutput,
          writeOutput: transport.writeOutput
        },
        1);

      toDelete.push(key);
    }
  });

  _.each(toDelete, function(key) {
    delete _registerTestRun[key];
  });
};

function setRegisterTestRun(runName, testExecutionInfo) {
  if (_registerTestRun[runName]) {
    //console.log('setRegisterTestRun', runName);
    _registerTestRun[runName].info = testExecutionInfo;
  }
}

function unRegisterTestRun(runName) {
  //console.log('unRegisterTestRun', runName);
  delete _registerTestRun[runName];
}

var syncRun = function(testRun, configDataMain, projectSetup, testDefinitionOptions, options) {
  console.log(`inside syncRun`);
  var deferred = Q.defer();

  var runName = testRun.runName;
  registerTestRun(runName);
  executeTest(testDefinitionOptions, testRun, options, configDataMain, projectSetup)
    .then(function (result) {
      console.log(`executeTest resolved promise, result: ${result}`);
      //console.log(result);
      deferred.resolve(result);
      unRegisterTestRun(runName);
    })
    .catch(function (err) {
      globalLogger.error('Failed to run concurrent', err);
      deferred.reject(err);
      unRegisterTestRun(runName);
    });

  return deferred.promise;
};

var run = function(testDefinition, addOptions, overrideTestParameters, overrideMachineProfiles) {
  function callExecuteTest (testRun, configDataMain, projectSetup) {
    if (options.syncRun) {
      let runName = testRun.runName;
      registerTestRun(runName);
      executeTest(testDefinitionOptions, testRun, options, configDataMain, projectSetup)
        .then(function(result) {
          deferred.resolve(result);
          unRegisterTestRun(runName);
        })
        .catch(function(err) {
          globalLogger.error('Failed to run concurrent', err);
          deferred.reject(err);
          unRegisterTestRun(runName);
        })
    } else {
      //deferred.resolve(testRun);
      executeTest(testDefinitionOptions, testRun, options, configDataMain, projectSetup);
    }
  }

  var deferred = Q.defer();

  var now = new Date();

  var options = parseOptionsString(testDefinition.runOptions);
  if (addOptions) {
    options = _.merge(options, addOptions);
  }
  options.runMode = options.runMode || 'test';
  options.executionAgent = null; //{ name: 'main' };
  //options.hasAudio = !!testDefinition.audioFileName;
  //options.hasVideo = !!testDefinition.videoFileName;
  options.serviceUrl = testDefinition.serviceUrl;

  var testDefinitionOptions = {
    //videoFileName: testDefinition.videoFileName,
    testProfiles: overrideMachineProfiles || testDefinition.testProfiles,
    testParameters: overrideTestParameters || testDefinition._doc.parameters,
    asyncPromise: (options.runMode === 'monitor' || options.syncRun) ? null : deferred, // we still have async work to do, validation before we start the UI progres
    host: testDefinition.host
  };

  var configDataMain;
  var projectSetup;
  Project.getProjectSetup(testDefinition.project, addOptions)
    .then(function(_projectSetup) { // for now it is just user
      projectSetup = _projectSetup;
      if (!options.errAnalyzeOptions) {
        var testProfile = projectSetup.testProfile || {};
        options.errAnalyzeOptions = testProfile.alarm || {};
      }

      configDataMain = projectSetup.configData;
      var status = 'started';
      var testRun = new TestRun({
        testId: testDefinition._id,
        name: testDefinition.name,
        test_run_sort: testDefinition.name ? testDefinition.name.toLowerCase() : null,
        runName: nameGenerator.choose(),
        runMode: options.runMode,
        monitorName: options.monitorName,
        monitor_name_sort: options.monitorName ? options.monitorName.toLowerCase() : null,
        monitorId: options.monitorId ? options.monitorId.toString() : null,
        runOptions: testDefinition.runOptions,
        project: _projectSetup.projectId,
        userName: _projectSetup.userName,
        status: status,
        statusId: utils.getStatusId(status),
        stared: false,
        createDate: now,
        lastUpdate: now,
        runDelay: options.monitorScheduleStart ? now.getTime() - options.monitorScheduleStart : 0,
        endDate: null,
        testScript: testDefinition.testScript,
        parameters: testDefinition._doc.parameters,
        systemInUse: process.env.SYSTEM_NAME || 'unknown'
      });

      //Create Test_run record

      /*
      if (options.runMode === 'monitor') {
        return testRun; // save only in the end
      } else {
        return saveTestRun(testRun);
      }
      */

      try {
        callExecuteTest(testRun, configDataMain, projectSetup);
      } catch (err) {
        globalLogger.error('Failed to run test', err.stack);
      }
    })
    .catch(function(err) {
      globalLogger.error('Failed to get project setup', {err: err.stack, testDefinition: testDefinition._id, project: testDefinition.project});
      deferred.reject(err);
    });
  return deferred.promise;
};


var completeRemoteTest = function(testRun, getStat, sysInfo, ip) {
  var deferred = Q.defer();
  var now = new Date();
  TestIteration.findOne({ _id: testRun._id }).then(function(testIteration) {
    var status = 'completed';
    // TODO: should check this place as always get Spain location
    var foundLocation = geoip.lookup(ip);
    var browserName = (sysInfo && sysInfo.broserName) || undefined;
    var browserVersion = (sysInfo && sysInfo.browserVersion) || undefined;
    var OS = (sysInfo && sysInfo.OS) || undefined;
    testIteration.status = status;
    testIteration.testDuration = now.getTime() - (new Date(testIteration.createDate)).getTime();
    testIteration.browser = `${browserName}:${browserVersion}`;
    testIteration.os = OS;
    if (foundLocation && foundLocation.name && foundLocation.code) {
      testIteration.location = `${foundLocation.name}:${foundLocation.code}`;
    }
    testResult.analyzeGetStat(testIteration, getStat);

    testIteration.save().then(function() {
      testRun.status = status;
      testRun.statusId = utils.getStatusId(status);
      testRun.save().then(deferred.resolve).catch(deferred.reject);
    }).catch(function (error) {
      deferred.reject(error)
    });
  }).catch(deferred.reject);

  return deferred.promise;
};

exports.run = run;
exports.completeRemoteTest = completeRemoteTest;
exports.analyzeTestResults = analyzeTestResults;
exports.dumpRegisterTestRun = dumpRegisterTestRun;
exports.syncRun = syncRun;
exports.prepareStatusForIteration = prepareStatusForIteration;
