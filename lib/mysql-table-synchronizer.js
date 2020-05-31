const _ = require('the-lodash');
const HashUtils = require('./hash-utils');

class MySqlTableSynchronizer
{
    constructor(logger, driver, table, filterFields, syncFields)
    {
        this._logger = logger.sublogger('TableSynchronizer');
        this._driver = driver;
        this._table = table;
        this._filterFields = filterFields || [];
        this._syncFields = syncFields || [];
        this._skipDelete = false;

        this._prepareQueryStatement();
        this._prepareCreateStatement();
        this._prepareDeleteStatement();
    }

    get logger() {
        return this._logger;
    }

    markSkipDelete() {
        this._skipDelete = true;
    }

    _prepareQueryStatement()
    {
        var parts = ['sync', this._table, 'query'];
        parts = _.concat(parts, this._filterFields);
        parts = parts.map(x => _.toUpper(x));

        this._queryStatement = parts.join('_');

        var whereClause = '';
        if (this._filterFields.length > 0)
        {
            whereClause = ' WHERE ' + 
            this._filterFields.map(x => '`' + x + '` = ?').join(' AND ');
        }

        var fields = ['id'];
        fields = _.concat(fields, this._filterFields);
        fields = _.concat(fields, this._syncFields);
        fields = fields.map(x => '`' + x + '`');

        var sql = 'SELECT `id` ' + 
            fields.join(', ') +
            ' FROM `' + this._table + '`' +
            whereClause + 
            ';'
            ;

        this._driver.registerStatement(this._queryStatement, sql);
    }

    _prepareCreateStatement()
    {
        var parts = ['sync', this._table, 'create'];
        parts = _.concat(parts, this._filterFields);
        parts = parts.map(x => _.toUpper(x));

        this._createStatement = parts.join('_');

        var fields = [];
        fields = _.concat(fields, this._filterFields);
        fields = _.concat(fields, this._syncFields);
        fields = fields.map(x => '`' + x + '`');

        var sql = 'INSERT INTO ' + 
            '`' + this._table + '` (' +
            fields.join(', ') +
            ') VALUES (' + 
            fields.map(x => '?').join(', ') +
            ');';

        this._driver.registerStatement(this._createStatement, sql);
    }

    _prepareDeleteStatement()
    {
        var parts = ['sync', this._table, 'delete'];
        parts = _.concat(parts, this._filterFields);
        parts = parts.map(x => _.toUpper(x));

        this._deleteStatement = parts.join('_');

        var sql = 'DELETE FROM ' + 
            '`' + this._table + '` ' +
            'WHERE `id` = ?;';

        this._driver.registerStatement(this._deleteStatement, sql);
    }

    execute(filterValues, items)
    {
        return this._queryCurrent(filterValues)
            .then(currentItems => {

                var currentItemsDict = {}
                for(var item of currentItems)
                {
                    var id = item.id;
                    delete item.id;
                    currentItemsDict[HashUtils.calculateObjectHashStr(item)] = {
                        id: id,
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

    _queryCurrent(filterValues)
    {
        var params = this._filterFields.map(x => filterValues[x]);
        return this._driver.executeStatement(this._queryStatement, params)
    }

    _productDelta(currentItemsDict, targetItemsDict)
    {
        var delta = [];

        if (!this._skipDelete) {
            for(var h of _.keys(currentItemsDict))
            {
                if (!targetItemsDict[h]) {
                    delta.push({
                        action: 'D',
                        id: currentItemsDict[h].id
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
        var statements = delta.map(delta => {
            var statementId = '';
            var params = null;

            if (delta.action == 'C') {
                statementId = this._createStatement;
                var params = this._filterFields.map(x => delta.item[x]);
                params = _.concat(params, this._syncFields.map(x => delta.item[x]))
            } else if (delta.action == 'D') {
                statementId = this._deleteStatement;
                params = [delta.id];
            }

            return {
                id: statementId, 
                params: params
            }
        });

        return this._driver.executeStatements(statements);
    }

}

module.exports = MySqlTableSynchronizer;