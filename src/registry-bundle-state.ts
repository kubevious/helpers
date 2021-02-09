import _ from 'the-lodash';

import { RegistryBundleNode } from './registry-bundle-node';
import { RegistryState } from './registry-state';
import { AlertCounter, SnapshotNodeConfig } from './snapshot/types';

const ROOT_NAME = 'root';

export class RegistryBundleState
{
    private _registryState: RegistryState;
    private _nodeMap : Record<string, RegistryBundleNode> = {};

    private _nodeConfigs : Record<string, BundledNodeConfig> = {}

    constructor(registryState: RegistryState)
    {
        this._registryState = registryState;
       
        this._buildNodes();
        this._finalize();
    }

    get date()
    {
        return this._registryState.date;
    }

    get registryState() : RegistryState {
        return this._registryState;
    }

    get nodeItems() {
        return _.values(this._nodeMap);
    }

    getCount() : number
    {
        return _.keys(this._nodeMap).length;
    }

    getNodeItem(dn: string): RegistryBundleNode | null
    {
        const node = this._nodeMap[dn];
        if (!node) {
            return null;
        }
        return node;
    }

    getNode(dn: string): BundledNodeConfig | null
    {
        const config = this._nodeConfigs[dn];
        if (!config) {
            return null;
        }
        return config;
    }

    getChildren(parentDn: string): BundledNodeConfig[]
    {
        var result : BundledNodeConfig[] = [];

        var childDns = this.registryState.getChildrenDns(parentDn);
        for(var childDn of childDns) {
            const childNode = this._nodeConfigs[childDn];
            if (childNode) {
                result.push(childNode);
            }
        }
        
        return result;
    }

    private _buildNodes()
    {
        for(let node of this._registryState.getNodes())
        {
            this._nodeMap[node.dn] = new RegistryBundleNode(this, node);
        }
    }

    private _finalize()
    {
        for(let node of _.values(this._nodeMap))
        {
            var childDns = this.registryState.getChildrenDns(node.dn);

            let nodeConfig : BundledNodeConfig = {
                ...node.registryNode.config,
                markers: node.registryNode.markers,
                selfAlertCount: node.selfAlertCount,
                alertCount: node.alertCount,
                childrenCount: childDns.length
            };

            this._nodeConfigs[node.dn] = nodeConfig;
        }
        

        this._traverseNodes((dn, node) => {
            var alerts = node.selfAlerts;
            for(var alert of alerts)
            {
                (<Record<string, number>>(<any>node.selfAlertCount))[alert.severity] += 1;
                (<Record<string, number>>(<any>node.alertCount))[alert.severity] += 1;
            }

            if (alerts.length > 0) {
                node.hierarchyAlerts[dn] = alerts;
            }
        })

        this._traverseTreeBottomsUp((dn, node, parentDn, parentNode) => {
            if (!parentDn) {
                return;
            }

            const srcDict = node.hierarchyAlerts;
            const destDict = parentNode!.hierarchyAlerts;
            for(let x of _.keys(srcDict))
            {
                destDict[x] = srcDict[x];
            }

            parentNode!.alertCount.error += node.alertCount.error;
            parentNode!.alertCount.warn += node.alertCount.warn;
        });
    }

    private _traverseTreeBottomsUp(cb : (dn: string, node: RegistryBundleNode, parentDn: string | null, parentNode: RegistryBundleNode | null) => void)
    {
        var traverseNode = (dn: string, parentDn: string | null, parentNode: RegistryBundleNode | null) =>
        {
            var node = this._nodeMap[dn];
            if (!node) {
                return;
            }
        
            var childrenDns = this._registryState.getChildrenDns(dn);
            for(var childDn of childrenDns)
            {
                traverseNode(childDn, dn, node);
            }

            cb(dn, node, parentDn, parentNode);
        }

        traverseNode(ROOT_NAME, null, null);
    }

    private _traverseNodes(cb: (dn: string, node: RegistryBundleNode, parentDn?: string, parentNode?: RegistryBundleNode) => void)
    {
        for(var dn of _.keys(this._nodeMap))
        {
            var node = this._nodeMap[dn];
            if (node)
            {
                cb(dn, node);
            }
        }
    }
}

export interface BundledNodeConfig extends SnapshotNodeConfig
{
    childrenCount: number;
    markers: string[];
    selfAlertCount: AlertCounter;
    alertCount: AlertCounter;
}
