import _ from 'the-lodash';
import * as DnUtils from './dn-utils';
import * as HashUtils from './hash-utils';

const ROOT_NAME = 'root';

export class RegistryState
{
    private _date : any;

    private _tree : any;
    private _nodeMap : Record<string, any> = {};
    private _childrenMap : Record<string, any> = {};
    private _propertiesMap : Record<string, any> = {};
    private _alertsMap : Record<string, any> = {};
    private _hierarchyAlertsMap : Record<string, any> = {};
    private _kindMap : Record<string, any> = {};

    private _isBundled : boolean = false;
    private _isFinalized : boolean = false;

    constructor(snapshotInfo: any)
    {
        this._date = snapshotInfo.date;

        this._transform(snapshotInfo);

        this._isBundled = false;
    }

    get date()
    {
        return this._date;
    }

    getCount() : number
    {
        return _.keys(this._nodeMap).length;
    }

    getTree()
    {
        if (this._tree) {
            return this._tree;
        }

        this._tree = this._buildTreeNode(ROOT_NAME);
        if (!this._tree) {
            this._tree = {
                kind: ROOT_NAME,
                rn: ROOT_NAME
            }
        }

        return this._tree;
    }

    getNode(dn: string, includeChildren?: boolean) : NodeInfo | null
    {
        var node = this._constructNode(dn);
        if (!node) {
            return null;
        }

        var result : NodeInfo = {
            node: node
        }

        if (includeChildren)
        {
            result.children = this._getChildren(dn);
        }

        return result;
    }

    getChildren(dn: string)
    {
        var result = this._getChildren(dn);
        return result;
    }

