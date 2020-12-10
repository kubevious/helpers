import * as path from 'path';
import * as fs from 'fs';

export function readJsonData(name: string) : object
{
    const filePath = path.resolve(__dirname, '..', 'data', name);
    var contents = fs.readFileSync(filePath).toString();
    var json = JSON.parse(contents);
    return json;
}