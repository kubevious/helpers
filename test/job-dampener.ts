import 'mocha';
import should = require('should');

import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { setupLogger, LoggerOptions } from 'the-logger';

const loggerOptions = new LoggerOptions().enableFile(false).pretty(true);
const logger = setupLogger('test', loggerOptions);

import { JobDampener } from '../src';

describe('job-dampener', function() {

    it('case-01', function() {

        const processedData: string[] = [];

        const handler = (data: string) => {
            logger.info("[JOB DAMPENER] %s", data);
            processedData.push(data);
        }

        const dampener = new JobDampener(logger, handler);

        should(dampener.isBusy).be.false();

        dampener.acceptJob("aaa");
        dampener.acceptJob("bbb"); // will be skipped
        dampener.acceptJob("ccc"); // will be skipped
        dampener.acceptJob("ddd");

        should(dampener.isBusy).be.true();

        return Promise.timeout(500)
            .then(() => {
                should(processedData.length).be.equal(2);
                should(processedData).be.eql(['aaa', 'ddd']);
            })
            .then(() => {
                should(dampener.isBusy).be.false();
                dampener.acceptJob("eee");
                dampener.acceptJob("fff");
                return Promise.timeout(500)
            })
            .then(() => {
                should(processedData).be.eql(['aaa', 'ddd', 'eee', 'fff']);
                should(processedData.length).be.equal(4);
                should(dampener.isBusy).be.false();
            })

            
    })
    .timeout(60 * 1000);

});
