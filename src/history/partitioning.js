const _ = require('the-lodash');
const moment = require('moment');

module.exports.calculateDatePartition = function(date)
{
    var date = moment(date);
    var part = ((date.year()) * 100 + (date.month() + 1) ) * 100 + date.date();
    return part;
}

module.exports.partitionName = function(partition)
{
    return 'p' + partition;
}