const _ = require('the-lodash');

module.exports.KIND_TO_USER_MAPPING = require('./kind-labels');
module.exports.PROPERTY_GROUP_TOOLTIPS = require('./property-group-tooltips');

module.exports.prettyKind = function(kind)
{
    var kind = module.exports.KIND_TO_USER_MAPPING[kind];
    if (!kind) {
        kind = _.upperFirst(kind);
    }
    return kind;
}

module.exports.propertyGroupTooltip = function(id)
{
    var tooltip = module.exports.PROPERTY_GROUP_TOOLTIPS[id];
    if (tooltip) {
        return tooltip;
    }
    return null;
}