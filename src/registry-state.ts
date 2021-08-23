import _ from 'the-lodash';
import * as DnUtils from './dn-utils';

import { RegistryStateNode } from './registry-state-node';
import { RegistryBundleState } from './registry-bundle-state';

import { Alert, SnapshotAlertsConfig, SnapshotConfigKind, SnapshotInfo, SnapshotItemInfo, SnapshotNodeConfig, SnapshotPropsConfig  } from './snapshot/types';
import { ILogger } from 'the-logger';

export type ItemProperties = Record<string, SnapshotPropsConfig>;

export class RegistryState
{
    private _date : Date;

    private _nodeMap : Record<string, RegistryStateNode> = {};
    private _childrenMap : Record<string, string[]> = {};
    private _propertiesMap : Record<string, ItemProperties> = {};
    private _alertsMap : Record<string, Alert[]> = {};
    private _kindMap : Record<string, Record<string, RegistryStateNode>> = {};

    private _stateBundle? : RegistryBundleState;

    constructor(snapshotInfo: SnapshotInfo)
    {
        this._date = snapshotInfo.date;

        this._transform(snapshotInfo);
    }

    get date()
    {
        return this._date;
    }

    getCount() : number
    {
        return _.keys(this._nodeMap).length;
    }

    getProperties(dn: string) : ItemProperties
    {
        let props = this._getProperties(dn);
        if (!props) {
            props = {};
        }
        return props;
    }

    getAlerts(dn: string)
    {
        var alerts = this._getAlerts(dn);
        if (!alerts) {
            alerts = [];
        }
        return alerts;
    }

    getNodes()
    {
        return _.values(this._nodeMap);
    }

    getNodeDns()
    {
        return _.keys(this._nodeMap);
    }

    getNode(dn: string)
    {
        var node = this._nodeMap[dn];
        if (!node) {
            return null;
        }
        return node;
    }

    findByKind(kind: string) : Record<string, RegistryStateNode>
    {
        var res = this._kindMap[kind];
        if (!res) {
            return {}
        }
        return res;
    }

    findByDn(dn: string) : RegistryStateNode | null
    {
        var res = this._nodeMap[dn];
        if (!res) {
            return null;
        }
        return res;
    }

    countByKind(kind: string) : number
    {
        return _.keys(this.findByKind(kind)).length;
    }

    childrenByKind(parentDn: string, kind: string) : Record<string, RegistryStateNode>
    {
        let newResult : Record<string, any> = {};
        let childDns = this._childrenMap[parentDn];
        if (childDns) {
            for(var childDn of childDns) {
                const childNode = this.getNode(childDn);
                if (childNode) {
                    if (childNode.kind == kind)
                    {
                        newResult[childDn] = childNode;
                    }
                }
            }
        }
        return newResult;
    }

    scopeByKind(descendentDn: string, kind: string) : Record<string, RegistryStateNode>
    {
        var result = this.findByKind(kind);
        var newResult : Record<string, any> = {};
        for(var key of _.keys(result))
        {
            if (_.startsWith(key, descendentDn))
            {
                newResult[key] = result[key];
            }
        }
        return newResult;
    }

    getChildrenDns(dn: string) : string[]
    {
        var childDns = this._childrenMap[dn];
        if (childDns) {
            return childDns;
        }
        return [];
    }

    addNewItem(item: SnapshotItemInfo)
    {
        switch (item.config_kind)
        {
            case SnapshotConfigKind.node:
                {
                    const config = <SnapshotNodeConfig>item.config;
                    this._addTreeNode(item.dn, config);
                }
                break;

            case SnapshotConfigKind.props:
                {
                    const config = <SnapshotPropsConfig>item.config;
                    var props = this._fetchProperties(item.dn);
                    props[config.id] = config;
                }
                break;

            case SnapshotConfigKind.alerts:
                {
                    const config = <SnapshotAlertsConfig>item.config;
                    var alerts = this._fetchAlerts(item.dn);
                    for(var x of config)
                    {
                        alerts.push(x);
                    }
                }
                break;
        }
    }

    private _transform(snapshotInfo: SnapshotInfo)
    {
        for(var item of snapshotInfo.items)
        {
            this.addNewItem(item);
        }
    }

    private _addTreeNode(dn: string, nodeConfig: SnapshotNodeConfig)
    {
        const node = new RegistryStateNode(
            this,
            dn,
            nodeConfig,
            this._fetchProperties(dn),
            this._fetchAlerts(dn)
        );

        this._nodeMap[dn] = node;

        if (!this._kindMap[nodeConfig.kind])
        {
            this._kindMap[nodeConfig.kind] = {};
        }
        this._kindMap[nodeConfig.kind][dn] = node;

        this._registerChild(dn);
    }

    private _registerChild(dn: string)
    {
        var parentDn = DnUtils.parentDn(dn);
            if (parentDn) {
                var parent = this._childrenMap[parentDn];
                if (!parent) {
                    parent = [];
                    this._childrenMap[parentDn] = parent;
                }
                parent.push(dn);
            }
    }

    private _getProperties(dn: string)
    {
        var props = this._propertiesMap[dn];
        return props;
    }

    private _getAlerts(dn: string)
    {
        var alerts = this._alertsMap[dn];
        return alerts;
    }

    private _fetchProperties(dn: string) : ItemProperties
    {
        var props = this._propertiesMap[dn];
        if (!props) {
            props = {};
            this._propertiesMap[dn] = props;
        }
        return props;
    }

    private _fetchAlerts(dn: string) : Alert[]
    {
        var alerts = this._alertsMap[dn];
        if (!alerts) {
            alerts = [];
            this._alertsMap[dn] = alerts;
        }
        return alerts;
    }

    raiseAlert(dn: string, alertInfo: Alert)
    {
        var alerts = this._fetchAlerts(dn);
        alerts.push(alertInfo);
    }

    raiseMarker(dn: string, name: string)
    {
        var node = this._nodeMap[dn];
        if (!node) {
            return;
        }

        node.raiseMarker(name);
    }

    postProcessAlerts(cb: (dn: string, alerts: Alert[]) => void)
    {
        for(let dn of _.keys(this._alertsMap))
        {
            cb(dn, this._alertsMap[dn]);
        }
    }

    buildBundle() : RegistryBundleState
    {
        if (this._stateBundle) {
            throw new Error("Is already bundled");
        }

        this._stateBundle = new RegistryBundleState(this);
        
        return this._stateBundle!;
    }

    async debugOutputToDir(logger: ILogger, relPath: string)
    {
        for(let dn of _.keys(this._nodeMap))
        {
            const filePath = `${relPath}/${dn}/node.json`;
            const node = this._nodeMap[dn];
            await logger.outputFile(filePath, node.config);
        }

        for(let dn of _.keys(this._childrenMap))
        {
            const filePath = `${relPath}/${dn}/children.json`;
            const children = this._childrenMap[dn];
            await logger.outputFile(filePath, children);
        }
 
        for(let dn of _.keys(this._propertiesMap))
        {
            const propsMap = this._propertiesMap[dn];

            for(let propName of _.keys(propsMap))
            {
                const props = propsMap[propName];
                const filePath = `${relPath}/${dn}/props-${props.id}.json`;
                await logger.outputFile(filePath, props);
            }
        }

        for(let dn of _.keys(this._alertsMap))
        {
            const filePath = `${relPath}/${dn}/alerts.json`;
            const alerts = this._alertsMap[dn];
            if (alerts.length > 0) {
                await logger.outputFile(filePath, alerts);
            }
        }
    }
}