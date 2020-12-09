import _ from 'the-lodash';

export function areEqual(a: (Buffer | null), b : (Buffer | null)) : boolean
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
            return a!.equals(b!);
        }
    }
}