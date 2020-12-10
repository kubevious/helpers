import 'mocha';
import should = require('should');

import _ from 'the-lodash';
import { Promise } from 'the-promise';

import { StopWatch } from '../src/stopwatch';

describe('stopwatch', function() {

    it('test-1', function() {
        var stopwatch = new StopWatch();
        return Promise.timeout(200)
            .then(() => {
                var ms = stopwatch.stop();
                should(ms).not.be.above(400);
                should(ms).not.be.below(150);

                should(stopwatch.durationMs).be.equal(ms);
            })
    });

});