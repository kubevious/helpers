const redis = require("redis");
const Promise = require('the-promise');
const _ = require('the-lodash');

class RedisClient 
{
    constructor(logger)
    {
        this._logger = logger.sublogger("RedisClient");

        this._client = null;
    }

    get logger() {
        return this._logger;
    }

    init()
    {
        var options = {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379
        };
        this._client = redis.createClient(options);

        this._client.on("error", (error) => {
            this.logger.error(error);
        });
    }

    setValue(key, value)
    {
        return new Promise((resolve, reject) => {
            this._client.set(key, value, (err, result) => {
                if (err) {
                    this.logger.error(err);
                    return reject(err);
                }   
                resolve(result);
            });
        })
    }

    getValue(key)
    {
        return new Promise((resolve, reject) => {
            this._client.get(key, (err, result) => {
                if (err) {
                    this.logger.error(err);
                    return reject(err);
                }   
                resolve(result);
            });
        })
    }

    listKeys(filter)
    {
        return new Promise((resolve, reject) => {
            this._client.keys(filter, (err, result) => {
                if (err) {
                    this.logger.error(err);
                    return reject(err);
                }   
                resolve(result);
            });
        })
    }
}


module.exports = RedisClient;