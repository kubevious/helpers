const Promise = require('the-promise');
const _ = require('lodash');

class RetryableAction
{
    constructor(logger, action, options)
    {
        this._logger = logger;
        this._action = action;
        this._canRetryCb = null;

        options = options || {};
        this._delay = _.isNumber(options.initalDelay) ? options.initalDelay : 1000;
        this._maxDelay = _.isNumber(options.maxDelay) ? options.maxDelay : 10000;
        this._delayCoeff = _.isNumber(options.delayCoeff) ? options.delayCoeff : 2;
        this._retryCount = _.isNumber(options.retryCount) ? options.retryCount : 3;
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
                if (this._retryCount > 0) {
                    this._retryCount--;
                    
                    if (this._checkIfCanRetry(reason))
                    {
                        this._logger.warn("RetryableAction failed, will retry...");
                        this._delay = Math.min(this._maxDelay, this._delay * this._delayCoeff);
                        return Promise.timeout(this._delay)
                            .then(() => this._tryRun());
                    }
                }

                throw reason;
            });
    }

    _checkIfCanRetry(reason)
    {
        if (this._canRetryCb)
        {
            return this._canRetryCb(reason);
        }
        return true;
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