const path = require('path');
const fs = require('fs');

module.exports.readJsonData = function(name)
{
    const filePath = path.resolve(__dirname, '..', 'data', name);
    var contents = fs.readFileSync(filePath).toString();
    var json = JSON.parse(contents);
    return json;
}