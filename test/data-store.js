const should = require('should');
const _ = require('the-lodash');
const logger = require('the-logger').setup('test', { pretty: true });
const DataStore = require('../').DataStore;

function buildTestSuite(isDebug) {

describe('data-store', function() {

    it('constructor', function() {
        var dataStore = new DataStore(logger, isDebug);
        dataStore.close();
    });


    it('connect', function() {
        var dataStore = new DataStore(logger, isDebug);
        (dataStore.isConnected).should.be.false();
        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => {
                (dataStore.isConnected).should.be.true();
            })
            .then(() => dataStore.close())
    });


    it('query-all-empty', function() {
        var dataStore = new DataStore(logger, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => table.queryMany())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(0);
            })
            .then(() => dataStore.close())
    });


    it('query-all-one', function() {
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => table.queryMany())
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
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => table.queryMany())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(2);
            })
            .then(() => dataStore.close())
    });


    it('query-filter', function() {
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('chuck', 'chuck@norris.com');"))
            .then(() => table.queryMany({ email: 'john@doe.com'}))
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);

                var john = result[0];
                (john).should.be.an.Object();
                (john.name).should.be.equal('john');
                (john.email).should.be.equal('john@doe.com');
            })
            .then(() => dataStore.close())
    });


    it('query-multiple-other-fields', function() {
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('chuck', 'chuck@norris.com');"))
            .then(() => table.queryMany(null, ['email']))
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(2);
                for(var x of result)
                {
                    (_.keys(x).length).should.be.equal(1);
                }
                var john = result.filter(x => x.email == 'john@doe.com')[0];
                var chuck = result.filter(x => x.email == 'chuck@norris.com')[0];
                (john).should.be.an.Object();
                (chuck).should.be.an.Object();
            })
            .then(() => dataStore.close())
    });


    it('query-single', function() {
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => table.queryMany())
            .then(result => {
                var myId = result.filter(x => x.name == 'bruce')[0].id;
                return table.querySingle({id: myId});
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
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => table.queryMany())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);
                (result[0].id).should.be.a.Number();
                (result[0].name).should.be.equal('Chuck');
                (result[0].email).should.be.equal('chuck@norris.io');
            })
            .then(() => dataStore.close())
    });



    it('create-or-update', function() {
        var dataStore = new DataStore(logger, isDebug);

        dataStore.meta()
            .table('users')
                .field('name')
                    .settable()
                .field('email')

        var table = dataStore.table('users');

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `users`;"))
            .then(() => table.createOrUpdate({ name: 'Chuck', email: 'chuck@norris.io' }))
            .then(result => {
                (result).should.be.Object();
                (result.name).should.be.equal('Chuck');
                (result.email).should.be.equal('chuck@norris.io');
            })
            .then(() => table.queryMany())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);
                (result[0].name).should.be.equal('Chuck');
                (result[0].email).should.be.equal('chuck@norris.io');
            })
            .then(() => table.createOrUpdate({ name: 'Chuck', email: 'chuck@norris.com' }))
            .then(result => {
                (result).should.be.Object();
                (result.name).should.be.equal('Chuck');
                (result.email).should.be.equal('chuck@norris.com');
            })
            .then(() => table.queryMany())
            .then(result => {
                (result).should.be.an.Array();
                (result[0].name).should.be.equal('Chuck');
                (result[0].email).should.be.equal('chuck@norris.com');
            })
            .then(() => dataStore.close())
    });




    it('update', function() {
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => table.queryMany())
            .then(result => {
                var myId = result.filter(x => x.name == 'bruce')[0].id;
                return table.update({id: myId}, {name: 'Bruce'});
            })
            .then(() => table.queryMany())
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



    it('delete', function() {
        var dataStore = new DataStore(logger, isDebug);

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
            .then(() => table.queryMany())
            .then(result => {
                var myId = result.filter(x => x.name == 'bruce')[0].id;
                return table.delete({id: myId});
            })
            .then(() => table.queryMany())
            .then(result => {
                (result).should.be.an.Array();
                (result.length).should.be.equal(1);
                (result[0].id).should.be.a.Number();
                (result[0].name).should.be.equal('john');
                (result[0].email).should.be.equal('john@doe.com');
            })
            .then(() => dataStore.close())
    });


    it('sync-id-column', function() {
        var dataStore = new DataStore(logger, isDebug);

        dataStore.meta()
            .table('contacts')
                .key('id')
                .field('name')
                .field('email')

        var table = dataStore.table('contacts');
        var sync = table.synchronizer();

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `contacts`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `contacts`(`name`, `email`) VALUES('chuck', 'chuck@norris.com');"))
            .then(() => sync.execute([
                {
                    name: 'bruce',
                    email: 'b@lee.com'
                },
                {
                    name: 'chuck',
                    email: 'chuck@lee.com'
                }
            ]))
            .then(() => table.queryMany())
            .then(result => {
                logger.info(result);

                (result).should.be.an.Array();
                (result.length).should.be.equal(2);

                var chuckObj = result.filter(x => x.name == 'chuck')[0];
                (chuckObj).should.be.an.Object();
                (chuckObj.id).should.be.a.Number();
                (chuckObj.name).should.be.equal('chuck');
                (chuckObj.email).should.be.equal('chuck@lee.com');
                
                var bruceObj = result.filter(x => x.name == 'bruce')[0];
                (bruceObj).should.be.an.Object();
                (bruceObj.id).should.be.a.Number();
                (bruceObj.name).should.be.equal('bruce');
                (bruceObj.email).should.be.equal('b@lee.com');

            })
            .then(() => dataStore.close())
    });


    it('sync-name', function() {
        var dataStore = new DataStore(logger, isDebug);

        dataStore.meta()
            .table('users')
                .key('name')
                    .settable()
                .field('email')

        var table = dataStore.table('users');
        var sync = table.synchronizer();

        dataStore.connect();
        return dataStore.waitConnect()
            .then(() => dataStore.mysql.executeSql("DELETE FROM `users`;"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `users`(`name`, `email`) VALUES('john', 'john@doe.com');"))
            .then(() => dataStore.mysql.executeSql("INSERT INTO `users`(`name`, `email`) VALUES('chuck', 'chuck@norris.com');"))
            .then(() => sync.execute([
                {
                    name: 'bruce',
                    email: 'b@lee.com'
                },
                {
                    name: 'chuck',
                    email: 'chuck@lee.com'
                }
            ]))
            .then(() => table.queryMany())
            .then(result => {
                logger.info(result);

                (result).should.be.an.Array();
                (result.length).should.be.equal(2);

                var chuckObj = result.filter(x => x.name == 'chuck')[0];
                (chuckObj).should.be.an.Object();
                (chuckObj.name).should.be.equal('chuck');
                (chuckObj.email).should.be.equal('chuck@lee.com');
                
                var bruceObj = result.filter(x => x.name == 'bruce')[0];
                (bruceObj).should.be.an.Object();
                (bruceObj.name).should.be.equal('bruce');
                (bruceObj.email).should.be.equal('b@lee.com');

            })
            .then(() => dataStore.close())
    });

});

}

buildTestSuite(true);
// buildTestSuite(false);