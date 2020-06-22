const Promise = require('the-promise');
const _ = require('the-lodash');
const HashUtils = require('../hash-utils');


class DataStoreTableSynchronizer
{
    constructor(parent, filterValues, skipDelete)
    {
        this._dataStoreTable = parent;
        this._metaTable = parent._metaTable;
        this._logger = parent.logger;
        this._filterValues = filterValues;
        this._skipDelete = skipDelete;
    }

    execute(items)
    {
        return this._dataStoreTable.queryMany(this._filterValues)
            .then(currentItems => {

                var currentItemsDict = {}
                for(var item of currentItems)
                {
                    var keys = {};
                    for(var x of this._metaTable.getKeyFields())
                    {
                        keys[x] = item[x];
                        delete item[x];
                    }
                    currentItemsDict[HashUtils.calculateObjectHashStr(item)] = {
                        keys: keys,
                        item: item
                    }
                }

                var targetItemsDict = {}
                for(var item of items)
                {
                    targetItemsDict[HashUtils.calculateObjectHashStr(item)] = item;
                }

                return this._productDelta(currentItemsDict, targetItemsDict);
            })
            .then(delta => {
                return this._executeDelta(delta);
            })
    }

    _productDelta(currentItemsDict, targetItemsDict)
    {
        this._logger.info('currentItemsDict: ', currentItemsDict);
        this._logger.info('targetItemsDict: ', targetItemsDict);

        var delta = [];

        if (!this._skipDelete) {
            for(var h of _.keys(currentItemsDict))
            {
                if (!targetItemsDict[h]) {
                    delta.push({
                        action: 'D',
                        keys: currentItemsDict[h].keys
                    });
                }
            }
        }

        for(var h of _.keys(targetItemsDict))
        {
            if (!currentItemsDict[h]) {
                delta.push({
                    action: 'C',
                    item: targetItemsDict[h]
                });
            }
        }

        return delta;
    }

    _executeDelta(delta)
    {
        this._logger.info('delta: ', delta);

        return Promise.serial(delta, x => {
            if (x.action == 'C') {
                return this._dataStoreTable.create(x.item);
            } else if (x.action == 'D') {
                return this._dataStoreTable.delete(x.keys);
            }
        });
    }
}

module.exports = DataStoreTableSynchronizer;