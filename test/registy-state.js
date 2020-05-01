const should = require('should');
const path = require('path');
const fs = require('fs');
const _ = require('the-lodash');
const RegistryState = require('../lib/registry-state');

describe('registry-state', function() {

    it('parse-small-test', function() {
        var contents = fs.readFileSync(path.join(__dirname, 'data', 'snapshot-items-small.json')).toString();
        var snapshotInfo = JSON.parse(contents);

        var state = new RegistryState(null, snapshotInfo);
        var nsNode = state.getNode('root/ns-[kube-public]');
        (nsNode).should.be.an.Object();
    });

    it('parse-large-test', function() {
        var contents = fs.readFileSync(path.join(__dirname, 'data', 'snapshot-items-large.json')).toString();
        var snapshotInfo = JSON.parse(contents);

        var state = new RegistryState(null, snapshotInfo);

        var dn = 'root/ns-[kubevious]/app-[kubevious-ui]/launcher-[Deployment]';
        var deploymentNode = state.getNode(dn);
        (deploymentNode).should.be.an.Object();

        var assets = state.getAssets(dn);
        (assets).should.be.an.Object();
        (assets.props).should.be.an.Object();
        (assets.props['config']).should.be.an.Object();
        (assets.alerts).should.be.an.Array;

    });

});