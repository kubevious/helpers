import _ from 'the-lodash';

import { KIND_TO_USER_MAPPING } from './kind-labels'
import { PROPERTY_GROUP_TOOLTIPS } from './property-group-tooltips'
import { FLAG_TOOLTIPS } from './flag-tooltips'

export { KIND_TO_USER_MAPPING, PROPERTY_GROUP_TOOLTIPS, FLAG_TOOLTIPS };

export function prettyKind(kind : string) : string
{
    var kind = KIND_TO_USER_MAPPING[kind];
    if (!kind) {
        kind = _.upperFirst(kind);
    }
    return kind;
}

export function propertyGroupTooltip(id: string) : string | null
{
    var tooltip = PROPERTY_GROUP_TOOLTIPS[id];
    if (tooltip) {
        return tooltip;
    }
    return null;
}