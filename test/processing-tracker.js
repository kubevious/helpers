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
                should(task.failed).be.false();
                (task.duration).should.be.below(400);
                (task.duration).should.be.above(150);
            }

            processingTracker.debugOutput();
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
                (task.duration).should.be.below(700);
                (task.duration).should.be.above(350);
            }

            {
                var task = processingTracker.getTaskInfo("doSomething/another");
                should(task.failed).not.be.true();
                (task.duration).should.be.below(400);
                (task.duration).should.be.above(250);
            }

            processingTracker.debugOutput();
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
                (task.duration).should.not.be.below(50);
            }
        })
        .then(() => {
            processingTracker.debugOutput();
        })
    });

    it('test-4', function() {
        var processingTracker = new ProcessingTracker(logger);

        return processingTracker.scope("doSomething", () => {
            return Promise.timeout(100)
                .then(() => 1234)
        })
        .then(result => { 
            (result).should.be.equal(1234);
        })
        .then(() => {
            processingTracker.debugOutput();
        })
        .then(() => {
            const data = processingTracker.extract();
            logger.info('EXTRACTED DATA', data);
        })
    });


    it('test-5', function() {
        var processingTracker = new ProcessingTracker(logger);

        let myExtractedData = null;

        processingTracker.registerListener(extractedData => {
            myExtractedData = extractedData;
            
        })

        return processingTracker.scope("doSomething", (childTracker) => {

            return Promise.serial([1, 2, 3, 4], x => {
                return childTracker.scope("ITEM-" + x, () => {
                    return Promise.timeout(100)
                        .then(() => x + 1);
                })
            })
        })
        .then(result => { 
            (result).should.be.eql([2, 3, 4, 5]);
        })
        .then(() => {
            processingTracker.debugOutput();
        })
        .then(() => {
            logger.info('EXTRACTED DATA', myExtractedData);
            should(myExtractedData).be.an.Array();
        })
    });

    it('test-5', function() {
        var processingTracker = new ProcessingTracker(logger);

        return Promise.serial([1, 2, 3, 4, 5, 6, 7, 8], x => {
            return processingTracker.scope("doSomething", (childTracker) => {
                return Promise.timeout(x * 10);
            });
        })
        .then(() => {
            processingTracker.debugOutput();
        })
        .then(() => {
            const data = processingTracker.extract();
            logger.info('EXTRACTED DATA', data);
            should(data).be.an.Array();
            for(var x of data)
            {
                should(x).be.an.Object();
                should(x.name).be.equal("doSomething")
                should(x.results).be.an.Array();
                for(var r of x.results)
                {
                    should(r.duration).be.a.Number();
                    should(r.failed).be.false();
                }
            }
        })
    });


    it('test-debug-output', function() {
        var processingTracker = new ProcessingTracker(logger);
        processingTracker.enablePeriodicDebugOutput(1);
        processingTracker.disablePeriodicDebugOutput();
    });
});