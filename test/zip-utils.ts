import 'mocha';
import should = require('should');

import _ from 'the-lodash';

import { compressObj, decompressObj } from '../src/zip-utils';
import * as FileUtils from './utils/file-utils';

describe('zip-utils', function() {

    it('test-compress-1', function() {
        const data ={ foo: 'bar' };
        return compressObj(data)
            .then(compressedStr => {
                should(compressedStr).be.a.String();
                should(compressedStr).be.equal("q1ZKy89XslJKSixSqgUA");
            })
    });


    it('test-decompress-1', function() {
        const data = { foo: 'bar' };
        return compressObj(data)
            .then(compressedStr => {
                should(compressedStr).be.a.String();
                return decompressObj(compressedStr);
            })
            .then(newData => {
                should(newData).be.an.Object();
                should(newData).be.eql({ foo: 'bar' });
            })
    });


    it('test-compress-size', function() {
        const data = <any>FileUtils.readJsonData('sample-obj.json');
        const jsonStrSize = _.stableStringify(data).length;
        console.log(`jsonStrSize = ${jsonStrSize}`);
        return compressObj(data)
            .then(compressedStr => {
                should(compressedStr).be.a.String();
                console.log(`compressedSize = ${compressedStr.length}`);
                console.log(`realCompressedSize = ${Buffer.from(compressedStr, 'base64').length}`);
                should(compressedStr.length).be.lessThan(jsonStrSize)
            })
    });

});