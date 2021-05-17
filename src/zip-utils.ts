import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { deflateRaw, inflateRaw } from 'zlib';

export function compressObj(obj: any) : Promise<string>
{
    const str = _.stableStringify(obj);
    return Promise.construct((resolve) => {
        deflateRaw(str, (error, result) => {
            const value = result.toString('base64');
            resolve(value);
        });
    })
}

export function decompressObj(value: string) : Promise<any>
{
    return Promise.construct((resolve, reject) => {
        const buf = Buffer.from(value, 'base64');
        inflateRaw(buf, (error, result) => {
            if (error) {
                return reject(error);
            }
            const dataStr = result.toString('utf8');
            const obj = JSON.parse(dataStr);
            resolve(obj);
        });
    })
}