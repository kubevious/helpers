const Promise = require('the-promise');
const _ = require('the-lodash');
const DataStoreTableSynchronizer = require('./data-store-table-synchronizer');

class DataStoreTable
{
    constructor(parent, metaTable)
    {
        this._parent = parent;
        this._mysqlDriver = parent._mysqlDriver;
        this._metaTable = metaTable;
    }

    get name() {
        return this._metaTable.getName();
    }

    get logger() {
        return this._parent.logger;
    }

    synchronizer(filterValues, skipDelete)
    {
        return new DataStoreTableSynchronizer(this, filterValues, skipDelete);
    }

    queryMany(target, fields)
    {
        return this._queryItems(target, fields);
    }

    querySingle(target, fields)
    {
        return this._queryItems(target, fields)
            .then(result => {
                if (result.length == 0) {
                    return null;
                }
                return result[0];
            });
    }

    _queryItems(target, fields)
    {
        var target = this._buildTarget(target);
        fields = fields || this._metaTable.getQueryFields();
        return this._execute(
            this._buildSelectSql(fields, _.keys(target)),
            _.keys(target),
            target
        ).then(result => {
            return result.map(x => this._massageUserRow(x))
        })
    }

    create(data)
    {
        var data = this._buildTarget(data);
        return this._execute(
            this._buildInsertSql(this._metaTable.getCreateFields()),
            this._metaTable.getCreateFields(),
            data
        )
        .then(result => {
            if (result.insertId) {
                var keyColumn = this._metaTable.getKeyFields()[0];
                if (keyColumn)
                {
                    data[keyColumn] = result.insertId;
                }
            }
            return data;
        });
    }

    delete(data)
    {
        var data = this._buildTarget(data);
        return this._execute(
            this._buildDeleteSql(this._metaTable.getModifyFields()),
            this._metaTable.getModifyFields(),
            data
        ).then(() => {});
    }

    update(target, data)
    {
        var target = this._buildTarget(target);
        var fields = _.keys(data);
        var combinedData = _.defaults(_.clone(target), data);
        return this._execute(
            this._buildUpdateSql(fields, _.keys(target)),
            _.concat(
                fields,
                _.keys(target)
            ),
            combinedData
        ).then(() => {});
    }

    _buildSelectSql(what, filters)
    {
        what = what || [];
        var fields = what.map(x => '`' + x + '`');

        filters = filters || [];
        var whereClause = '';
        if (filters.length > 0)
        {
            whereClause = ' WHERE ' + 
                filters.map(x => '`' + x + '` = ?').join(' AND ');
        }

        var sql = 'SELECT ' + 
            fields.join(', ') +
            ' FROM `' + this.name + '`' +
            whereClause + 
            ';'
        ;

        return sql;
    }

    _buildInsertSql(what)
    {
        what = what || [];

        var fields = what.map(x => '`' + x + '`');

        var sql = 'INSERT INTO ' + 
            '`' + this.name + '` (' +
            fields.join(', ') +
            ') VALUES (' + 
            fields.map(x => '?').join(', ') +
            ');';

        return sql;
    }

    _buildDeleteSql(filters)
    {
        filters = filters || [];

        var sql = 'DELETE FROM ' + 
            '`' + this.name + '` ' +
            ' WHERE ' +
            filters.map(x => '`' + x + '` = ?').join(' AND ');
            ');';

        return sql;
    }

    _buildUpdateSql(what, filters)
    {
        what = what || [];
        var updateClause = 
            what.map(x => '`' + x + '` = ?').join(', ');

        filters = filters || [];
        var whereClause = 
            filters.map(x => '`' + x + '` = ?').join(' AND ');

        var sql = 'UPDATE `' + this.name + '`' +
            ' SET ' +
            updateClause + 
            ' WHERE ' + 
            whereClause + 
            ';'
        ;

        return sql;
    }

    _buildTarget(target)
    {
        return target || {};
    }

    _execute(sql, fields, data)
    {
        var statement = this._mysqlDriver.statement(sql);
        var params = fields.map(x => {
            var columnMeta = this._metaTable.getColumn(x);
            var value = data[x];
            value = columnMeta._makeDbValue(value);
            return value;
        });
        return statement.execute(params);
    }

    _massageUserRow(row)
    {
        for(var column of this._metaTable.getMassageableColumns())
        {
            var value = column._makeUserValue(row[column.name]);
            row[column.name] = value;
        }
        return row;
    }
}

module.exports = DataStoreTable;