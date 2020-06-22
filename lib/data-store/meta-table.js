const _ = require('the-lodash');
const MetaTableColumn = require('./meta-table-column');

class MetaTable
{
    constructor(parent, name)
    {
        this._parent = parent;
        this._name = name;

        this._columns = {};

        this._keyFields = [];
        this._queryFields = [];
        this._createFields = [];
        this._deleteFields = [];
    }

    _makeColumn(name)
    {
        if (!this._columns[name]) {
            this._columns[name] = new MetaTableColumn(this, name);
        }
        return this._columns[name];
    }

    getName() {
        return this._name;
    }

    getKeyFields() {
        return this._keyFields;
    }

    getQueryFields() {
        return this._queryFields;
    }

    getCreateFields() {
        return this._createFields;
    }

    getUpdateFields() {
        return this._createFields;
    }

    getDeleteFields() {
        return this._deleteFields;
    }

    getColumn(name)
    {
        var column = this._columns[name];
        if (!column) {
            throw new Error("Unknown Column: " + name);;
        }
        return column;
    }

    getMassageableColumns()
    {
        return _.values(this._columns).filter(x => x._fromDbCb);
    }

    table(name)
    {
        return this._parent.table(name);
    }

    key(name)
    {
        var column = this._makeColumn(name);
        column.isKey = true;
        column.isSettable = false;

        this._keyFields = 
            _.values(this._columns)
                .filter(x => x.isKey)
                .map(x => x.name);

        this._buildQueryFields();
        this._buildModifyFields();
        return column;
    }

    field(name)
    {
        var column = this._makeColumn(name);

        this._buildQueryFields();
        this._buildCreateFields();
        return column;
    }

    _buildQueryFields()
    {
        this._queryFields = _.concat(
            _.values(this._columns).filter(x => x.isKey),
            _.values(this._columns).filter(x => !x.isKey)
            )
            .map(x => x.name);
    }

    _buildCreateFields()
    {
        this._createFields = _.concat(
            _.values(this._columns).filter(x => x.isSettable)
            )
            .map(x => x.name);
    }

    _buildModifyFields()
    {
        this._deleteFields = _.concat(
            _.values(this._columns).filter(x => x.isKey)
            )
            .map(x => x.name);
    }
}

module.exports = MetaTable;