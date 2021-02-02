export interface RequestReportSnapshot {
    date: string
    version: string
    snapshot_id?: string 
}

export interface ResponseReportSnapshot {
    new_snapshot?: boolean
    id?: string 
}

export interface RequestReportSnapshotItems {
    snapshot_id: string
    items: ReportableSnapshotItem[]
}

export interface ResponseReportSnapshotItems {
    new_snapshot?: boolean
    needed_configs?: string[]
}

export interface RequestActivateSnapshot {
    snapshot_id: string
}

export interface ResponseActivateSnapshot {
    new_snapshot?: boolean
}

export interface RequestReportConfig {
    hash: string
    config: any
}

export interface ReportableSnapshotItem {
    idHash: string
    present: boolean
    configHash?: string
}