    getProperties(dn: string)
    {
        var props = this._getProperties(dn);
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

    getHierarchyAlerts(dn: string)
    {
        this._ensureFinalized();

        var alerts = this._hierarchyAlertsMap[dn];
        if (!alerts) {
            alerts = {};
        }
        return alerts;
    }

    getNodes()
    {
        return _.keys(this._nodeMap).map(dn => ({
            dn: dn,
            config: this._nodeMap[dn]
        }));
    }

    getNodeDns()
    {
        return _.keys(this._nodeMap);
    }

    editableNode(dn: string)
    {
        return this._nodeMap[dn];
    }

    findByKind(kind: string)
    {
        var res = this._kindMap[kind];
        if (!res) {
            return {}
        }
        return res;
    }

    scopeByKind(descendentDn: string, kind: string) : Record<string, any>
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

    childrenByKind(parentDn: string, kind: string) : Record<string, any>
    {
        var newResult : Record<string, any> = {};
        var childDns = this._childrenMap[parentDn];
        if (childDns) {
            for(var childDn of childDns) {
                var childNode = this._constructNode(childDn);
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

    getChildrenDns(dn: string)
    {
        var childDns = this._childrenMap[dn];
        if (childDns) {
            return childDns;
        }
        return [];
    }

    private _getChildren(dn: string)
    {
        var result = [];

        var childDns = this.getChildrenDns(dn);
        for(var childDn of childDns) {
            var childNode = this._constructNode(childDn);
            if (childNode) {
                result.push(childNode);
            }
        }
        
        return result;
    }

    private _constructNode(dn: string)
    {
        var node = this._nodeMap[dn];
        if (!node) {
            return null;
        }

        node = _.clone(node);
        var childDns = this.getChildrenDns(dn);
        node.childrenCount = childDns.length;
        return node;
    }

    private _transform(snapshotInfo: any)
    {
        for(var item of _.values(snapshotInfo.items))
        {
            if (item.config_kind == 'node')
            {
                this._addTreeNode(item.dn, item.config);
            } else if (item.config_kind == 'props') {
                var props = this._fetchProperties(item.dn);
                props[item.config.id] = item.config;
            } else if (item.config_kind == 'alerts') {
                var alerts = this._fetchAlerts(item.dn);
                for(var x of item.config)
                {
                    alerts.push(x);
                }
            }
        }

        this._buildChildrenMap();
    }

    private _addTreeNode(dn: string, node: any)
    {
        this._nodeMap[dn] = node;

        if (!this._kindMap[node.kind])
        {
            this._kindMap[node.kind] = {};
        }
        this._kindMap[node.kind][dn] = node;
    }

    private _buildChildrenMap()
    {
        for(var dn of _.keys(this._nodeMap))
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
    }

    private _buildTreeNode(parentDn: string)
    {
        var node = this._nodeMap[parentDn];
        if (!node) {
            return null;
        }

        var node = _.clone(node);
        node.children = [];

        var childrenDns = this.getChildrenDns(parentDn);
        for(var childDn of childrenDns)
        {
            var childTreeNode = this._buildTreeNode(childDn);
            if (childTreeNode)
            {
                node.children.push(childTreeNode);
            }
        }

        return node;
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

    private _fetchProperties(dn: string)
    {
        var props = this._propertiesMap[dn];
        if (!props) {
            props = {};
            this._propertiesMap[dn] = props;
        }
        return props;
    }

    private _fetchAlerts(dn: string)
    {
        var alerts = this._alertsMap[dn];
        if (!alerts) {
            alerts = [];
            this._alertsMap[dn] = alerts;
        }
        return alerts;
    }

    raiseAlert(dn: string, alertInfo: any)
    {
        var alerts = this._fetchAlerts(dn);
        alerts.push(alertInfo);
    }

    raiseMarker(dn: string, name: string)
    {
        var node = this._nodeMap[dn];
        if (!node) {
            return null;
        }

        if (!node.markers) {
            node.markers = {};
        }
        node.markers[name] = true;
    }

    private _ensureFinalized()
    {
        if (!this._isFinalized) {
            throw new Error("State Not Finalized");
        }
    }

    finalizeState()
    {
        if (this._isFinalized) {
            throw new Error("Is already finalized");
        }
        this._isFinalized = true;

        this._hierarchyAlertsMap = {};

        this.traverseNodes((dn, node) => {
            node.selfAlertCount = {};
            var alerts = this.getAlerts(dn);
            for(var alert of alerts)
            {
                if (!node.selfAlertCount[alert.severity]) {
                    node.selfAlertCount[alert.severity] = 1;
                } else {
                    node.selfAlertCount[alert.severity] += 1;
                }
            }
            node.alertCount = _.clone(node.selfAlertCount);

            this._hierarchyAlertsMap[dn] = {};
            if (alerts.length > 0) {
                this._hierarchyAlertsMap[dn][dn] = alerts;
            }
        })

        this.traverseTreeBottomsUp((dn, node, parentDn, parentNode) => {
            if (parentDn) {
                this._hierarchyAlertsMap[parentDn] = 
                    _.defaults(this._hierarchyAlertsMap[parentDn], 
                               this._hierarchyAlertsMap[dn]);

                for(var severity of _.keys(node.alertCount))
                {
                    if (!parentNode.alertCount[severity]) {
                        parentNode.alertCount[severity] = node.alertCount[severity];
                    } else {
                        parentNode.alertCount[severity] += node.alertCount[severity];
                    }
                }
            }
        });

    }

    buildBundle() : StateBundle
    {
        if (this._isBundled) {
            throw new Error("Is already bundled");
        }
        this._isBundled = true;

        let bundle : StateBundle = {
            nodes: [],
            children: [],
            properties: [],
            alerts: []
        };

        for(var dn of _.keys(this._nodeMap))
        {
            var node = this._nodeMap[dn];
            this._massageNode(node);

            bundle.nodes.push(
                this._buildBundleItem(dn, node)
            );

            bundle.children.push(
                this._buildBundleItem(dn, this.getChildrenDns(dn))
            );

            var props = this._getProperties(dn);
            if (props && _.keys(props).length > 0)
            {
                bundle.properties.push(
                    this._buildBundleItem(dn, props)
                );
            }

            var alerts = this.getHierarchyAlerts(dn);
            if (alerts && _.keys(alerts).length > 0)
            {
                bundle.alerts.push(
                    this._buildBundleItem(dn, alerts)
                );
            }
        }

        return bundle;
    }

    private _massageNode(node: any)
    {
        if (node.markers && _.isPlainObject(node.markers))
        {
            node.markers = _.keys(node.markers);
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

    traverseTreeBottomsUp(cb : (dn: string, node: any, parentDn: string | null, parentNode: any) => void)
    {
        var traverseNode = (dn: string, parentDn: string | null, parentNode: any | null) =>
        {
            var node = this._nodeMap[dn];
            if (!node) {
                return;
            }
        
            var childrenDns = this.getChildrenDns(dn);
            for(var childDn of childrenDns)
            {
                traverseNode(childDn, dn, node);
            }

            cb(dn, node, parentDn, parentNode);
        }

        traverseNode(ROOT_NAME, null, null);
    }

    traverseNodes(cb: (dn: string, node: any, parentDn?: string, parentNode?: any) => void)
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

export interface BundleItem
{
    dn: string;
    config: any;
    config_hash : string;
}

export interface StateBundle
{
    nodes: BundleItem[];
    children: BundleItem[];
    properties: BundleItem[];
    alerts: BundleItem[];
}

export interface NodeInfo
{
    node: any;
    children?: any[]
}