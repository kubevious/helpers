import _ from 'the-lodash';
import { SnapshotItemInfo } from '../snapshot/types';

export function makeKey(item: SnapshotItemInfo) : string {

    if (!item.dn) {
        throw new Error("MISSING DN");
    }
    if (!item.kind) {
        throw new Error("MISSING kind");
    }
    if (!item.config_kind) {
        throw new Error("MISSING config_kind");
    }

    var parts = [
        item.dn,
        item.kind,
        item.config_kind
    ]
    if (item.name) {
        parts.push(item.name);
    }

    return parts.join('-');
}