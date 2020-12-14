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