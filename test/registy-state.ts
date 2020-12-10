import 'mocha';
import should = require('should');

import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { setupLogger, LoggerOptions } from 'the-logger';

const loggerOptions = new LoggerOptions().enableFile(false).pretty(true);
const logger = setupLogger('test', loggerOptions);

import { RegistryState } from '../src/registry-state';

import * as FileUtils from './utils/file-utils';

describe('registry-state', function() {

    it('parse-small-test', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-small.json');
        var state = new RegistryState(snapshotInfo);

        var nsNode = state.getNode('root/ns-[kube-public]');
        should(nsNode).be.an.Object();
    });

    it('parse-large-test', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);
        state.finalizeState();

        var dn = 'root/ns-[kubevious]/app-[kubevious-ui]/launcher-[Deployment]';
        var deploymentNode = state.getNode(dn);
        should(deploymentNode).be.an.Object();

        var props = state.getProperties(dn);
        (props).should.be.an.Object();
        should(props['config']).be.an.Object();

        var alerts = state.getAlerts(dn);
        should(alerts).be.an.Array;

        var hierarchyAlerts = state.getHierarchyAlerts(dn);
        should(hierarchyAlerts).be.an.Array;

    })

    it('findByKind', function() {
        var snapshotInfo = FileUtils.readJsonData('snapshot-items-large.json');
        var state = new RegistryState(snapshotInfo);

        var result = state.findByKind('launcher');
        should(result).be.an.Object();
        should(_.keys(result).length).be.equal(77);

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
        should(result).be.an.Object();
        should(_.keys(result).length).be.equal(4);

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
        state.finalizeState();

        var bundle = state.buildBundle();
        (bundle).should.be.an.Object();
        (bundle.nodes).should.be.an.Array();
        (bundle.children).should.be.an.Array();
        (bundle.properties).should.be.an.Array();
        (bundle.alerts).should.be.an.Array();

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

        for(var item of bundle.properties)
        {
            (item).should.be.an.Object();
            (item.dn).should.be.a.String();
            (item.config).should.be.an.Object();
            (item.config_hash).should.be.a.String();
        }

        for(var item of bundle.alerts)
        {
            (item).should.be.an.Object();
            (item.dn).should.be.a.String();
            (item.config).should.be.an.Object();
            (item.config_hash).should.be.a.String();
        }

        {
            var myDn = 'root/ns-[kube-system]';
            var myItemAlerts = _.find(bundle.alerts, x => x.dn == myDn);
            should(myItemAlerts).be.an.Object();

            var myNode = state.getNode(myDn);
            should(myNode).be.ok();

            should(myNode!.node.selfAlertCount).be.eql({});
            should(myNode!.node.alertCount).be.eql({ error: 11, warn: 11 });

            should(myItemAlerts!.config['root/ns-[kube-system]/raw-[Raw Configs]/raw-[ConfigMaps]']).be.not.ok();
            should(myItemAlerts!.config['root/ns-[kube-system]/raw-[Raw Configs]/raw-[ConfigMaps]/configmap-[istio.v1]']).be.ok();
        }

        {
            var myDn = 'root/ns-[kube-system]/app-[fluentd-gcp-scaler]';
            var myItemAlerts = _.find(bundle.alerts, x => x.dn == myDn);
            should(myItemAlerts).be.an.Object();

            var myNode = state.getNode(myDn);
            should(myNode).be.ok();

            should(myNode!.node.selfAlertCount).be.eql({ error: 1});
            should(myNode!.node.alertCount).be.eql({ error: 1 });
        }
    })

});