
export interface SnapshotInfo
{
    date: Date;
    items: SnapshotItemInfo[];
}

export interface SnapshotItemInfo
{
    dn: string;
    kind: string;
    config_kind: SnapshotConfigKind;
    config: SnapshotNodeConfig | SnapshotPropsConfig | SnapshotAlertsConfig;
}

export interface SnapshotNodeConfig
{
    kind: string;
    rn: string;
    name?: string;
}

export interface SnapshotPropsConfig
{
    kind: string;
    id: string;
    title: string;
    order?: number;
    config: any;
}

export type SnapshotAlertsConfig = Alert[];

export interface AlertCounter {
    error: number,
    warn: number
}

export interface Alert
{
    id: string,
    severity: string,
    msg: string,
    source?: any
}

export enum SnapshotConfigKind
{
    node = 'node',
    props = 'props',
    alerts = 'alerts',
    children = 'children'
} 
