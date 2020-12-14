import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger' ;
import { Snapshot } from './snapshot';
import { SnapshotReconstructor } from './snapshot-reconstructor';
import * as Partitioning from './partitioning';
import { SnapshotItem, DiffItem, TimelineSample } from './entities'

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

    reconstructRecentShapshot() : Promise<Snapshot>
    {
        return this._queryRecentSnapshot()
            .then(snapshot => {
                this.logger.info('[reconstructRecentShapshot] db snapshot: ', snapshot);
                if (!snapshot) {
                    return new Snapshot(null);
                }
                return this._reconstructSnapshot(snapshot.part, snapshot.id);
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

    querySnapshotItems(partition: number, snapshotId: string, configKindFilter?: any, dnFilter?: any)
    {
        var conditions = [];
        var params : any[] = []

        conditions.push('`snapshot_id` = ?')
        params.push(snapshotId);

        this._applyDnFilter(dnFilter, conditions, params);

        configKindFilter = this._massageConfigKind(configKindFilter);
        if (configKindFilter)
        {
            var configSqlParts = []
            for(var kind of configKindFilter)
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

        var sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `value` as `config`';
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

    queryDiffItems(partition: number, diffId: string, configKind?: any, dnFilter?: any)
    {
        var conditions = [];
        var params : any[] = []

        conditions.push('`diff_id` = ?')
        params.push(diffId)

        this._applyDnFilter(dnFilter, conditions, params);

        configKind = this._massageConfigKind(configKind);
        if (configKind)
        {
            var configSqlParts = []
            for(var kind of configKind)
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

        var sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `value` as `config`'
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

    /*** INTERNALS ***/

    private _registerStatements()
    {
        this._registerStatement('GET_RECENT_SNAPSHOT', 'SELECT * FROM `snapshots` ORDER BY `date` DESC LIMIT 1;');
        
        this._registerStatement('FIND_DIFF_FOR_DATE', 'SELECT * FROM `diffs` WHERE `date` <= ? ORDER BY `date` DESC LIMIT 1;');
    }

    private _registerStatement(name: string, sql: string)
    {
        this._statements[name] = this._driver.statement(sql);
    }

    private _reconstructSnapshot(partition: number, snapshotId: string, date?: any, configKind?: string, dnFilter?: any) : Promise<Snapshot>
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


    private _queryDiffsItems(diffs: any[], configKind?: any, dnFilter?: any) : Promise<any>
    {
        return Promise.serial(diffs, diff => {
            return this.queryDiffItems(diff.part, diff.id, configKind, dnFilter);
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

    private _queryDiffsForSnapshotAndDate(partition: number, snapshotId: string, date: any) : Promise<any>
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

    private _queryRecentSnapshot() : Promise<any>
    {
        return this._execute('GET_RECENT_SNAPSHOT')
            .then(results => {
                return _.head(results);
            });
    }

    /**  **/

    private _massageConfigKind(configKind : any) : any
    {
        if (configKind)
        {
            if (!_.isArray(configKind))
            {
                configKind = [ configKind ];
            }
            else 
            {
                if (configKind.length == 0)
                {
                    configKind = null;
                }
            }
        }
        else
        {
            configKind = null;
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
        var statement = this._statements[statementId];
        return statement.execute(params);
    }

    private _executeSql<T>(sql: string, params?: any) : Promise<T>
    {
        return this._driver.executeSql(sql, params);
    }

}
