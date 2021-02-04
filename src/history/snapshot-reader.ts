import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger' ;
import { DBSnapshot, Snapshot } from './snapshot';
import { SnapshotReconstructor, SnapshotReconstructorWithHashes } from './snapshot-reconstructor';
import * as Partitioning from './partitioning';
import { SnapshotItem, DiffItem, TimelineSample, DBRawSnapItem, DBRawDiffItem, DBRawSnapshot, DBRawDiff, SnapItemWithConfig } from './entities'

export type ConfigKindFilter = undefined | string | string[];

export class SnapshotReader
{
    private _logger : ILogger;
    
    private _driver : any;
    private _statements : Record<string, any> = {};

    constructor(logger: ILogger, driver : any)
    {
        this._logger = logger.sublogger('HistorySnapshotReader');
        this._driver = driver;

        this._registerStatements();
    }

    get logger() {
        return this._logger;
    }

    /*** PUBLIC ***/

    reconstructDiffNodesShapshot(diffId: number) : Promise<DBSnapshot<SnapItemWithConfig>>
    {
        return this.queryDiffById(diffId)
            .then(diffRow => {
                if (!diffRow) {
                    this.logger.warn('[reconstructDiffNodesShapshot] Diff not found: %s', diffId);
                    return new DBSnapshot<SnapItemWithConfig>(null);
                }

                this.logger.info('[reconstructDiffNodesShapshot] DiffId: %s, SnapshotId: %s, Date: %s', 
                    diffRow.id, diffRow.snapshot_id, diffRow.date);

                let snapshotReconstructor : SnapshotReconstructorWithHashes;
                return Promise.resolve()
                    .then(() => this.querySnapshotItemWithHashes(diffRow.part, diffRow.snapshot_id, 'node'))
                    .then(snapshotItems => {
                        snapshotReconstructor = new SnapshotReconstructorWithHashes(snapshotItems);
                        return this._queryDiffsForDiffId(diffRow.part, diffRow.snapshot_id, diffRow.id!);
                    })
                    .then(diffs => {
                        return this._queryDiffsItemsWithHashes(diffs, 'node')
                    })
                    .then(diffsItems => {
                        snapshotReconstructor.applyDiffsItems(diffsItems);
                        return snapshotReconstructor.getSnapshot();
                    })
                    .then(snapshot => {
                        const finalSnapshot = new DBSnapshot<SnapItemWithConfig>(snapshot.date);
                        return Promise.serial(snapshot.getItems(), x => {
                            return this.queryConfigHash(diffRow.part, x.config_hash)
                                .then(config => {
                                    const item = <SnapItemWithConfig>x;
                                    item.config = config;
                                    finalSnapshot.addItem(item);
                                    return item;
                                })
                        })
                        .then(() => finalSnapshot);
                    })
                    ;
            })
    }

