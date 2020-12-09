const Promise = require('the-promise');
const _ = require('lodash');

class EventDampener {

    constructor(logger, options)
    {
        this._logger = logger;
        this._options = options || {};
        if (!this._options.dampenMs) {
            this._options.dampenMs = 5000;
        }
        this._handlers = [];
        this._isTriggered = false;
        this._isProcessing = false;
    }

    on(cb) {
        this._handlers.push(cb);
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

    _tryProcess()
    {
        this._runNext(() => {
            this._isTriggered = false;
            this._isProcessing = true;
            return Promise.parallel(this._handlers, cb => {
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

    _runNext(cb)
    {
        //process.nextTick(cb)
        Promise.timeout(this._options.dampenMs)
            .then(() => cb());
    }

    _processCb(cb) {
        var res = cb();
        return Promise.resolve(res);
    }
}

module.exports = EventDampener;