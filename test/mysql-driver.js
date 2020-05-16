const should = require('should');
const _ = require('the-lodash');

if (!process.env.MYSQL_HOST) {
    return;
}

describe('mysql-driver', function() {
    const MySqlDriver = require('../').MySqlDriver;

    const logger = require('the-logger').setup('test', { pretty: true });

    process.env.MYSQL_HOST = '127.0.0.1',
    process.env.MYSQL_PORT = 3306;
    process.env.MYSQL_DB = 'kubevious';
    process.env.MYSQL_USER = 'root';
    process.env.MYSQL_PASS = '';

    it('constructor', function() {
        var mysqlDriver = new MySqlDriver(logger, true);
    });

    it('connect', function() {
        var mysqlDriver = new MySqlDriver(logger, true);

        mysqlDriver.connect();

        return new Promise((resolve, reject) => {
            mysqlDriver.onConnect(() => {
                resolve();
            })
        })
        .then(() => {
            return mysqlDriver.close();
        });
    });

    it('execute', function() {
        var mysqlDriver = new MySqlDriver(logger, true);

        mysqlDriver.connect();

        return new Promise((resolve, reject) => {
            mysqlDriver.onConnect(() => {
                resolve();
            })
        })
        .then(() => {
            return mysqlDriver.executeSql("SELECT table_name FROM information_schema.tables;");
        })
        .then(result => {
            (result).should.be.an.Array();
            (result.length > 1).should.be.true();
        })
        .then(() => {
            return mysqlDriver.close();
        });
    });

});