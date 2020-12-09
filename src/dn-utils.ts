import _ from 'the-lodash';

export interface RnInfo {
    rn: string,
    kind: string,
    name: string | null
}

export function splitDn(dn : string) : string[]
{
    let parts : string[] = [];

    let ch = null;
    let token = "";
    let parsingKind = true;
    let parsingNaming = true;
    for (let i = 0; i < dn.length; i++) {
        let skipAdd = false;
        ch = dn.charAt(i);
        if (parsingKind) {
            if (ch == '-') {
                parsingKind = false;
            } else if (ch == '/') {
                skipAdd = true;
                parts.push(token);
                token = "";
            }
        } else {
            if (parsingNaming) {
                if (ch == ']') {
                    parsingNaming = false;
                }
            } else {
                if (ch == '[') {
                    parsingNaming = true;
                } else if (ch == '/') {
                    skipAdd = true;
                    parts.push(token);
                    token = "";
                }
            }
        }

        if (!skipAdd) {
            token += ch;
        }
    }

    if (token.length > 0) {
        parts.push(token);
    }

    return parts;
}

export function parseRn(rn: string) : RnInfo
{
    var index = rn.indexOf('-');
    if (index == -1) {
        return {
            rn: rn,
            kind: rn,
            name: null
        };
    }
    return {
        rn: rn,
        kind: rn.substr(0, index),
        name: rn.substr(index + 2, rn.length - (index + 3))
    };
}

export function parseDn(dn : string) : RnInfo[]
{
    var parts = splitDn(dn);
    return parts.map(x => parseRn(x));
}

export function parentDn(dn : string) : string
{
    var parts = splitDn(dn);
    return makeDnFromParts(_.dropRight(parts));
}

export function makeDn(parentDn: string, childRn: string) : string
{
    if (!parentDn) {
        return childRn;
    }
    return parentDn + "/" + childRn;
}

export function makeDnFromParts(parts: string[]) : string
{
    return parts.join('/');
}