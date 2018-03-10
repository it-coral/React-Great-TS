"use strict";

import * as _ from 'lodash';

interface ITarget {
  audio: { 
    send: { [propName: string]: number[] },
    recv: { [propName: string]: number[] }
  };

  video: {
    send: { [propName: string]: number[] },
    recv: { [propName: string]: number[] }
  };

  data?: {
    send: { [propName: string]: number[] },
    recv: { [propName: string]: number[] }
  };
}

const allowedProps = [
  'bits', 'jitter', 'loss', 'packets', 'videoBandwidthLimitedResolution',
  'videoCpuLimitedResolution', 'videoDelay', 'videoFrameRate'
]

function reducer(accumulator: any, iteration: any, key: any): any {
  // use vars to make it faster
  // get property names for checking either it's send or recieve
  for (var iter in iteration) {
    if (iteration.hasOwnProperty(iter)) {
      // getting data arrays
      for (var prop in iteration[iter]) {
        if (!~allowedProps.indexOf(prop)) {
          break;
        }
        
        if (iteration[iter].hasOwnProperty(prop)) {
          // here is checking either it is send or recieve
          if (!!~iter.indexOf('send')) {
            let type = iteration[iter].type;
            // iteration[iter] is like ssrc_2121380820_recv
            // prop is like bits, jitter etc
            if (accumulator[type].send[prop].length >= iteration[iter][prop].length) {
              // if one array bigger then another
              // then we choose first array as base 
              // another as source from which we will get
              // element to sum

              var arrayIdx, iterLen = iteration[iter][prop].length;
              for (arrayIdx = 0; arrayIdx < iterLen; arrayIdx++) {
                // for iteration we choose shorter array
                // to reduce assing operations
                // iteration[iter][prop][arrayIdx] = +accumulator.send[prop][arrayIdx];
                accumulator[type].send[prop][arrayIdx] += +iteration[iter][prop][arrayIdx];
              }
            } else {
              let type = iteration[iter].type;
              var arrayIdx, iterLen = accumulator[type].send[prop].length;
              for (arrayIdx = 0; arrayIdx < iterLen; arrayIdx++) {
                // for iteration we choose shorter array
                // to reduce assing operations
                iteration[iter][prop][arrayIdx] += +accumulator[type].send[prop][arrayIdx];
              }

              // in case accumulator prop was shorter we swipe it back
              // slice for getting rid of malformation by fererence
              accumulator[type].send[prop] = iteration[iter][prop].slice(0);
            }
          } else {
            let type = iteration[iter].type;
            if (accumulator[type]) {
              if (accumulator[type].recv[prop].length >= iteration[iter][prop].length) {
                var arrayIdx, iterLen = iteration[iter][prop].length;
                for (arrayIdx = 0; arrayIdx < iterLen; arrayIdx++) {
                  accumulator[type].recv[prop][arrayIdx] += +iteration[iter][prop][arrayIdx];
                }
              } else {
                var arrayIdx, iterLen = accumulator[type].recv[prop].length;
                for (arrayIdx = 0; arrayIdx < iterLen; arrayIdx++) {
                  iteration[iter][prop][arrayIdx] += +accumulator[type].recv[prop][arrayIdx];
                }

                accumulator[type].recv[prop] = iteration[iter][prop].slice(0);
              }
            }
          }
        }
      }
    }
  }

  return accumulator;
}

export function calcAudioAndVideoSum(chartsData: any): any {
  let accum = {
    audio: {
      send: {
        bits: 0, jitter: 0, loss: 0, packets: 0, videoBandwidthLimitedResolution: 0,
        videoCpuLimitedResolution: 0, videoDelay: 0, videoFrameRate: 0
      },
      recv: {
        bits: 0, jitter: 0, loss: 0, packets: 0, videoBandwidthLimitedResolution: 0,
        videoCpuLimitedResolution: 0, videoDelay: 0, videoFrameRate: 0
      }
    },
    video: {
      send: {
        bits: 0, jitter: 0, loss: 0, packets: 0, videoBandwidthLimitedResolution: 0,
        videoCpuLimitedResolution: 0, videoDelay: 0, videoFrameRate: 0
      },
      recv: {
        bits: 0, jitter: 0, loss: 0, packets: 0, videoBandwidthLimitedResolution: 0,
        videoCpuLimitedResolution: 0, videoDelay: 0, videoFrameRate: 0
      }
    },
    data: {
      send: {
        bits: 0, jitter: 0, loss: 0, packets: 0, videoBandwidthLimitedResolution: 0,
        videoCpuLimitedResolution: 0, videoDelay: 0, videoFrameRate: 0
      },
      recv: {
        bits: 0, jitter: 0, loss: 0, packets: 0, videoBandwidthLimitedResolution: 0,
        videoCpuLimitedResolution: 0, videoDelay: 0, videoFrameRate: 0
      }
    }
  };

  let summed = _.reduce(chartsData, reducer, accum);

  return summed;
}

