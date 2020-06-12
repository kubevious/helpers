const _ = require('the-lodash');
const DnUtils = require('./dn-utils');
const HashUtils = require('./hash-utils');

class RegistryState
{
    constructor(snapshotInfo)
    {
        this._date = snapshotInfo.date;

        this._tree = null;
        this._nodeMap = {};
        this._childrenMap = {};
        this._assetMap = {};

        this._kindMap = {};

        this._transform(snapshotInfo);
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

        this._tree = this._buildTreeNode('root');
        if (!this._tree) {
            this._tree = {
                kind: 'root',
                rn: 'root'
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

    getAssets(dn)
    {
        var assets = this._getAssets(dn);
        return assets;
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
                var assets = this._fetchAssets(item.dn);
                assets.props[item.config.id] = item.config;
            } else if (item.config_kind == 'alerts') {
                var assets = this._fetchAssets(item.dn);
                assets.alerts = item.config;
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

    _getAssets(dn)
    {
        var assets = this._assetMap[dn];
        if (!assets) {
            return {
                props: {},
                alerts: []
            }
        }
        return this._assetMap[dn];
    }

    _fetchAssets(dn)
    {
        var assets = this._assetMap[dn];
        if (!assets) {
            assets = {
                props: {},
                alerts: []
            }
            this._assetMap[dn] = assets;
        }
        return assets;
    }

    raiseAlert(dn, alertInfo)
    {
        var assets = this._fetchAssets(dn);
        assets.alerts.push(alertInfo);
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

    buildBundle()
    {
        var bundle = {
            nodes: [],
            children: [],
            assets: []
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

            bundle.assets.push(
                this._buildBundleItem(dn, this._getAssets(dn))
            );
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
}

module.exports = RegistryState;