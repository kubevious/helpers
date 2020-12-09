import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger' ;

export class RetryableAction
{
    private _logger : ILogger;
    private _action : () => any;
    private _canRetryCb? : (reason: any) => boolean;

    private _delay : number;
    private _maxDelay : number;
    private _delayCoeff : number;
    private _retryCount : number;

    constructor(logger: ILogger, action: () => any, options?: any)
    {
        this._logger = logger;
        this._action = action;

        options = options || {};
        this._delay = _.isNumber(options.initalDelay) ? options.initalDelay : 1000;
        this._maxDelay = _.isNumber(options.maxDelay) ? options.maxDelay : 10000;
        this._delayCoeff = _.isNumber(options.delayCoeff) ? options.delayCoeff : 2;
        this._retryCount = _.isNumber(options.retryCount) ? options.retryCount : 3;
    }

    canRetry(cb : (reason: any) => boolean)
    {
        this._canRetryCb = cb;
    }

    run() : Promise<any>
    {
        return this._tryRun();
    }

    private _tryRun() : Promise<any>
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

    private _checkIfCanRetry(reason: any)
    {
        if (this._canRetryCb)
        {
            return this._canRetryCb(reason);
        }
        return true;
    }

    private _try()
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