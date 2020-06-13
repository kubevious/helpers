const should = require('should');
const _ = require('the-lodash');
const Promise = require('the-promise');
const StopWatch = require('../lib/stopwatch');

describe('stopwatch', function() {

    it('test-1', function() {
        var stopwatch = new StopWatch();
        return Promise.timeout(200)
            .then(() => {
                var ms = stopwatch.stop();
                (ms).should.not.be.above(400);
                (ms).should.not.be.below(150);

                (stopwatch.durationMs).should.be.equal(ms);
            })
    });

});