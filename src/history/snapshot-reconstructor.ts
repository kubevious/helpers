import _ from 'the-lodash';
import { Snapshot } from './snapshot';

export class SnapshotReconstructor
{
    private _snapshot : Snapshot;

    constructor(snapshotItems : any)
    {
        this._snapshot = new Snapshot(null);

        if (snapshotItems)
        {
            for(var item of snapshotItems)
            {
                delete item.id;
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