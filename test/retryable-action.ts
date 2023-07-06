import 'mocha';
import should from 'should';

import _ from 'the-lodash';
import { setupLogger, LoggerOptions } from 'the-logger';

const loggerOptions = new LoggerOptions().enableFile(false).pretty(true);
const logger = setupLogger('test', loggerOptions);

import { RetryableAction } from '../src/retryable-action';
import { MyPromise } from 'the-promise';

describe('retryable-action', function() {

    it('case-01', function() {
        const action = new RetryableAction(logger, () => {
            return 123
        });
        
        return action.run()
            .then(result => {
                should(result).be.equal(123);

            })
    });

    it('case-02', function() {
        const action = new RetryableAction(logger, () => {
            return MyPromise.delay(20)
                .then(() => 444)
        });
        
        return action.run()
            .then(result => {
                should(result!).be.equal(444);
            })
    });

    it('fail-then-recover', function() {
        let errorCount = 1;
        const action = new RetryableAction(logger, () => {
            if (errorCount > 0) {
                errorCount--;
                throw new Error("I failed")
            }
            return MyPromise.delay(20)
                .then(() => 555)
        }, {
            initalDelay: 100,
            maxDelay: 2000,
            retryCount: 3
        });
        
        return action.run()
            .then(result => {
                should(result).be.equal(555);
            })
    })
    .timeout(10 * 1000);

    it('fail', function() {
        let errorCount = 5;
        const action = new RetryableAction(logger, () => {
            if (errorCount > 0) {
                errorCount--;
                throw new Error("I failed")
            }
            return MyPromise.delay(20)
                .then(() => 555)
        }, {
            initalDelay: 100,
            maxDelay: 2000,
            retryCount: 4
        });
        
        let isFailed = false;
        return action.run()
            .catch(reason => {
                isFailed = true;
            })
            .then(result => {
                should(isFailed).be.true();
            })
    })
    .timeout(10 * 1000);

    it('fail-non-retryable', function() {
        let errorCount = 1;
        const action = new RetryableAction(logger, () => {
            if (errorCount > 0) {
                errorCount--;
                throw new Error("I failed")
            }
            return MyPromise.delay(20)
                .then(() => 555)
        }, {
            initalDelay: 100,
            maxDelay: 2000,
            retryCount: 4
        });

        action.canRetry(reason => {
            return false;
        })
        
        let isFailed = false;
        return action.run()
            .catch(reason => {
                isFailed = true;
            })
            .then(result => {
                should(isFailed).be.true();
            })
    })
    .timeout(10 * 1000);

});
