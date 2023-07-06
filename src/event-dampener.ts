import _ from 'the-lodash';
import { ILogger } from 'the-logger' ;
import { MyPromise } from 'the-promise';

export type Handler = () => any;

export class EventDampener {

    private _logger : ILogger;
    private _options: any;

    private _handlers : Handler[] = [];
    private _isTriggered = false;
    private _isProcessing = false;


    constructor(logger : ILogger, options?: any)
    {
        this._logger = logger;
        this._options = options || {};
        if (!this._options.dampenMs) {
            this._options.dampenMs = 5000;
        }
    }

    on(cb : Handler) {
        this._handlers.push(cb);
        
        // TODO: why?
        // this._processCb(cb);
    }

    trigger() {
        if (this._isTriggered) {
            return;
        }
        this._isTriggered = true;

        if (this._isProcessing) {
            return;
        }

        this._tryProcess();
    }

    private _tryProcess()
    {
        this._runNext(() => {
            this._isTriggered = false;
            this._isProcessing = true;
            return MyPromise.parallel(this._handlers, cb => {
                return this._processCb(cb);
            })
            .catch(reason => {
                this._logger.error("[_triggerChanged]", reason);
            })
            .then(() => {
                this._isProcessing = false;
                if (this._isTriggered) {
                    return this._tryProcess();
                }
            });
        })
        
    }

    private _runNext(cb : Handler)
    {
        //process.nextTick(cb)
        Promise.resolve(null)
            .then(() => MyPromise.delay(this._options.dampenMs))
            .then(() => cb())
            .then(() => null)
            .catch(reason => {
                this._logger.error("Error in EventDampener.", reason);
            })
            ;
    }

    private _processCb(cb : Handler)
    {
        const res = cb();
        return Promise.resolve(res);
    }
}