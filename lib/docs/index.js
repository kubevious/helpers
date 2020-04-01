const _ = require('the-lodash');

const KIND_TO_USER_MAPPING = require('./kind-labels');
const PROPERTY_GROUP_TOOLTIPS = require('./property-group-tooltips');

module.exports.prettyKind = function(kind)
{
    var kind = KIND_TO_USER_MAPPING[kind];
    if (!kind) {
        kind = _.upperFirst(kind);
    }
    return kind;
}

module.exports.propertyGroupTooltip = function(id)
{
    var tooltip = PROPERTY_GROUP_TOOLTIPS[id];
    if (tooltip) {
        return tooltip;
    }
    return null;
}