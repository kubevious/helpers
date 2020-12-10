import 'mocha';
import should = require('should');

import _ from 'the-lodash';

import { SeriesResampler } from '../src/history/series-resampler';

describe('series-resampler', function() {

    it('test-empty', function() {
        let resampler = new SeriesResampler(10);
        let result = resampler.process([]);
        should(result).be.an.Array();
        should(result.length).be.equal(0);
    });

    it('test-one', function() {
        let resampler = new SeriesResampler(10);
        let result = resampler.process([{ date: new Date() }]);
        should(result).be.an.Array();
        should(result.length).be.equal(1);
    });


    it('test-two', function() {
        let resampler = new SeriesResampler(10);
        let importData =  [
            {"date":"2020-10-07 22:08:50", "changes":7, "error":42, "warn":368},
            {"date":"2020-10-20 23:24:32", "changes":7, "error":54, "warn":367},
        ];
        let result = resampler.process(importData);
        should(result).be.an.Array();
        should(result.length).be.equal(2);
    });

    it('test-case-01', function() {
        let resampler = new SeriesResampler(10)
            .column("changes", _.max)
            .column("error", _.mean)
            ;

        let importData =  [
            {"date":new Date("2020-10-08T05:08:50.000Z"), "changes":7, "error":42, "warn":368},
            {"date":new Date("2020-10-14T14:09:51.000Z"), "changes":6, "error":54, "warn":370},
            {"date":new Date("2020-10-21T06:24:32.000Z"), "changes":7, "error":54, "warn":367},
        ];
        let result = resampler.process(importData);
        should(result).be.an.Array();
        should(result.length).be.equal(11);

        for(let p of result)
        {
            should(p).be.an.Object();
            should(p.date).be.a.ok();
            should(p.changes).be.a.Number();
            should(p.error).be.a.Number();
            should(p.warn).not.be.ok();
        }
        should(result[0].date.toISOString()).be.equal("2020-10-08T05:08:50.000Z");
        should(result[10].date.toISOString()).be.equal("2020-10-21T06:24:32.000Z");
    });


});