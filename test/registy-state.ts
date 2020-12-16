import 'mocha';
import should = require('should');

import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { setupLogger, LoggerOptions } from 'the-logger';

const loggerOptions = new LoggerOptions().enableFile(false).pretty(true);
const logger = setupLogger('test', loggerOptions);

import { RegistryState, SnapshotInfo } from '../src/registry-state';

import * as FileUtils from './utils/file-utils';

describe('registry-state', function() {

    it('parse-small-test', function() {
        const state = loadRegistryState('snapshot-items-small.json');

        const nsNode = state.getNode('root/ns-[kube-public]');
        should(nsNode).be.an.Object();
        should(nsNode!.kind).be.a.String().and.equal("ns");
        // should(nsNode.).be.an.Object();
    });

    it('parse-large-test', function() {
        const state = loadRegistryState('snapshot-items-large.json');

        const dn = 'root/ns-[kubevious]/app-[kubevious-ui]/launcher-[Deployment]';
        const stateNode = state.getNode(dn);
        should(stateNode).be.an.Object();

        const bundle = state.buildBundle();

        const deploymentNode = bundle.getNodeItem(dn);
        should(deploymentNode).be.an.Object();

        const props = state.getProperties(dn);
        (props).should.be.an.Object();
        should(props['config']).be.an.Object();

        const alerts = state.getAlerts(dn);
        should(alerts).be.an.Array;
        
        const hierarchyAlerts = deploymentNode!.hierarchyAlerts
        should(hierarchyAlerts).be.an.Array;
    })

    it('findByKind', function() {
        var state = loadRegistryState('snapshot-items-large.json');

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
        var state = loadRegistryState('snapshot-items-large.json');

        var result = state.scopeByKind('root/ns-[kubevious]', 'launcher');
        should(result).be.an.Object();
        should(_.keys(result).length).be.equal(4);

        for(var item of _.values(result))
        {
            (item).should.be.an.Object();
            (item.kind).should.be.equal('launcher');
        }
    });

    // it('childrenByKind', function() {
    //     var state = loadRegistryState('snapshot-items-large.json');

    //     var result = state.childrenByKind('root/ns-[kubevious]/app-[kubevious-ui]', 'service');
    //     (result).should.be.an.Object();
    //     (_.keys(result).length).should.be.equal(1);

    //     var item = result['root/ns-[kubevious]/app-[kubevious-ui]/service-[NodePort]'];
    //     (item).should.be.an.Object();
    //     (item.rn).should.be.equal('service-[NodePort]');
    // });

    // it('build-tree', function() {
    //     var state = loadRegistryState('snapshot-items-large.json');

    //     var tree = state.getTree();
    //     (tree).should.be.an.Object();
    // })

    it('build-bundle', function() {
        const state = loadRegistryState('snapshot-items-small.json');

        const bundle = state.buildBundle();
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
            const myDn = 'root/ns-[kube-system]';
            const myItemAlerts = _.find(bundle.alerts, x => x.dn == myDn);
            should(myItemAlerts).be.an.Object();

            const myNode = bundle.getNodeItem(myDn);
            should(myNode).be.ok();

            should(myNode!.selfAlertCount).be.eql({ error: 0, warn: 0 });
            should(myNode!.alertCount).be.eql({ error: 11, warn: 11 });

            should(myItemAlerts!.config['root/ns-[kube-system]/raw-[Raw Configs]/raw-[ConfigMaps]']).be.not.ok();
            should(myItemAlerts!.config['root/ns-[kube-system]/raw-[Raw Configs]/raw-[ConfigMaps]/configmap-[istio.v1]']).be.ok();
        }

        {
            const myDn = 'root/ns-[kube-system]/app-[fluentd-gcp-scaler]';
            const myItemAlerts = _.find(bundle.alerts, x => x.dn == myDn);
            should(myItemAlerts).be.an.Object();

            const myNode = bundle.getNodeItem(myDn);
            should(myNode).be.ok();

            should(myNode!.selfAlertCount).be.eql({ error: 1, warn: 0});
            should(myNode!.alertCount).be.eql({ error: 1, warn: 0 });
        }
    })

});

function loadRegistryState(filePath: string) : RegistryState
{
    const data = <any>FileUtils.readJsonData(filePath);
    const snapshotInfo = <SnapshotInfo> {
        date: data.date,
        items: _.values(data.items)
    };
    const state = new RegistryState(snapshotInfo);
    return state;
}