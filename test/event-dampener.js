const should = require('should');
const _ = require('the-lodash');
const Promise = require('the-promise');
const logger = require('the-logger').setup('test', { pretty: true });
const EventDampener = require('../').EventDampener;

describe('event-dampener', function() {

    it('case-01', function() {
        const dampener = new EventDampener(logger, {
            dampenMs: 2000
        });

        let triggerCount = 0;
        let currentlyProcessing = 0;
        let foundParallelProcessing = false;

        logger.info("Subscribe.");
        dampener.on(() => {
            logger.info("Processing started (will take 10 seconds)...");
            triggerCount ++;
            currentlyProcessing ++;

            if (currentlyProcessing > 1)
            {
                foundParallelProcessing = true;
            }

            return Promise.timeout(10 * 1000)
                .then(() => {
                    currentlyProcessing --;
                    logger.info("    Processing completed.");
                });
        })

        logger.info("Trigger. 1");
        dampener.trigger();
        logger.info("Trigger. 2");
        dampener.trigger();
        logger.info("Trigger. 3");
        dampener.trigger();

        return Promise.timeout(1000)
            .then(() => {
                should(triggerCount).be.equal(0);
                return Promise.timeout(10 * 1000);
            })
            .then(() => {
                should(triggerCount).be.equal(1);
                logger.info("Trigger. 4");
                dampener.trigger();
                return Promise.timeout(1 * 1000);
            })
            .then(() => {
                logger.info("Trigger. 5");
                dampener.trigger();
            })
            .then(() => {
                return Promise.timeout(15 * 1000);
            })
            .then(() => {
                logger.info("Everything should be finished by now.");
                should(triggerCount).be.equal(2);
                should(foundParallelProcessing).be.false();
            })
            
    })
    .timeout(60 * 1000);

});