// calculates average
export function calcFilterOptions(chart: any, iterations: number): ITarget {
  const chartTypes: string[] = ['bits', 'packets', 'jitter', 'loss'];

  const res: ITarget = {
    audio: { 
      send: { bits: [], jitter: [], loss: [], packets: [] },
      recv: { bits: [], jitter: [], loss: [], packets: [] }
    },
    video: { 
      send: { bits: [], jitter: [], loss: [], packets: [] },
      recv: { bits: [], jitter: [], loss: [], packets: [] }
    },
    data: { 
      send: { bits: [], jitter: [], loss: [], packets: [] },
      recv: { bits: [], jitter: [], loss: [], packets: [] }
    }
  };

  const counters: any = {
    audio: { 
      send: 0,
      recv: 0
    },
    video: { 
      send: 0,
      recv: 0
    },
    data: { 
      send: 0,
      recv: 0
    }
  };

  const getAvg: (tRef: any, resRef: ITarget, iterCount: number) => void =
  (tRef: any, resRef: ITarget, iterCount: number): void => {
    var len = tRef.length;

    for (var idx = 0; idx < len; idx++) {
      // get average value, may be float
      resRef[idx] = tRef[idx] / iterCount;
    }
  };

  // get number of channels with dir property
  const getChannelsWithDirection: (counters: any, iterations: any) => void = 
  (counters: any, iterations: any) => {
    // PROPOSE: implement data in future
    for (let iter of iterations) {
      for (let direction of ['send', 'recv']) {
        for (let media of ['audio', 'video']) {

          // go through channels
          for (let channel in iter.stat.channels) {
            const chlRef = iter.stat.channels[channel];
            if (chlRef.media === media && chlRef.direction === direction && 
                chlRef.totalBytes > 2048) {
              counters[media][direction] += 1;
            }
          }
        }
      }
    }
  };

  getChannelsWithDirection(counters, iterations);

  for (var media in chart) {
    for (var direction in chart[media]) {
      for (var type of chartTypes) {
        // travers obj to get avg
        var targetRef: any = chart[media][direction][type];
        var resRef: any = res[media][direction][type];

        if (targetRef.length > 0) {
          getAvg(targetRef, resRef, counters[media][direction]);
        }
      }
    }
  }

  return res;
}

