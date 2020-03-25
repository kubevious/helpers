const _ = require('the-lodash');

module.exports.areEqual = function (a, b)
{
    if (_.isNullOrUndefined(a)) {
        if (_.isNullOrUndefined(b)) {
            return true;
        } else {
            return false;
        }
    } else {
        if (_.isNullOrUndefined(b)) {
            return false;
        } else {
            return a.equals(b);
        }
    }
}