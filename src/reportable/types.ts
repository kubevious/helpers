export interface RequestReportSnapshot {
    date: string
    version: string
    snapshot_id?: string 
}

export interface ResponseReportSnapshot {
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

export interface ReportableSnapshotItem {
    idHash: string
    present: boolean
    configHash?: string
}
