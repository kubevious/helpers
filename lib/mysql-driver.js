const Promise = require('the-promise');
const _ = require('the-lodash');
const mysql = require('mysql2');
const events = require('events');
const HandledError = require('./handled-error');

class MySqlDriver
{
    constructor(logger, isDebug)
    {
        this._logger = logger.sublogger("MySqlDriver");
        this._statementsSql = {};
        this._preparedStatements = {};
        this._migrators = [];
        this._connectEmitter = new events.EventEmitter();
        this._isDebug = isDebug;
        this._isClosed = false;

        this._mysqlConnectParams = {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            database: process.env.MYSQL_DB,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASS,
            timezone: 'Z'
        };
    }

    get logger() {
        return this._logger;
    }

    get isConnected() {
        return _.isNotNullOrUndefined(this._connection);
    }

    connect()
    {
       return this._tryConnect();
    }

    close()
    {
        this._isClosed = true;
        this._disconnect();
    }

    onConnect(cb)
    {
        if (this.isConnected) {
            this._triggerCallback(cb);
        }
        this._connectEmitter.on('connect', () => {
            this._triggerCallback(cb);
        })
    }

    onMigrate(cb)
    {
        this._migrators.push(cb);
    }

    _triggerCallback(cb)
    {
        try
        {
            this._logger.info("[_triggerCallback]")

            setImmediate(() => {
                try
                {
                    var res = cb(this);
                    return Promise.resolve(res)
                        .then(() => {})
                        .catch(reason => {
                            this._logger.error("[_triggerCallback] Promise Failure: ", reason)
                        })
                    }
                    catch(error)
                    {
                        this._logger.error("[_triggerCallback] Exception: ", error);
                    }
            });
        }
        catch(error)
        {
            this._logger.error("[_triggerCallback] Exception2: ", error)
        }
    }

    registerStatement(id, sql)
    {
        this._statementsSql[id] = sql;
    }

    executeStatement(id, params)
    {
        this.logger.silly("[executeStatement] executing: %s", id);
        if (this._isDebug) {
            this.logger.info("[executeStatement] executing: %s", id, params);
        }

        if (!this.isConnected) {
            return Promise.reject('NotConnected.');
        }

        return this._fetchPreparedStatement(id)
            .then(statement => {
                if (!statement) {
                    throw new Error("StatementNotPrepared: " + id);
                }

                return new Promise((resolve, reject) => {
                    params = this._massageParams(params);
        
                    statement.execute(params, (err, results, fields) => {
                        if (err) {
                            this.logger.error("[executeStatement] ERROR IN %s. ", id, err);
                            reject(err);
                            return;
                        }
                        if (this._isDebug) {
                            this.logger.info("[executeStatement] DONE: %s", id, results);
                        }
                        resolve(results);
                    });
                });
            })
    }

    _fetchPreparedStatement(id)
    {
        if (id in this._preparedStatements)
        {
            return Promise.resolve(this._preparedStatements[id]);
        }
        else
        {
            return this._prepareStatement(id);
        }
    }

    executeSql(sql, params)
    {
        return new Promise((resolve, reject) => {
            this.logger.silly("[executeSql] executing: %s", sql);

            if (this._isDebug) {
                this.logger.info("[executeSql] executing: %s", sql, params);
            }

            if (!this._connection) {
                reject(new HandledError("NOT CONNECTED"));
                return;
            }
            
            params = this._massageParams(params);

            this._connection.execute(sql, params, (err, results, fields) => {
                if (err) {
                    this.logger.error("[executeSql] ERROR IN \"%s\". ", sql, err);
                    reject(err);
                    return;
                }
                // this.logger.info("[executeSql] DONE: %s", sql, results);
                resolve(results);
            });
        });
    }

    _massageParams(params)
    {
        if (!params) {
            params = []
        } else {
            params = params.map(x => {
                if (_.isUndefined(x)) {
                    return null;
                }
                if (_.isPlainObject(x) || _.isArray(x)) {
                    return _.stableStringify(x);
                }
                return x;
            })
        }
        if (this._isDebug) {
            this.logger.info("[_massageParams] final params: ", params);
        }
        return params;
    }

