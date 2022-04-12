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

        dampener.acceptJob("aaa"); // will be skipped
        dampener.acceptJob("bbb"); // will be skipped
        dampener.acceptJob("ccc"); // will be skipped
        dampener.acceptJob("ddd");

        should(dampener.isBusy).be.true();

        return Promise.timeout(500)
            .then(() => {
                should(processedData.length).be.equal(1);
                should(processedData).be.eql(['ddd']);
            })
            .then(() => {
                should(dampener.isBusy).be.false();
                dampener.acceptJob("eee");
                dampener.acceptJob("fff");
                return Promise.timeout(500)
            })
            .then(() => {
                should(processedData).be.eql(['ddd', 'fff']);
                should(dampener.isBusy).be.false();
            })

            
    })
    .timeout(60 * 1000);

    it('monitor', function() {

        const processedData: string[] = [];

        const handler = (data: string) => {
            logger.info("[JOB DAMPENER] %s", data);
            processedData.push(data);
        }

        const dampener = new JobDampener(logger, handler,  {

            stateMonitorCb: (state) => {
                logger.info("[TOTAL JOBS LEFT] %s", state.totalJobs);
            }
        });

        should(dampener.isBusy).be.false();

        dampener.acceptJob("aaa"); // will be skipped
        dampener.acceptJob("bbb"); // will be skipped
        dampener.acceptJob("ccc"); 

        should(dampener.isBusy).be.true();

        return Promise.timeout(500)
            .then(() => {
                should(processedData.length).be.equal(1);
                should(processedData).be.eql(['ccc']);
            })
            .then(() => {
                should(dampener.isBusy).be.false();
                dampener.acceptJob("eee");
                dampener.acceptJob("fff");
                return Promise.timeout(500)
            })
            .then(() => {
                should(processedData).be.eql(['ccc', 'fff']);
                should(dampener.isBusy).be.false();
            })

            
    })
    .timeout(60 * 1000);

});
