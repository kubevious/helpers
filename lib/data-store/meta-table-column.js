const _ = require('the-lodash');

class MetaTableColumn
{
    constructor(parent, name)
    {
        this._parent = parent;
        this._name = name;

        this._toDbCb = null;
        this._fromDbCb = null;
        
        this.isSettable = true;
        this.isKey = false;
    }

    get name() {
        return this._name;
    }

    table(name)
    {
        return this._parent.table(name);
    }
    
    key(name)
    {
        return this._parent.key(name);
    }

    field(name)
    {
        return this._parent.field(name);
    }

    settable()
    {
        this.isSettable = true;
        return this;
    }

    to(cb)
    {
        this._toDbCb = cb;
        return this;
    }

    from(cb)
    {
        this._fromDbCb = cb;
        return this;
    }

    _makeDbValue(value)
    {
        if (this._toDbCb) {
            return this._toDbCb(value);
        }
        return value;
    }

    _makeUserValue(value)
    {
        if (this._fromDbCb) {
            return this._fromDbCb(value);
        }
        return value;
    }
}

module.exports = MetaTableColumn;