export interface DBRawSnapshot 
{
    id?: number, 
    part: number, 
    date: Date
}

export interface DBRawDiff 
{
    id?: number, 
    part: number, 
    snapshot_id: number, 
    date: Date,
    in_snapshot: boolean,
    summary?: {}
}

export interface BaseSnapshotItem
{
    dn: any, 
    kind: any, 
    config_kind: any, 
    name?: any
}

export interface DBRawSnapItem extends BaseSnapshotItem
{
    id?: any, 
    config_hash: any
}
export interface DBRawDiffItem extends DBRawSnapItem
{
    present: any
}

export interface SnapshotItem
{
    id: any, 
    dn: any, 
    kind: any, 
    config_kind: any, 
    name: any, 
    config: any
}

export interface DiffItem{
    id: any, 
    dn: any, 
    kind: any, 
    config_kind: any, 
    name: any, 
    present: any, 
    config: any
}

export interface TimelineSample
{
    date: any, 
    changes: any, 
    error: any, 
    warn: any
}

export interface SnapItemWithConfig extends DBRawSnapItem {
    config: any
}