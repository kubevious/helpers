const should = require('should');
const _ = require('the-lodash');
const Promise = require('the-promise');
const logger = require('the-logger').setup('test', { pretty: true });
const RetryableAction = require('../').RetryableAction;

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
            return Promise.timeout(20)
                .then(() => 444)
        });
        
        return action.run()
            .then(result => {
                should(result).be.equal(444);
            })
    });

    it('fail-then-recover', function() {
        let errorCount = 1;
        const action = new RetryableAction(logger, () => {
            if (errorCount > 0) {
                errorCount--;
                throw new Error("I failed")
            }
            return Promise.timeout(20)
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
            return Promise.timeout(20)
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
            return Promise.timeout(20)
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
