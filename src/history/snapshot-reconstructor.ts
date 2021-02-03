import _ from 'the-lodash';
import { DBRawDiffItem, DBRawSnapItem } from './entities';
import { DBSnapshot, Snapshot } from './snapshot';

export class SnapshotReconstructorWithHashes
{
    private _snapshot : DBSnapshot<DBRawSnapItem>;

    constructor(snapshotItems : DBRawSnapItem[])
    {
        this._snapshot = new DBSnapshot<DBRawSnapItem>(null);

        if (snapshotItems)
        {
            for(var item of snapshotItems)
            {
                // TODO: check
                // delete item.id;
                this._snapshot.addItem(item);
            }
        }
    }
    
    applyDiffsItems(diffsItems : DBRawDiffItem[][])
    {
        for(var diffItems of diffsItems)
        {
            this.applyDiffItems(diffItems)
        }
    }

    applyDiffItems(diffItems : DBRawDiffItem[])
    {
        for(var item of diffItems)
        {
            // TODO: check
            // delete item.id;
            if (item.present)
            {
                this._snapshot.addItem(item);
            }
            else
            {
                this._snapshot.deleteItem(item);
            }
        }
    }

    getSnapshot() : DBSnapshot<DBRawSnapItem>
    {
        return this._snapshot;
    }

}


export class SnapshotReconstructor
{
    private _snapshot : Snapshot;

    constructor(snapshotItems : any[])
    {
        this._snapshot = new Snapshot(null);

        if (snapshotItems)
        {
            for(var item of snapshotItems)
            {
                // delete item.id;
                this._snapshot.addItem(item);
            }
        }
    }
    
    applyDiffsItems(diffsItems : any[])
    {
        for(var diffItems of diffsItems)
        {
            this.applyDiffItems(diffItems)
        }
    }

    applyDiffItems(diffItems : any[])
    {
        for(var item of diffItems)
        {
            delete item.id;
            if (item.present)
            {
                this._snapshot.addItem(item);
            }
            else
            {
                this._snapshot.deleteItem(item);
            }
        }
    }

    getSnapshot() : Snapshot
    {
        return this._snapshot;
    }

}