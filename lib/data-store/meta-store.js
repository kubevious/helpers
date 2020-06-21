const _ = require('the-lodash');
const MetaTable = require('./meta-table');

class MetaStore
{
    constructor()
    {
        this._tables = {};
    }

    getTable(name)
    {
        var table = this._tables[name];
        if (!table) {
            throw new Error("Unknown table: " + name);
        } 
        return table;
    }

    table(name)
    {
        var table = new MetaTable(this, name);
        this._tables[name] = table;
        return table;
    }
    
}

module.exports = MetaStore;