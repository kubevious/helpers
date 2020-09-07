const Promise = require('the-promise');
const _ = require('the-lodash');
const Snapshot = require("./snapshot");
const Partitioning = require("./partitioning");
const SnapshotReconstructor = require("./snapshot-reconstructor");

class HistorySnapshotReader
{
    constructor(logger, driver)
    {
        this._logger = logger.sublogger('HistorySnapshotReader');
        this._driver = driver;

        this._statements = {};
        this._registerStatements();
    }

    get logger() {
        return this._logger;
    }

    /*** PUBLIC ***/

    reconstructRecentShapshot()
    {
        return this._queryRecentSnapshot()
            .then(snapshot => {
                this.logger.info('[reconstructRecentShapshot] db snapshot: ', snapshot);
                if (!snapshot) {
                    return new Snapshot();
                }
                return this._reconstructSnapshotById(snapshot.part, snapshot.id);
            })
    }

    querySnapshotForDate(date, configKind)
    {  
        return this._findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this._reconstructSnapshotByIdAndDiffDate(diffObj.part, diffObj.snapshot_id, date, configKind, null);
            }) 
    }

    queryDnSnapshotForDate(dn, date, configKind)
    {
        return this._findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this._reconstructSnapshotByIdAndDiffDate(diffObj.part, diffObj.snapshot_id, date, configKind, { dn: dn });
            }) 
    }

    queryScopedSnapshotForDate(dn, date, configKind)
    {
        return this._findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this._reconstructSnapshotByIdAndDiffDate(diffObj.part, diffObj.snapshot_id, date, configKind, { dn: dn, scoped: true });
            }) 
    }

    queryTimeline(from, to)
    {   
        let sql = 'SELECT *';
        sql += ' FROM `diffs`';

        let params = [];
        let partitions = [];

        let filters = [];
        if (_.isNotNullOrUndefined(from))
        {
            filters.push('(`date` >= ?)');
            params.push(from);
        }
        if (_.isNotNullOrUndefined(to))
        {
            filters.push('(`date` <= ?)');
            params.push(to);
        }

        if (_.isNotNullOrUndefined(from) && _.isNotNullOrUndefined(to))
        {
            let partitionFrom = Paritioning.calculateDatePartition(from);
            let partitionTo = Paritioning.calculateDatePartition(to);
            for(let partition = partitionFrom; partition <= partitionTo; partition++)
            {
                partitions.push(partition);
            }
        }

        if (partitions.length > 0)
        {
            sql += ' PARTITION(';
            sql += partitions.join(', ');
            sql += ') ';
        }

        if (filters.length > 0)
        {
            sql += ' WHERE ';
            sql += filters.join(' AND ');
        }

        return this._executeSql(sql, params);
    }


    /*** INTERNALS ***/

    _registerStatements()
    {
        this._registerStatement('GET_RECENT_SNAPSHOT', 'SELECT * FROM `snapshots` ORDER BY `date` DESC LIMIT 1;');
        
        this._registerStatement('FIND_DIFF_FOR_DATE', 'SELECT * FROM `diffs` WHERE `date` <= ? ORDER BY `date` DESC LIMIT 1;');
    }

    _registerStatement(name, sql)
    {
        this._statements[name] = this._driver.statement(sql);
    }

    _reconstructSnapshotByIdAndDiffDate(partition, snapshotId, date, configKind, dnFilter)
    {
        var snapshotReconstructor = null;
        return Promise.resolve()
            .then(() => this._querySnapshotItemsEx(partition, snapshotId, configKind, dnFilter))
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

    _reconstructSnapshotById(partition, snapshotId)
    {
        var snapshotReconstructor = null;
        return Promise.resolve()
            .then(() => this._querySnapshotItemsEx(partition, snapshotId))
            .then(snapshotItems => {
                snapshotReconstructor = new SnapshotReconstructor(snapshotItems);
                return this._queryDiffsForSnapshot(partition, snapshotId)
            })
            .then(diffs => {
                return this._queryDiffsItems(diffs, true)
            })
            .then(diffsItems => {
                snapshotReconstructor.applyDiffsItems(diffsItems);
                return snapshotReconstructor.getSnapshot();
            })
            ;
    }

    _querySnapshotItemsEx(partition, snapshotId, configKindFilter, dnFilter)
    {
        var conditions = [];
        var params = []

        conditions.push('`snapshot_id` = ?')
        params.push(snapshotId);

        this._applyDnFilter(dnFilter, conditions, params);

        configKindFilter = this._massageConfigKind(configKindFilter);
        if (configKindFilter)
        {
            var configSqlParts = []
            for(var kind of configKind)
            {
                configSqlParts.push('`config_kind` = ?');
                params.push(kind);
            } 
            conditions.push('(' + configSqlParts.join(' OR ') + ')');
        }

        let pName = Partitioning.partitionName(partition);
        var sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `value` as `config`'
            + ' FROM `snap_items` PARTITION(' + pName + ')'
            + ' INNER JOIN `config_hashes` PARTITION(' + pName + ')'
            + ' ON `snap_items`.`config_hash` = `config_hashes`.`key`'
            ;

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql(sql, params);
    }

    _queryDiffsItems(diffs, configKind, dnFilter)
    {
        return Promise.serial(diffs, diff => {
            return this._queryDiffItems(diff.part, diff.id, configKind, dnFilter);
        });
    }

    _queryDiffItems(partition, diffId, configKind, dnFilter)
    {
        var conditions = [];
        var params = []

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

        let pName = Partitioning.partitionName(partition);

        var sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `value` as `config`'
            + ' FROM `diff_items` PARTITION(' + pName + ')'
            + ' INNER JOIN `config_hashes` PARTITION(' + pName + ')'
            + ' ON `diff_items`.`config_hash` = `config_hashes`.`key`'
            ;

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql(sql, params);
    }

    _findDiffForDate(date)
    {
        return this._execute('FIND_DIFF_FOR_DATE', [date])
            .then(results => {
                if (results.length == 0) {
                    return null;
                }
                var diff = _.head(results);
                return diff;
            })
    }

    _queryDiffsForSnapshotAndDate(partition, snapshotId, date)
    {
        let sql = 'SELECT *';
        sql += ' FROM `diffs`';

        let params = [];
        let partitions = [ Partitioning.partitionName(partition) ];

        let filters = [];
        filters.push('(`in_snapshot` = 0)');
        
        filters.push('(`snapshot_id` = ?)')
        params.push(snapshotId);

        if (date)
        {
            filters.push('(`date` <= ? )')
            params.push(date);
        }

        if (_.isNotNullOrUndefined(from))
        {
            filters.push('(`date` >= ?)');
            params.push(from);
        }
        if (_.isNotNullOrUndefined(to))
        {
            filters.push('(`date` <= ?)');
            params.push(to);
        }

        if (partitions.length > 0)
        {
            sql += ' PARTITION(';
            sql += partitions.join(', ');
            sql += ') ';
        }

        if (filters.length > 0)
        {
            sql += ' WHERE ';
            sql += filters.join(' AND ');
        }

        return this._executeSql(sql, params);
    }

    _queryRecentSnapshot()
    {
        return this._execute('GET_RECENT_SNAPSHOT')
            .then(results => {
                return _.head(results);
            });
    }

    /**  **/

    _massageConfigKind(configKind)
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

    _applyDnFilter(dnFilter, conditions, params)
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

    _execute(statementId, params)
    {
        var statement = this._statements[statementId];
        return statement.execute(params);
    }

    _executeSql(sql, params)
    {
        return this._driver.executeSql(sql, params);
    }

}



module.exports = HistorySnapshotReader;