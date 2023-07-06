import 'mocha';
import should from 'should';

import _ from 'the-lodash';
import { setupLogger, LoggerOptions } from 'the-logger';

const loggerOptions = new LoggerOptions().enableFile(false).pretty(true);
const logger = setupLogger('test', loggerOptions);

import { EventDampener } from '../src';
import { MyPromise } from 'the-promise';

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

            return MyPromise.delay(10 * 1000)
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

        return MyPromise.delay(1000)
            .then(() => {
                should(triggerCount).be.equal(0);
                return MyPromise.delay(10 * 1000);
            })
            .then(() => {
                should(triggerCount).be.equal(1);
                logger.info("Trigger. 4");
                dampener.trigger();
                return MyPromise.delay(1 * 1000);
            })
            .then(() => {
                logger.info("Trigger. 5");
                dampener.trigger();
            })
            .then(() => {
                return MyPromise.delay(15 * 1000);
            })
            .then(() => {
                logger.info("Everything should be finished by now.");
                should(triggerCount).be.equal(2);
                should(foundParallelProcessing).be.false();
            })
            
    })
    .timeout(60 * 1000);

});
