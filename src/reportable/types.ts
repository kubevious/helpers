export interface RequestReportSnapshot {
    date: string
    version: string
    snapshot_id?: string 
}

export interface ResponseReportSnapshot {
    id?: string 
    delay?: boolean
    delaySeconds?: number
    new_snapshot?: boolean
    item_reporter_count?: number
    config_reporter_count?: number
    config_reporter_size_kb?: number
    config_reporter_compression?: boolean
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

export interface RequestReportChunks {
    chunks: ReportableDataItem[]
}

export interface ReportableSnapshotItem {
    idHash: string
    present: boolean
    configHash?: string
}

export interface ReportableDataItem {
    hash: string,
    data: string
}