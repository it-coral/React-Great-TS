'use strict';

import * as util from 'util';
import * as errors from '../../utils/errors';

export class AsyncTimeoutExec {
    log: any;
    terminated = false;

    constructor(log: any) {
        this.log = log;
    }

    async pause(timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(function() {
                resolve();
            }, timeout);
        });
    }

    async delay(opname, timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(function() {
                reject(new Error('Timeout'));
            }, timeout);
        });
    }

    elapsedTime(start: any): string {
        let t = process.hrtime(start);
        let elapsed = Math.round(t[1] / 1000000); // divide by a million to get nano to milli
        return t[0] + '.' + elapsed;
    }

    async exec(opname: string, timeout: number, promise: Promise<any>) {
        let start = process.hrtime();

        this.log.debug(util.format('EXEC %s (t:%s)', opname, timeout/1000));
        return new Promise((resolve, reject) => {
            Promise.race([promise, this.delay(opname, timeout)])
            .then((answer) => {
                if (this.terminated) {
                    this.log.notice(util.format('EXEC %s Terminated at %s sec', opname, this.elapsedTime(start)));
                    reject(new Error(util.format('EXEC %s Terminated', opname)));
                } else {
                    this.log.debug(util.format('EXEC %s Completed at %s sec', opname, this.elapsedTime(start)));
                    resolve(answer);
                }
            })
            .catch((err) => {
                if (err instanceof errors.ValidationError) {
                    //Don't add anything to the error so we show the error message as isd
                    this.log.info(util.format('EXEC %s terminated with %s after %s sec', opname, err.message, this.elapsedTime(start)));
                } else {
                    this.log.error(util.format('EXEC %s terminated with %s after %s sec', opname, err.message, this.elapsedTime(start)));
                    let msg = '%s terminated with %s';
                    if (err.message.indexOf('terminated with') >= 0) { // recursive error text
                        msg = '%s->%s';
                    }
                    err.message = util.format(msg, opname, err.message);
                }
                reject(err);
            })

        })
    }

    async settleAll(promises: Promise<any>[]) {
        let firstError = null;

        let results = await Promise.all(promises.map((promise: Promise<any>) => {
            return promise.then(
                (value) => null,
                (error) => {
                    if (!firstError) {
                        firstError = error;
                    }

                    return error;
                });
        }));

        if (firstError) {
            throw firstError;
        }
    }
}