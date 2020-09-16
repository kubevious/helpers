const Promise = require('the-promise');
const _ = require('lodash');

class RetryableAction
{
    constructor(logger, action)
    {
        this._logger = logger;
        this._action = action;
        this._canRetryCb = null;
        this._delay = 1000;
    }

    canRetry(cb)
    {
        this._canRetryCb = cb;
    }

    run()
    {
        return this._tryRun();
    }

    _tryRun()
    {
        return this._try()
            .catch(reason => {
                if (this._canRetryCb)
                {
                    if (this._canRetryCb(reason))
                    {
                        this._logger.warn("RetryableAction failed, will retry...");
                        this._delay = Math.min(10 * 1000, this._delay * 2);
                        return Promise.timeout(this._delay)
                            .then(() => this._tryRun());
                    }
                }
                throw reason;
            });
    }

    _try()
    {
        try
        {
            let result = this._action();
            return Promise.resolve(result);
        }
        catch(reason)
        {
            return Promise.reject(reason);
        }
    }
}

module.exports = RetryableAction;