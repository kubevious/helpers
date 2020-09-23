#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=2011
export MYSQL_DB=sample-db
export MYSQL_USER=root
export MYSQL_PASS=

mocha -g tracker