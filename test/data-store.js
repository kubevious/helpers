const should = require('should');
const _ = require('the-lodash');
const logger = require('the-logger').setup('test', { pretty: true });
const DataStore = require('../').DataStore;

function buildTestSuite(isDebug) {

describe('data-store', function() {

    it('constructor', function() {
        var dataStore = new DataStore(logger, null, isDebug);
        dataStore.close();
    });


    it('connect', function() {
        var dataStore = new DataStore(logger, null, isDebug);
        (dataStore.isConnected).should.be.false();
        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => {
                (dataStore.isConnected).should.be.true();
            })
            .then(() => dataStore.close())
    });


    it('query-all-empty', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => table.queryAll())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(0);
            })
            .then(() => dataStore.close())
    });


    it('query-all-one', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => table.queryAll())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);
                (result[0].id).should.be.a.Number();
                (result[0].name).should.be.equal('john');
                (result[0].email).should.be.equal('john@doe.com');
            })
            .then(() => dataStore.close())
    });

    it('query-all-two', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('bruce', 'bruce@lee.com');"))
            .then(() => table.queryAll())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(2);
            })
            .then(() => dataStore.close())
    });

    it('query-single', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('bruce', 'bruce@lee.com');"))
            .then(() => table.queryAll())
            .then(result => {
                var myId = result.filter(x => x.name == 'bruce')[0].id;
                return table.query({id: myId});
            })
            .then(result => {
                console.log(result);
                (result).should.be.an.Object();
                (result.id).should.be.Number();
                (result.name).should.be.equal('bruce');
                (result.email).should.be.equal('bruce@lee.com');
            })
            .then(() => dataStore.close())
    });

    it('create', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => table.create({ name: 'Chuck', email: 'chuck@norris.io' }))
            .then(result => {
                (result).should.be.Object();
                (result.id).should.be.a.Number();
                (result.name).should.be.equal('Chuck');
                (result.email).should.be.equal('chuck@norris.io');
            })
            .then(() => table.queryAll())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);
                (result[0].id).should.be.a.Number();
                (result[0].name).should.be.equal('Chuck');
                (result[0].email).should.be.equal('chuck@norris.io');
            })
            .then(() => dataStore.close())
    });


    it('delete', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('bruce', 'bruce@lee.com');"))
            .then(() => table.queryAll())
            .then(result => {
                var myId = result.filter(x => x.name == 'bruce')[0].id;
                return table.delete({id: myId});
            })
            .then(() => table.queryAll())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);
                (result[0].id).should.be.a.Number();
                (result[0].name).should.be.equal('john');
                (result[0].email).should.be.equal('john@doe.com');
            })
            .then(() => dataStore.close())
    });


    it('update', function() {
        var dataStore = new DataStore(logger, null, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('bruce', 'bruce@lee.com');"))
            .then(() => table.queryAll())
            .then(result => {
                var myId = result.filter(x => x.name == 'bruce')[0].id;
                return table.update({id: myId}, {name: 'Bruce'});
            })
            .then(() => table.queryAll())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(2);

                var johnObj = result.filter(x => x.name == 'john')[0];
                (johnObj).should.be.an.Object();
                (johnObj.id).should.be.a.Number();
                (johnObj.name).should.be.equal('john');
                (johnObj.email).should.be.equal('john@doe.com');

                var bruceObj = result.filter(x => x.name == 'Bruce')[0];
                (bruceObj).should.be.an.Object();
                (bruceObj.id).should.be.a.Number();
                (bruceObj.name).should.be.equal('Bruce');
                (bruceObj.email).should.be.equal('bruce@lee.com');
            })
            .then(() => dataStore.close())
    });

});

}

buildTestSuite(true);
// buildTestSuite(false);