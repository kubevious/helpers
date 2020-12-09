const _ = require('the-lodash');
const DnUtils = require('./dn-utils');
const HashUtils = require('./hash-utils');

const ROOT_NAME = 'root';

class RegistryState
{
    constructor(snapshotInfo)
    {
        this._date = snapshotInfo.date;

        this._tree = null;
        this._nodeMap = {};
        this._childrenMap = {};
        this._propertiesMap = {};
        this._alertsMap = {};
        this._hierarchyAlertsMap = {};

        this._kindMap = {};

        this._transform(snapshotInfo);

        this._isBundled = false;
    }

    get date()
    {
        return this._date;
    }

    getCount()
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

    getNode(dn, includeChildren)
    {
        var node = this._constructNode(dn);
        if (!node) {
            return null;
        }

        var result = {
            node: node
        }

        if (includeChildren)
        {
            result.children = this._getChildren(dn);
        }

        return result;
    }

    getChildren(dn)
    {
        var result = this._getChildren(dn);
        return result;
    }

    getProperties(dn)
    {
        var props = this._getProperties(dn);
        if (!props) {
            props = {};
        }
        return props;
    }

    getAlerts(dn)
    {
        var alerts = this._getAlerts(dn);
        if (!alerts) {
            alerts = [];
        }
        return alerts;
    }

    getHierarchyAlerts(dn)
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

    editableNode(dn)
    {
        return this._nodeMap[dn];
    }

    findByKind(kind)
    {
        var res = this._kindMap[kind];
        if (!res) {
            return {}
        }
        return res;
    }

    scopeByKind(descendentDn, kind)
    {
        var result = this.findByKind(kind);
        var newResult = {};
        for(var key of _.keys(result))
        {
            if (_.startsWith(key, descendentDn))
            {
                newResult[key] = result[key];
            }
        }
        return newResult;
    }

    childrenByKind(parentDn, kind)
    {
        var newResult = {};
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

    getChildrenDns(dn)
    {
        var childDns = this._childrenMap[dn];
        if (childDns) {
            return childDns;
        }
        return [];
    }

    _getChildren(dn)
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

    _constructNode(dn)
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

    _transform(snapshotInfo)
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

    _addTreeNode(dn, node)
    {
        this._nodeMap[dn] = node;

        if (!this._kindMap[node.kind])
        {
            this._kindMap[node.kind] = {};
        }
        this._kindMap[node.kind][dn] = node;
    }

    _buildChildrenMap()
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

    _buildTreeNode(parentDn)
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

    _getProperties(dn)
    {
        var props = this._propertiesMap[dn];
        return props;
    }

    _getAlerts(dn)
    {
        var alerts = this._alertsMap[dn];
        return alerts;
    }

    _fetchProperties(dn)
    {
        var props = this._propertiesMap[dn];
        if (!props) {
            props = {};
            this._propertiesMap[dn] = props;
        }
        return props;
    }

    _fetchAlerts(dn)
    {
        var alerts = this._alertsMap[dn];
        if (!alerts) {
            alerts = [];
            this._alertsMap[dn] = alerts;
        }
        return alerts;
    }

    raiseAlert(dn, alertInfo)
    {
        var alerts = this._fetchAlerts(dn);
        alerts.push(alertInfo);
    }

    raiseMarker(dn, name)
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

    _ensureFinalized()
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

    buildBundle()
    {
        if (this._isBundled) {
            throw new Error("Is already bundled");
        }
        this._isBundled = true;

        var bundle = {
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

    _massageNode(node)
    {
        if (node.markers && _.isPlainObject(node.markers))
        {
            node.markers = _.keys(node.markers);
        }
    }

    _buildBundleItem(dn, config)
    {
        var item = {
            dn: dn,
            config: config
        }
        item.config_hash = HashUtils.calculateObjectHashStr(config);
        return item;
    }

    traverseTreeBottomsUp(cb)
    {
        var traverseNode = (dn, parentDn, parentNode) =>
        {
            var node = this._nodeMap[dn];
            if (!node) {
                return null;
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

    traverseNodes(cb)
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

module.exports = RegistryState;