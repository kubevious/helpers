const _ = require('the-lodash');
const crypto = require('crypto');

module.exports.calculateObjectHash = function(obj)
{
    if (_.isNullOrUndefined(obj)) {
        throw new Error('NO Object');
    }

    var str = _.stableStringify(obj);

    const sha256 = crypto.createHash('sha256');
    sha256.update(str);
    var value = sha256.digest();
    return value;
}

module.exports.calculateObjectHashStr = function(obj)
{
    return module.exports.calculateObjectHash(obj).toString('hex');
}