const _ = require('the-lodash');
const Helpers = require('./helpers');
const DnUtils = require("../dn-utils");

class Snapshot
{
    constructor(date)
    {
        this._date = date;
        this._items = {};
    }

    get date() {
        return this._date;
    }

    get count() {
        return _.keys(this._items).length;
    }

    get keys() {
        return _.keys(this._items);
    }

    addItem(item)
    {
        this._items[Helpers.makeKey(item)] = item;
    }

    addItems(items)
    {
        for(var item of items)
        {
            this.addItem(item);
        }
    }

    deleteItem(item)
    {
        this.delteById(Helpers.makeKey(item));
    }

    delteById(id)
    {
        delete this._items[id];
    }

    getItems()
    {
        return _.values(this._items);
    }

    getDict()
    {
        return _.cloneDeep(this._items);
    }

    findById(id)
    {
        var item = this._items[id];
        if (!item) {
            return null;
        }
        return item;
    }

    findItem(item)
    {
        return this.findById(Helpers.makeKey(item));
    }

    generateTree()
    {
        var lookup = {};

        let makeNode = (dn, config) => {
            var node = _.clone(config);
            node.children = [];
            lookup[dn] = node;
        };

        for (var item of this.getItems().filter(x => x.config_kind == 'node'))
        {
            makeNode(item.dn, item.config);
        }

        let getNode = (dn) => {
            var node = lookup[dn];
            if (!node) {
                node = {
                    children: []
                };
                lookup[dn] = node;
                markParent(dn);
            }
            return node;
        };

        let markParent = (dn) => {
            var node = lookup[dn];

            var parentDn = DnUtils.parentDn(dn);
            if (parentDn.length > 0) {
                var parentNode = getNode(parentDn);
                parentNode.children.push(node);
            }
        };

        for (var item of this.getItems().filter(x => x.config_kind == 'node'))
        {
            markParent(item.dn);
        }

        var rootNode = lookup['root'];
        if (!rootNode) {
            rootNode = null;
        }

        return rootNode;
    }

    _getParentDn(dn, myRn)
    {
        var parentDn = dn.substring(0, dn.length - myRn.length - 1);
        return parentDn;
    }
}

module.exports = Snapshot;