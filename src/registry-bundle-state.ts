import _ from 'the-lodash';

import { RegistryBundleNode } from './registry-bundle-node';
import { Alert, AlertCounter, RegistryState, SnapshotNodeConfig } from './registry-state';

import * as HashUtils from './hash-utils';

const ROOT_NAME = 'root';

export class RegistryBundleState
{
    private _registryState: RegistryState;
    private _nodeMap : Record<string, RegistryBundleNode> = {};

    private _nodeConfigs : Record<string, BundledNodeConfig> = {}

    private _nodes: BundleItem[] = [];
    private _children: BundleItem[] = [];
    private _properties: BundleItem[] = [];
    private _alerts: BundleItem[] = [];

    constructor(registryState: RegistryState)
    {
        this._registryState = registryState;
       
        this._buildNodes();
        this._finalize();
        this._buildBundle();
    }

    get date()
    {
        return this._registryState.date;
    }

    get nodes() : BundleItem[] {
        return this._nodes;
    }

    get children() : BundleItem[] {
        return this._children;
    }

    get properties() : BundleItem[] {
        return this._properties;
    }

    get alerts() : BundleItem[] {
        return this._alerts;
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

    getNode(dn: string): SnapshotNodeConfig | null
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

    private _buildBundle()
    {
        for(let node of _.values(this._nodeMap))
        {
            const dn = node.dn;

            {
                let nodeConfig = this._nodeConfigs[node.dn];
                this._nodes.push(
                    this._buildBundleItem(dn, nodeConfig)
                );
            }

            {
                this._children.push(
                    this._buildBundleItem(dn, this._registryState.getChildrenDns(dn))
                );
            }

            {
                const propertiesMap = node.propertiesMap;
                if (propertiesMap && _.keys(propertiesMap).length > 0)
                {
                    this._properties.push(
                        this._buildBundleItem(dn, propertiesMap)
                    );
                }
            }

            {
                const alerts = node.hierarchyAlerts;
                if (alerts && _.keys(alerts).length > 0)
                {
                    this._alerts.push(
                        this._buildBundleItem(dn, alerts)
                    );
                }
            }
        }
    }

    private _buildBundleItem(dn : string, config: any) : BundleItem
    {
        let key = {
            dn: dn,
            config: config
        }
        let item : BundleItem = {
            dn: dn,
            config: config,
            config_hash: HashUtils.calculateObjectHashStr(key)
        }
        return item;
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

export interface StateBundleData
{
    nodes: BundleItem[];
    children: BundleItem[];
    properties: BundleItem[];
    alerts: BundleItem[];
}

export interface BundleItem
{
    dn: string;
    config: any;
    config_hash : string;
}

export interface BundledNodeConfig extends SnapshotNodeConfig
{
    childrenCount: number;
    markers: string[];
    alertCount: AlertCounter;
}
