const Promise = require('the-promise');
const _ = require('the-lodash');
const MySqlDriver = require('kubevious-helper-mysql');
const DataStoreTable = require('./data-store-table');
const MetaStore = require('./meta-store');

class DataStore
{
    constructor(logger, isDebug)
    {
        this._meta = new MetaStore();
        this._logger = logger;
        this._isDebug = isDebug;

        this._mysqlDriver = new MySqlDriver(this._logger, null, isDebug);
    }

    get logger() {
        return this._logger;
    }

    get mysql() {
        return this._mysqlDriver;
    }

    get isConnected() {
        return this.mysql.isConnected;
    }

    meta() {
        return this._meta;
    }

    connect()
    {
        this._mysqlDriver.connect();
    }

    waitConnect()
    {
        return Promise.all([
            this._mysqlDriver.waitConnect()
        ])
    }

    close()
    {
        this._mysqlDriver.close();
    }

    table(name)
    {
        var metaTable = this._meta.getTable(name);
        return new DataStoreTable(this, metaTable);
    }

    scope(scope)
    {
        return {
            table: (name) => {
                var metaTable = this._meta.getTable(name);
                return new DataStoreTable(this, metaTable, scope);
            }
        }
    }

}

module.exports = DataStore