// we should traverse array of iterations
// each has channels which have props and inside 
//  an array with needed value per second
// INFO: length of arrays differ between channels
export function getMinMaxBand(iterations: any, maxSeconds: any): any {
  const types: string[] = ['bits', 'jitter', 'loss', 'packets'];
  let res: any = {
    audio: { 
      send: { 
        bits: { max: [], min: [] }, jitter: { max: [], min: [] }, 
        loss: { max: [], min: [] }, packets: { max: [], min: [] } 
      },
      recv: { 
        bits: { max: [], min: [] }, jitter: { max: [], min: [] }, 
        loss: { max: [], min: [] }, packets: { max: [], min: [] }
      }
    },
    video: { 
      send: { 
        bits: { max: [], min: [] }, jitter: { max: [], min: [] }, 
        loss: { max: [], min: [] }, packets: { max: [], min: [] } 
      },
      recv: { 
        bits: { max: [], min: [] }, jitter: { max: [], min: [] }, 
        loss: { max: [], min: [] }, packets: { max: [], min: [] }
      }
    },
    data: {
      send: { 
        bits: { max: [], min: [] }, jitter: { max: [], min: [] }, 
        loss: { max: [], min: [] }, packets: { max: [], min: [] } 
      },
      recv: { 
        bits: { max: [], min: [] }, jitter: { max: [], min: [] }, 
        loss: { max: [], min: [] }, packets: { max: [], min: [] }
      }
    }
  };

  const addZeroes = function (arr: any[], secs: number): void {
    for (let idx = 0; idx < secs; idx++) {
      arr.push(0);
    }
  };

  for (let iter of iterations) { //each document in the array
    for (let cnl in iter) {
      if (iter.hasOwnProperty(cnl)) { // bits, jitter etc.
        let [direction, media] = [iter[cnl].direction, iter[cnl].type];
        for (let type in iter[cnl]) {
          if (~types.indexOf(type)) {
            let ref = maxSeconds[media][direction][type];
            let value = iter[cnl][type];
            let secs = ref.length - value.length;
            addZeroes(value, secs);
          }
        }
      }
    }
  }

  for (let iter of iterations) { //each document in the array
    for (let cnl in iter) {
      if (iter.hasOwnProperty(cnl)) { // bits, jitter etc.
        let [direction, media] = [iter[cnl].direction, iter[cnl].type];
        for (let type in iter[cnl]) {
          if (~types.indexOf(type)) {
            let ref = res[media][direction][type];
            let value = iter[cnl][type];
            for (let sec = 0; sec < value.length; sec++)  {
              // for max
              if (ref.max[sec] !== undefined && ref.max[sec] >= 0) {
                if (ref.max[sec] < value[sec]) {
                  ref.max[sec] = value[sec];
                }
              } else {
                ref.max[sec] = value[sec];
              }

              // for min
              if (ref.min[sec] !== undefined && ref.min[sec] >= 0) {
                if (ref.min[sec] > value[sec]) {
                  ref.min[sec] = value[sec];
                }
              } else {
                ref.min[sec] = value[sec];
              }
            }
          }
        }
      }
    }
  }

  return res;
}

export function calcProbs(iterations: any): ITarget {
  let regex = /.*-(\d*)$/;
  let fltrOptions: string[] = ['average'];

  let chartTypes: string[] = ['bytes', 'packets', 'jitter', 'packetLoss'];

  // prepare base object
  let sampleObj: ITarget = {
    audio: { send: {}, recv: {} },
    video: { send: {}, recv: {} },
    data: { send: {}, recv: {} }
  };

  iterations = iterations.filter( iter => !!iter.stat );

  for (let iter in iterations) {
    for (let type of chartTypes) {
      for (let cnl in iterations[iter].stat.channels) {
        if (iterations[iter].stat.channels.hasOwnProperty(cnl)) {
          let cnlRef = iterations[iter].stat.channels[cnl];
          let objRef = sampleObj[cnlRef.media][cnlRef.direction];
          if (!Array.isArray(objRef[type])) {
            objRef[type] = [];
          }

          // if this already exists
          if (objRef[type][iter]) {
            // if this is special case for packetLoss
            if (type === 'packetLoss') {
              // choose max value if possible
              let toCompare = _.isNumber(+cnlRef[type]) ? cnlRef[type] : cnlRef[type].average;
              // it always has to be a number
              let current = +objRef[type][iter].value;

              if (current < toCompare) {
                const _pi = regex.exec(iterations[iter].machine) ? regex.exec(iterations[iter].machine)[1] : null;
                objRef[type][iter] = {
                  value: toCompare,
                  probeId: _pi
                };
              }
            }
          } else {
            // no it's new array element
            // just add first value
            const _pi = regex.exec(iterations[iter].machine) ? regex.exec(iterations[iter].machine) : null;
            if (type === 'packetLoss') {
              objRef[type][iter] = {
                value: cnlRef[type] ? cnlRef[type].average || cnlRef[type] : 0,
                probeId: _pi
              };
            } else {
              objRef[type][iter] = {
                value: cnlRef[type] ? cnlRef[type] : 0,
                probeId: _pi
              };
            }
          }
        }
      }
    }
  }

  for (let media in sampleObj) {
    for (let direction in sampleObj[media]) {
      for (let type of chartTypes) {
        if (sampleObj[media][direction][type]) {
          sampleObj[media][direction][type].sort( (a, b) => {
            let prev = _.isNumber(a.value) ? a.value : a.value.average;
            let current = _.isNumber(b.value) ? b.value : b.value.average;
            return prev - current;
          });
        } else {
          sampleObj[media][direction][type] = [];
        }
      }      
    }
  }

  return sampleObj;
}
