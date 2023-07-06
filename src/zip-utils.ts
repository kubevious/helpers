import _ from 'the-lodash';
import { MyPromise } from 'the-promise';
import { deflateRaw, inflateRaw } from 'zlib';

export function compressString(str: string) : Promise<string>
{
    return MyPromise.construct((resolve, reject) => {
        deflateRaw(str, (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            const value = result.toString('base64');
            resolve(value);
        });
    })
}

export function compressObj(obj: any) : Promise<string>
{
    const str = _.stableStringify(obj);
    return compressString(str);
}

export function decompressObj(value: string) : Promise<any>
{
    return decompressString(value)
        .then(dataStr => {
            const obj = JSON.parse(dataStr);
            return obj;
        })
}

export function decompressString(value: string) : Promise<string>
{
    return MyPromise.construct((resolve, reject) => {
        const buf = Buffer.from(value, 'base64');
        inflateRaw(buf, (error, result) => {
            if (error) {
                return reject(error);
            }
            const dataStr = result.toString('utf8');
            resolve(dataStr);
        });
    })
}