const should = require('should');
const FileUtils = require('./utils/file-utils');
const _ = require('the-lodash');
const RegistryState = require('../lib/registry-state');

describe('registry-state', function() {

    it('parse-small-test', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-small.json');
        var state = new RegistryState(snapshotInfo);

        var nsNode = state.getNode('root/ns-[kube-public]');
        (nsNode).should.be.an.Object();
    });

    it('parse-large-test', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);

        var dn = 'root/ns-[kubevious]/app-[kubevious-ui]/launcher-[Deployment]';
        var deploymentNode = state.getNode(dn);
        (deploymentNode).should.be.an.Object();

        var assets = state.getAssets(dn);
        (assets).should.be.an.Object();
        (assets.props).should.be.an.Object();
        (assets.props['config']).should.be.an.Object();
        (assets.alerts).should.be.an.Array;
    })

    it('findByKind', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);

        var result = state.findByKind('launcher');
        (result).should.be.an.Object();
        (_.keys(result).length).should.be.equal(77);

        for(var item of _.values(result))
        {
            (item).should.be.an.Object();
            (item.kind).should.be.equal('launcher');
        }
    })

    it('scopeByKind', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);

        var result = state.scopeByKind('root/ns-[kubevious]', 'launcher');
        (result).should.be.an.Object();
        (_.keys(result).length).should.be.equal(4);

        for(var item of _.values(result))
        {
            (item).should.be.an.Object();
            (item.kind).should.be.equal('launcher');
        }
    });

    it('childrenByKind', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);

        var result = state.childrenByKind('root/ns-[kubevious]/app-[kubevious-ui]', 'service');
        (result).should.be.an.Object();
        (_.keys(result).length).should.be.equal(1);

        var item = result['root/ns-[kubevious]/app-[kubevious-ui]/service-[NodePort]'];
        (item).should.be.an.Object();
        (item.rn).should.be.equal('service-[NodePort]');
    });

    it('build-tree', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);

        var tree = state.getTree();
        (tree).should.be.an.Object();
    })

    it('build-bundle', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-small.json');
        var state = new RegistryState(snapshotInfo);

        var bundle = state.buildBundle();
        (bundle).should.be.an.Object();
        (bundle.nodes).should.be.an.Array();
        (bundle.children).should.be.an.Array();
        (bundle.assets).should.be.an.Array();

        for(var item of bundle.nodes)
        {
            (item).should.be.an.Object();
            (item.dn).should.be.a.String();
            (item.config).should.be.an.Object();
            (item.config_hash).should.be.a.String();
        }

        for(var item of bundle.children)
        {
            (item).should.be.an.Object();
            (item.dn).should.be.a.String();
            (item.config).should.be.an.Array();
            (item.config_hash).should.be.a.String();
        }

        for(var item of bundle.assets)
        {
            (item).should.be.an.Object();
            (item.dn).should.be.a.String();
            (item.config).should.be.an.Object();
            (item.config.props).should.be.an.Object();
            (item.config.alerts).should.be.an.Array();
            (item.config_hash).should.be.a.String();
        }
    })

});