    executeStatements(statements)
    {
        this.logger.info("[executeStatements] BEGIN. Count: %s", statements.length);

        if (this._isDebug)
        {
            return Promise.serial(statements, statement => {
                this.logger.info("[executeStatements] exec:");
                return this.executeStatement(statement.id, statement.params);
            });
        }
        else
        {
            return Promise.parallel(statements, statement => {
                return this.executeStatement(statement.id, statement.params);
            });
        }
    }

    executeInTransaction(cb)
    {
        this.logger.info("[executeInTransaction] BEGIN");

        var connection = this._connection;
        return new Promise((resolve, reject) => {
            this.logger.info("[executeStatements] TX Started.");

            if (!connection) {
                reject(new HandledError("NOT CONNECTED"));
                return;
            }

            var rollback = (err) =>
            {
                this.logger.error("[executeStatements] Rolling Back.");
                connection.rollback(() => {
                    this.logger.error("[executeStatements] Rollback complete.");
                    reject(err);
                });
            }

            connection.beginTransaction((err) => {
                if (err) { 
                    reject(err);
                    return;
                }

                return Promise.resolve()
                    .then(() => cb(this))
                    .then(() => {
                        connection.commit((err) => {
                            if (err) {
                                this.logger.error("[executeStatements] TX Failed To Commit.");
                                rollback(err);
                            } else {
                                this.logger.info("[executeStatements] TX Completed.");
                                resolve();
                            }
                        });
                    })
                    .catch(reason => {
                        this.logger.error("[executeStatements] TX Failed.");
                        rollback(reason);
                    });
            });
        });

    }

    /** IMPL **/

    _tryConnect()
    {
        try
        {
            if (this._connection) {
                return;
            }
            if (this._isConnecting) {
                return;
            }
            this._isConnecting = true;
    
            var connection = mysql.createConnection(this._mysqlConnectParams);

            connection.on('error', (err) => {
                this.logger.error('[_tryConnect] ON ERROR: %s', err.code);
                connection.destroy();
                this._disconnect();
            });
    
            connection.connect((err) => {
                this._isConnecting = false;
    
                if (err) {
                    // this.logger.error('[_tryConnect] CODE=%s', err.code);
                    // this._disconnect();
                    return;
                }
               
                this.logger.info('[_tryConnect] connected as id: %s', connection.threadId);
                this._acceptConnection(connection);
            });
        }
        catch(err)
        {
            this._isConnecting = false;
            this._disconnect();
        }
    }

    _disconnect()
    {
        if (this._connection) {
            this._connection.destroy();
        }
        this._connection = null;
        this._preparedStatements = {};
        this._tryReconnect();
    }

    _acceptConnection(connection)
    {
        this._connection = connection;

        return Promise.resolve()
            .then(() => Promise.serial(this._migrators, x => x(this)))
            .then(() => this._prepareStatements())
            .then(() => {
                this._connectEmitter.emit('connect');
            })
            .catch(reason => {
                if (reason instanceof HandledError) {
                    this.logger.error('[_acceptConnection] failed: %s', reason.message);
                } else {
                    this.logger.error('[_acceptConnection] failed: ', reason);
                }
                this._disconnect();
            })
        ;
    }

    _prepareStatements()
    {
        return Promise.serial(_.keys(this._statementsSql), id => {
            return this._prepareStatement(id);
        })
    }

    _prepareStatement(id)
    {
        var sql = this._statementsSql[id];
        return this._prepareStatementNow(id, sql)
            .then(statement => {
                this._preparedStatements[id] = statement;
                return statement;
            })
            .catch(reason => {
                this._preparedStatements[id] = null;
                return null;
            });
    }

    _prepareStatementNow(id, sql)
    {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                this.logger.error('[_prepareStatementNow] Not connected.');
                reject(new HandledError("NOT CONNECTED"));
                return; 
            }
            this._connection.prepare(sql, (err, statement) => {
                if (err)
                {
                    this.logger.error('[_prepareStatementNow] failed to prepare %s. ', id, err);
                    reject(err);
                    return;
                }
                this.logger.info('[_prepareStatementNow] prepared: %s. inner id: %s', id, statement.id);
                resolve(statement);
            });
        });
    }

    _tryReconnect()
    {
        if (this._isClosed) {
            return;
        }
        setTimeout(this._tryConnect.bind(this), 1000);
    }

}

module.exports = MySqlDriver;