const should = require('should');
const _ = require('the-lodash');
const Promise = require('the-promise');
const ProcessingTracker = require('../lib/processing-tracker');

const logger = require('the-logger').setup('test', { pretty: true }).sublogger('Tracker');

describe('processing-tracker', function() {

    it('test-1', function() {
        var processingTracker = new ProcessingTracker(logger);

        return processingTracker.scope("doSomething", () => {
            return Promise.timeout(200);
        })
        .then(() => {
            {
                var task = processingTracker.getTaskInfo("doSomething");
                should(task.failed).not.be.true();
                (task.duration).should.not.be.above(400);
                (task.duration).should.not.be.below(200);
            }
        })
    });

    it('test-2', function() {
        var processingTracker = new ProcessingTracker(logger);

        return processingTracker.scope("doSomething", (doSomethingScope) => {
            return Promise.timeout(100)
                .then(() => doSomethingScope.scope("another", () => {
                    return Promise.timeout(300);
                }));
        })
        .then(() => {
            {
                var task = processingTracker.getTaskInfo("doSomething");
                should(task.failed).not.be.true();
                (task.duration).should.not.be.above(700);
                (task.duration).should.not.be.below(400);
            }

            {
                var task = processingTracker.getTaskInfo("doSomething/another");
                should(task.failed).not.be.true();
                (task.duration).should.not.be.above(400);
                (task.duration).should.not.be.below(300);
            }
        })
    });


    it('test-3', function() {
        var processingTracker = new ProcessingTracker(logger);

        return processingTracker.scope("doSomething", () => {
            return Promise.timeout(100)
                .then(() => { throw new Error("FAILED!!!") })
        })
        .then(() => {
            should.fail("SHOULD HAVE BEEN FAILED")
        })
        .catch(reason => {
            {
                var task = processingTracker.getTaskInfo("doSomething");
                (task.failed).should.be.true();
                (task.duration).should.not.be.above(300);
                (task.duration).should.not.be.below(100);
            }
        })
    });


    it('test-3', function() {
        var processingTracker = new ProcessingTracker(logger);
        processingTracker.enablePeriodicDebugOutput(1);
        processingTracker.disablePeriodicDebugOutput();
    });
});