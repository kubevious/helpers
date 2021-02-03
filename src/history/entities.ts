export interface DBRawSnapshot 
{
    id: any, 
    part: any, 
    date: any, 
}
export interface BaseSnapshotItem
{
    dn: any, 
    kind: any, 
    config_kind: any, 
    name: any
}

export interface DBRawSnapItem extends BaseSnapshotItem
{
    id: any, 
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