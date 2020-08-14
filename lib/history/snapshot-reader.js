const Promise = require('the-promise');
const _ = require('the-lodash');
const Snapshot = require("./snapshot");
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

    _registerStatements()
    {
        this._registerStatement('GET_DIFFS_TIMELINE_RANGE', 'SELECT MIN(`date`) as min_date, MAX(`date`) as `max_date` FROM `diffs`;');
        this._registerStatement('GET_DIFFS_TIMELINE_FROM_TO', 'SELECT * FROM `diffs` WHERE (`date` BETWEEN ? AND ?) ORDER BY `date`;');
        this._registerStatement('GET_DIFFS_TIMELINE_FROM', 'SELECT * FROM `diffs` WHERE (`date` >= ?) ORDER BY `date`;');
        this._registerStatement('GET_DIFFS_TIMELINE_TO', 'SELECT * FROM `diffs` WHERE (`date` <= ?) ORDER BY `date`;');
        this._registerStatement('GET_DIFFS_TIMELINE', 'SELECT * FROM `diffs` ORDER BY `date`;');

        this._registerStatement('GET_SNAPSHOT_BY_ID', 'SELECT * FROM `snapshots` WHERE `id` = ?;');
        this._registerStatement('GET_RECENT_SNAPSHOT', 'SELECT * FROM `snapshots` ORDER BY `date` DESC LIMIT 1;');
        
        this._registerStatement('GET_DIFFS_FOR_SNAPSHOT', 'SELECT * FROM `diffs` WHERE `in_snapshot` = 0 AND `snapshot_id` = ? ORDER BY `date`;');
        this._registerStatement('GET_DIFFS_FOR_SNAPSHOT_AND_DATE', 'SELECT * FROM `diffs` WHERE `in_snapshot` = 0 AND `snapshot_id` = ? AND `date` <= ? ORDER BY `date`;');
        this._registerStatement('FIND_DIFF_FOR_DATE', 'SELECT * FROM `diffs` WHERE `date` <= ? ORDER BY `date` DESC LIMIT 1;');

        this._registerStatement('GET_SNAPSHOT_ITEMS', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config_hash`, `config_hash_part` FROM `snap_items` WHERE `snapshot_id` = ?');
        this._registerStatement('GET_SNAPSHOT_ITEMS_WITH_CONFIG', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config_hash`, `config_hash_part`, `value` as `config` FROM `snap_items` INNER JOIN `config_hashes` ON `snap_items`.`config_hash` = `config_hashes`.`key` WHERE `snapshot_id` = ?');

        this._registerStatement('GET_DIFF_ITEMS', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config_hash_part`, `config_hash` FROM `diff_items` WHERE `diff_id` = ?');
        this._registerStatement('GET_DIFF_ITEMS_WITH_CONFIG', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config_hash_part`, `config_hash`, `value` as `config` FROM `diff_items` INNER JOIN `config_hashes` ON `diff_items`.`config_hash` = `config_hashes`.`key` WHERE `diff_id` = ?');

        // this._registerStatement('GET_SNAPSHOT_ITEMS_CONFIGKIND_DN', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config` FROM `snap_items` WHERE `snapshot_id` = ? AND `config_kind` IN (?) AND `dn` = ?');
        // this._registerStatement('GET_SNAPSHOT_ITEMS_CONFIGKIND', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config` FROM `snap_items` WHERE `snapshot_id` = ? AND `config_kind` IN (?)');
        // this._registerStatement('GET_SNAPSHOT_ITEMS_DN', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config` FROM `snap_items` WHERE `snapshot_id` = ? AND `dn` = ?');
        // this._registerStatement('GET_SNAPSHOT_ITEMS', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `config` FROM `snap_items` WHERE `snapshot_id` = ?');
        // this._registerStatement('GET_DIFF_ITEMS_CONFIGKIND_DN', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config` FROM `diff_items` WHERE `diff_id` = ? AND `config_kind` IN (?) AND `dn` = ?');
        // this._registerStatement('GET_DIFF_ITEMS_CONFIGKIND', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config` FROM `diff_items` WHERE `diff_id` = ? AND `config_kind` IN (?)');
        // this._registerStatement('GET_DIFF_ITEMS_DN', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config` FROM `diff_items` WHERE `diff_id` = ? AND `dn` = ?');
        // this._registerStatement('GET_DIFF_ITEMS', 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `config` FROM `diff_items` WHERE `diff_id` = ?');
    }

    _registerStatement(name, sql)
    {
        this._statements[name] = this._driver.statement(sql);
        // return this._driver.registerStatement.apply(this._driver, arguments);
    }

    queryTimelineRange()
    {   
        return this._execute('GET_DIFFS_TIMELINE_RANGE')
    }

    queryTimeline(from, to)
    {   
        if (_.isNotNullOrUndefined(from))
        {
            if (_.isNotNullOrUndefined(to))
            {
                return this._execute('GET_DIFFS_TIMELINE_FROM_TO', [from, to]);
            }
            else 
            {
                return this._execute('GET_DIFFS_TIMELINE_FROM', [from]);
            }
        }
        else
        {
            if (_.isNotNullOrUndefined(to))
            {
                return this._execute('GET_DIFFS_TIMELINE_TO', [to]);
            }
            else 
            {
                return this._execute('GET_DIFFS_TIMELINE');
            }
        }
    }

    querySnapshotForDate(date, configKind)
    {  
        return this.findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this.reconstructSnapshotByIdAndDiffDate(diffObj.snapshot_id, date, configKind, null);
            }) 
    }

    queryDnSnapshotForDate(dn, date, configKind)
    {
        return this.findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this.reconstructSnapshotByIdAndDiffDate(diffObj.snapshot_id, date, configKind, { dn: dn });
            }) 
    }

    queryScopedSnapshotForDate(dn, date, configKind)
    {
        return this.findDiffForDate(date)
            .then(diffObj => {
                if (!diffObj) {
                    return null;
                }
                return this.reconstructSnapshotByIdAndDiffDate(diffObj.snapshot_id, date, configKind, { dn: dn, scoped: true });
            }) 
    }

    reconstructSnapshotByIdAndDiffDate(snapshotId, date, configKind, dnFilter)
    {
        var snapshotReconstructor = null;
        return Promise.resolve()
            .then(() => this.querySnapshotItemsEx(snapshotId, configKind, dnFilter))
            .then(snapshotItems => {
                snapshotReconstructor = new SnapshotReconstructor(snapshotItems);
                if (date)
                {
                    return this.queryDiffsForSnapshotAndDate(snapshotId, date)
                }
                else
                {
                    return this.queryDiffsForSnapshot(snapshotId);
                }
            })
            .then(diffs => {
                return this._queryDiffsItemsEx(diffs, configKind, dnFilter)
            })
            .then(diffsItems => {
                snapshotReconstructor.applyDiffsItems(diffsItems);
                return snapshotReconstructor.getSnapshot();
            })
            ;
    }

    findDiffForDate(date)
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

    queryDiffsForSnapshot(snapshotId)
    {
        return this._execute('GET_DIFFS_FOR_SNAPSHOT', [snapshotId]);
    }

    queryDiffsForSnapshotAndDate(snapshotId, date)
    {
        return this._execute('GET_DIFFS_FOR_SNAPSHOT_AND_DATE', [snapshotId, date]);
    }

    querySnapshotItems(snapshotId, includeConfig)
    {
        if (includeConfig)
        {
            return this._execute('GET_SNAPSHOT_ITEMS_WITH_CONFIG', [snapshotId]);
        }
        else
        {
            return this._execute('GET_SNAPSHOT_ITEMS', [snapshotId]);
        }
    }

    querySnapshotItemsEx(snapshotId, configKind, dnFilter)
    {
        var conditions = [];
        var params = []

        conditions.push('`snapshot_id` = ?')
        params.push(snapshotId);

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

        var sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `value` as `config`'
            + ' FROM `snap_items`'
            + ' INNER JOIN `config_hashes` ON `snap_items`.`config_hash` = `config_hashes`.`key`'
            ;

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql(sql, params);
    }

    queryRecentSnapshot()
    {
        return this._execute('GET_RECENT_SNAPSHOT')
            .then(results => {
                return _.head(results);
            });
    }

    queryDiffItems(diffId, includeConfig)
    {
        if (includeConfig)
        {
            return this._execute('GET_DIFF_ITEMS_WITH_CONFIG', [diffId]);
        }
        else
        {
            return this._execute('GET_DIFF_ITEMS', [diffId]);
        }
    }

    queryDiffItemsEx(diffId, configKind, dnFilter)
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

        var sql = 'SELECT `id`, `dn`, `kind`, `config_kind`, `name`, `present`, `value` as `config`'
            + ' FROM `diff_items`'
            + ' INNER JOIN `config_hashes` ON `diff_items`.`config_hash` = `config_hashes`.`key`'
            ;

        if (conditions.length > 0)
        {
            sql = sql + 
                ' WHERE '
                + conditions.join(' AND ');
        }

        return this._executeSql(sql, params);
    }

    reconstructSnapshotById(snapshotId, includeConfig)
    {
        var snapshotReconstructor = null;
        return Promise.resolve()
            .then(() => this.querySnapshotItems(snapshotId, includeConfig))
            .then(snapshotItems => {
                snapshotReconstructor = new SnapshotReconstructor(snapshotItems);
                return this.queryDiffsForSnapshot(snapshotId)
            })
            .then(diffs => {
                return this._queryDiffsItems(diffs, includeConfig)
            })
            .then(diffsItems => {
                snapshotReconstructor.applyDiffsItems(diffsItems);
                return snapshotReconstructor.getSnapshot();
            })
            ;
    }

    reconstructRecentShaphot(includeConfig)
    {
        return this.queryRecentSnapshot()
            .then(snapshot => {
                this.logger.info('[reconstructRecentShaphot] db snapshot: ', snapshot);
                if (!snapshot) {
                    return new Snapshot();
                }
                return this.reconstructSnapshotById(snapshot.id, includeConfig);
            })
    }

    _queryDiffsItems(diffs, includeConfig)
    {
        return Promise.serial(diffs, diff => {
            return this.queryDiffItems(diff.id, includeConfig);
        });
    }

    _queryDiffsItemsEx(diffs, configKind, dnFilter)
    {
        return Promise.serial(diffs, diff => {
            return this.queryDiffItemsEx(diff.id, configKind, dnFilter);
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