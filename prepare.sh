#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

rm -rf node_modules/
rm -rf dist/

npm install --ignore-scripts
npm install --only=dev --ignore-scripts
npm update the-lodash the-logger the-promise --ignore-scripts