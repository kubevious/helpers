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

export function fromStr(value: string) : Buffer {
    return Buffer.from(value, 'hex');
}

export function toStr(value: Buffer) : string {
    return value.toString('hex');
}

export function parseUUID(value: string) : Buffer | null {
    const buf = fromStr(value);
    if (buf.length != 16) {
        return null
    }
    return buf;
}
