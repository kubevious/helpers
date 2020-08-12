const _ = require('the-lodash');
const moment = require('moment');

module.exports.CONFIG_HASH_PARTITION_COUNT = 20;

module.exports.calculateConfigHashPartition = function(hashBuffer)
{
    var sum = 0;
    for (const value of hashBuffer.values()) {
        sum += value;
    }
    return sum % module.exports.CONFIG_HASH_PARTITION_COUNT + 1;
}

module.exports.calculateDatePartition = function(date)
{
    var date = moment(date);
    var part = ((date.year()) * 100 + date.month() ) * 100 + date.date();
    return part;
}