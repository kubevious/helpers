import _ from 'the-lodash';
import { makeKey } from './helpers';
import { parentDn as makeParentDn } from '../dn-utils';

export class Snapshot
{
    private _date : any;
    private _items : Record<string, any> = {};

    constructor(date: any)
    {
        this._date = date;
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

    addItem(item: any)
    {
        this._items[makeKey(item)] = item;
    }

    addItems(items: any[])
    {
        for(var item of items)
        {
            this.addItem(item);
        }
    }

    deleteItem(item: any)
    {
        this.delteById(makeKey(item));
    }

    delteById(id: string)
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

    findById(id: string)
    {
        var item = this._items[id];
        if (!item) {
            return null;
        }
        return item;
    }

    findItem(item: any)
    {
        return this.findById(makeKey(item));
    }

    generateTree()
    {
        var lookup : Record<string, any> = {};

        let makeNode = (dn: string, config: any) => {
            var node = _.clone(config);
            node.children = [];
            lookup[dn] = node;
        };

        for (var item of this.getItems().filter(x => x.config_kind == 'node'))
        {
            makeNode(item.dn, item.config);
        }

        let getNode = (dn: string) => {
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

        let markParent = (dn: string) => {
            var node = lookup[dn];

            var parentDn = makeParentDn(dn);
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

}