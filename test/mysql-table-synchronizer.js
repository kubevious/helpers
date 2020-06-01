const should = require('should');
const _ = require('the-lodash');

if (!process.env.MYSQL_HOST) {
    return;
}

describe('mysql-table-synchronizer', function() {
    const MySqlDriver = require('../').MySqlDriver;
    const MySqlTableSynchronizer = require('../').MySqlTableSynchronizer;

    const logger = require('the-logger').setup('test', { pretty: true });

    process.env.MYSQL_HOST = '127.0.0.1',
    process.env.MYSQL_PORT = 3306;
    process.env.MYSQL_DB = 'kubevious';
    process.env.MYSQL_USER = 'root';
    process.env.MYSQL_PASS = '';

    it('execute-after-connect', function() {
        var mysqlDriver = new MySqlDriver(logger, true);

        mysqlDriver.onMigrate(() => {
            return mysqlDriver.executeSql(
                "CREATE TABLE IF NOT EXISTS `sync_test` (" +
                    "`id` int unsigned NOT NULL AUTO_INCREMENT," +
                    "`name` varchar(128) NOT NULL," +
                    "`msg` TEXT NOT NULL," +
                    "PRIMARY KEY (`id`)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=latin1;");
        })

        mysqlDriver.connect();

        return new Promise((resolve, reject) => {
            mysqlDriver.onConnect(() => {
                resolve();
            })
        })
        .then(() => {
            var synchronizer = new MySqlTableSynchronizer(logger, mysqlDriver, 'sync_test', [], ['name', 'msg']);
            return synchronizer.execute({}, [
                { name: 'dog', msg: 'hello'}, 
                { name: 'dog', msg: 'wof-wof'}, 
                { name: 'cat', msg: 'hi'}, 
                { name: 'cat', msg: 'meau'},
            ])
        })
        .then(() => {
            return mysqlDriver.executeSql("SELECT * FROM `sync_test`;");
        })
        .then(result => {
            // console.log(result);
            // (result).should.be.an.Array();
            // (result.length > 1).should.be.true();
        })
        .then(() => {
            return mysqlDriver.executeSql("DROP TABLE `sync_test`;");
        })
        .then(() => {
            return mysqlDriver.close();
        });
    });


    it('execute-before-connect', function() {

        var mysqlDriver = new MySqlDriver(logger, true);
        var synchronizer = new MySqlTableSynchronizer(logger, mysqlDriver, 'sync_test', [], ['name', 'msg']);

        mysqlDriver.onMigrate(() => {
            return mysqlDriver.executeSql(
                "CREATE TABLE IF NOT EXISTS `sync_test` (" +
                    "`id` int unsigned NOT NULL AUTO_INCREMENT," +
                    "`name` varchar(128) NOT NULL," +
                    "`msg` TEXT NOT NULL," +
                    "PRIMARY KEY (`id`)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=latin1;");
        })

        mysqlDriver.connect();


        return new Promise((resolve, reject) => {
            mysqlDriver.onConnect(() => {
                resolve();
            })
        })
        .then(() => {
            return synchronizer.execute({}, [
                { name: 'dog', msg: 'hello'}, 
                { name: 'dog', msg: 'wof-wof'}, 
                { name: 'cat', msg: 'hi'}, 
                { name: 'cat', msg: 'meau'},
            ])
        })
        .then(() => {
            return mysqlDriver.executeSql("SELECT * FROM `sync_test`;");
        })
        .then(result => {
            // console.log(result);
            // (result).should.be.an.Array();
            // (result.length > 1).should.be.true();
        })
        .then(() => {
            return mysqlDriver.executeSql("DROP TABLE `sync_test`;");
        })
        .then(() => {
            return mysqlDriver.close();
        });
    });

});