    querySnapshotForDate(date: any, configKind?: any) : Promise<Snapshot | null>
    {  
        return this._findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this._reconstructSnapshot(diffObj.part, diffObj.snapshot_id, date, configKind, null);
            }) 
    }

    queryDnSnapshotForDate(dn: string, date: any, configKind?: any) : Promise<Snapshot | null>
    {
        return this._findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this._reconstructSnapshot(diffObj.part, diffObj.snapshot_id, date, configKind, { dn: dn });
            }) 
    }

    queryScopedSnapshotForDate(dn: string, date: any, configKind?: any) : Promise<Snapshot | null>
    {
        return this._findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this._reconstructSnapshot(diffObj.part, diffObj.snapshot_id, date, configKind, { dn: dn, scoped: true });
            }) 
    }

    queryTimeline(from: any, to: any)
    {   
        let sql = 'SELECT `date`, `changes`, `error`, `warn`';
        sql += ' FROM `timeline`';

        let params = [];

        let filters = [];
        if (_.isNotNullOrUndefined(from))
        {
            let partitionFrom = Partitioning.calculateDatePartition(from);
            filters.push('(`part` >= ?)');
            params.push(partitionFrom);

            filters.push('(`date` >= ?)');
            params.push(from);
        }
        if (_.isNotNullOrUndefined(to))
        {
            let partitionTo = Partitioning.calculateDatePartition(to);
            filters.push('(`part` <= ?)');
            params.push(partitionTo);

            filters.push('(`date` <= ?)');
            params.push(to);
        }

        if (filters.length > 0)
        {
            sql += ' WHERE ';
            sql += filters.join(' AND ');
        }

        return this._executeSql<TimelineSample[]>(sql, params);
    }

    querySnapshotItems(partition: number, snapshotId: number, configKind?: ConfigKindFilter, dnFilter?: any)
    {
        let conditions = [];
        let params : any[] = []

        conditions.push('`snapshot_id` = ?')
        params.push(snapshotId);

        this._applyDnFilter(dnFilter, conditions, params);

        let configKindFilter = this._massageConfigKind(configKind);
        if (configKindFilter)
        {
            let configSqlParts = []
            for(let kind of configKindFilter)
            {
                configSqlParts.push('`config_kind` = ?');
                params.push(kind);
            } 
            conditions.push('(' + configSqlParts.join(' OR ') + ')');
        }

        conditions.push('(`snap_items`.`part` = ?)');
        conditions.push('(`config_hashes`.`part` = ?)');
        params.push(partition);
        params.push(partition);

        let sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `value` as `config`';
        sql += ' FROM `snap_items`';
        sql += ' INNER JOIN `config_hashes`';
        sql += ' ON `snap_items`.`config_hash` = `config_hashes`.`key`';

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql<SnapshotItem[]>(sql, params);
    }

    querySnapshotItemWithHashes(partition: number, snapshotId: number, configKind?: ConfigKindFilter, dnFilter?: any) : Promise<DBRawSnapItem[]>
    {
        let conditions = [];
        let params : any[] = []

        conditions.push('`snapshot_id` = ?')
        params.push(snapshotId);

        this._applyDnFilter(dnFilter, conditions, params);

        let configKindFilter = this._massageConfigKind(configKind);
        if (configKindFilter)
        {
            let configSqlParts = []
            for(let kind of configKindFilter)
            {
                configSqlParts.push('`config_kind` = ?');
                params.push(kind);
            } 
            conditions.push('(' + configSqlParts.join(' OR ') + ')');
        }

        conditions.push('(`snap_items`.`part` = ?)');
        params.push(partition);

        let sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config_hash`';
        sql += ' FROM `snap_items`';

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql<DBRawSnapItem[]>(sql, params);
    }

    queryDiffItems(partition: number, diffId: string, configKind?: any, dnFilter?: any)
    {
        let conditions = [];
        let params : any[] = []

        conditions.push('`diff_id` = ?')
        params.push(diffId)

        this._applyDnFilter(dnFilter, conditions, params);

        configKind = this._massageConfigKind(configKind);
        if (configKind)
        {
            let configSqlParts = []
            for(let kind of configKind)
            {
                configSqlParts.push('`config_kind` = ?');
                params.push(kind);
            } 
            conditions.push('(' + configSqlParts.join(' OR ') + ')');
        }

        conditions.push('(`diff_items`.`part` = ?)');
        conditions.push('(`config_hashes`.`part` = ?)');
        params.push(partition);
        params.push(partition);

        let sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `value` as `config`'
            + ' FROM `diff_items`'
            + ' INNER JOIN `config_hashes`'
            + ' ON `diff_items`.`config_hash` = `config_hashes`.`key`'
            ;

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql<DiffItem[]>(sql, params);
    }

    queryDiffItemsWithHashes(partition: number, diffId: string, configKind?: ConfigKindFilter, dnFilter?: any) : Promise<DBRawDiffItem[]>
    {
        let conditions = [];
        let params : any[] = []

        conditions.push('`diff_id` = ?')
        params.push(diffId)

        this._applyDnFilter(dnFilter, conditions, params);

        let configKindFilter = this._massageConfigKind(configKind);
        if (configKindFilter)
        {
            let configSqlParts = []
            for(let kind of configKindFilter)
            {
                configSqlParts.push('`config_kind` = ?');
                params.push(kind);
            } 
            conditions.push('(' + configSqlParts.join(' OR ') + ')');
        }

        conditions.push('(`diff_items`.`part` = ?)');
        params.push(partition);

        let sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config_hash`'
            + ' FROM `diff_items`'
            ;

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql<DBRawDiffItem[]>(sql, params);
    }

    queryConfigHash(partition: number, key: Buffer) : Promise<any | null>
    {
        return this._execute('GET_CONFIG_HASH', [ key, partition ])
            .then(results => {
                if (results.length == 0) {
                    return null;
                }
                let row : any = _.head(results);
                return row.value;
            })
    }


    /*** INTERNALS ***/

    private _registerStatements()
    {
        this._registerStatement('GET_SNAPSHOT_BY_ID', 'SELECT * FROM `snapshots` WHERE `id` = ?;');

        this._registerStatement('GET_DIFF_BY_ID', 'SELECT * FROM `diffs` WHERE `id` = ?;');
        
        this._registerStatement('FIND_DIFF_FOR_DATE', 'SELECT * FROM `diffs` WHERE `date` <= ? ORDER BY `date` DESC LIMIT 1;');

        this._registerStatement('GET_CONFIG_HASH', 'SELECT `value` FROM `config_hashes` WHERE `key` = ? AND `part` = ?;');
    }

    private _registerStatement(name: string, sql: string)
    {
        this._statements[name] = this._driver.statement(sql);
    }

    private _reconstructSnapshot(partition: number, snapshotId: number, date?: any, configKind?: string, dnFilter?: any) : Promise<Snapshot>
    {
        let snapshotReconstructor : SnapshotReconstructor;
        return Promise.resolve()
            .then(() => this.querySnapshotItems(partition, snapshotId, configKind, dnFilter))
            .then(snapshotItems => {
                snapshotReconstructor = new SnapshotReconstructor(snapshotItems);
                return this._queryDiffsForSnapshotAndDate(partition, snapshotId, date)
            })
            .then(diffs => {
                return this._queryDiffsItems(diffs, configKind, dnFilter)
            })
            .then(diffsItems => {
                snapshotReconstructor.applyDiffsItems(diffsItems);
                return snapshotReconstructor.getSnapshot();
            })
            ;
    }

    // private _reconstructSnapshotWithHashes(partition: number, snapshotId: number, date?: any, configKind?: string, dnFilter?: any) : Promise<DBSnapshot<DBRawSnapItem>>
    // {
    //     let snapshotReconstructor : SnapshotReconstructorWithHashes;
    //     return Promise.resolve()
    //         .then(() => this.querySnapshotItemWithHashes(partition, snapshotId, configKind, dnFilter))
    //         .then(snapshotItems => {
    //             snapshotReconstructor = new SnapshotReconstructorWithHashes(snapshotItems);
    //             return this._queryDiffsForSnapshotAndDate(partition, snapshotId, date)
    //         })
    //         .then(diffs => {
    //             return this._queryDiffsItemsWithHashes(diffs, configKind, dnFilter)
    //         })
    //         .then(diffsItems => {
    //             snapshotReconstructor.applyDiffsItems(diffsItems);
    //             return snapshotReconstructor.getSnapshot();
    //         })
    //         ;
    // }

    private _queryDiffsItems(diffs: any[], configKind?: any, dnFilter?: any) : Promise<any>
    {
        return Promise.serial(diffs, diff => {
            return this.queryDiffItems(diff.part, diff.id, configKind, dnFilter);
        });
    }

    private _queryDiffsItemsWithHashes(diffs: any[], configKind?: ConfigKindFilter, dnFilter?: any) : Promise<DBRawDiffItem[][]>
    {
        return Promise.serial(diffs, diff => {
            return this.queryDiffItemsWithHashes(diff.part, diff.id, configKind, dnFilter);
        });
    }

    private _findDiffForDate(date: any) : Promise<any>
    {
        return this._execute('FIND_DIFF_FOR_DATE', [date])
            .then(results => {
                if (results.length == 0) {
                    return null;
                }
                let diff : any = _.head(results);
                return diff;
            })
    }

    private _queryDiffsForSnapshotAndDate(partition: number, snapshotId: number, date: any) : Promise<any>
    {
        let sql = 'SELECT *';
        sql += ' FROM `diffs`';

        let params = [];

        let filters = [];
        filters.push('(`part` = ?)');
        params.push(partition);

        filters.push('(`in_snapshot` = 0)');
        
        filters.push('(`snapshot_id` = ?)')
        params.push(snapshotId);

        if (date)
        {
            filters.push('(`date` <= ? )')
            params.push(date);
        }

        if (filters.length > 0)
        {
            sql += ' WHERE ';
            sql += filters.join(' AND ');
        }

        return this._executeSql(sql, params);
    }

    private _queryDiffsForDiffId(partition: number, snapshotId: number, diffId: number) : Promise<DBRawDiff[]>
    {
        let sql = 'SELECT *';
        sql += ' FROM `diffs`';

        let params = [];
        let filters = [];

        filters.push('(`part` = ?)');
        params.push(partition);

        filters.push('(`in_snapshot` = 0)');
        
        filters.push('(`snapshot_id` = ?)')
        params.push(snapshotId);

        filters.push('(`id` <= ? )')
        params.push(diffId);

        if (filters.length > 0)
        {
            sql += ' WHERE ';
            sql += filters.join(' AND ');
        }

        return this._executeSql<DBRawDiff[]>(sql, params);
    }

    private querySnapshotById(id: number) : Promise<DBRawSnapshot | null>
    {
        return this._execute('GET_SNAPSHOT_BY_ID', [ id ])
            .then(results => {
                if (results.length == 0) {
                    return null;
                }
                let item = <DBRawSnapshot>_.head(results);
                item.date = new Date(item.date);
                return item;
            });
    }

    private queryDiffById(id: number) : Promise<DBRawDiff | null>
    {
        return this._execute('GET_DIFF_BY_ID', [ id ])
            .then(results => {
                if (results.length == 0) {
                    return null;
                }
                let item = <any>_.head(results);
                item.date = new Date(item.date);
                item.in_snapshot = (item.in_snapshot == 1);
                return <DBRawDiff>item;
            });
    }

    /**  **/

    private _massageConfigKind(configKind : ConfigKindFilter) : null | string[]
    {
        if (configKind)
        {
            if (!_.isArray(configKind))
            {
                return [ configKind ];
            }
            else 
            {
                if (configKind.length == 0)
                {
                    return null;
                }
            }
        }
        else
        {
            return null;
        }
        return configKind;
    }

    private _applyDnFilter(dnFilter: any, conditions: any, params: any[])
    {
        if (dnFilter)
        {
            if (dnFilter.dn)
            {
                if (dnFilter.scoped)
                {
                    conditions.push('`dn` LIKE ?');
                    params.push(dnFilter.dn + '%');
                }
                else
                {
                    conditions.push('`dn` = ?');
                    params.push(dnFilter.dn);
                }
            }
        }
    }

    private _execute(statementId: string, params?: any) : Promise<any>
    {
        let statement = this._statements[statementId];
        return statement.execute(params);
    }

    private _executeSql<T>(sql: string, params?: any) : Promise<T>
    {
        return this._driver.executeSql(sql, params);
    }

}
