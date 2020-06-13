const StopWatch = require('../lib/stopwatch');
const _ = require('the-lodash');

class ProcessingTracker
{
    constructor(logger)
    {
        this._logger = logger;
        this._values = {};
    }

    enablePeriodicDebugOutput(seconds)
    {
        this.disablePeriodicDebugOutput();
        seconds = seconds || 30;
        this._interval = setInterval(() => {
            this.debugOutput();
        }, seconds * 1000);
    }

    disablePeriodicDebugOutput()
    {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    scope(name, cb)
    {
        return this._scope(null, name, cb);
    }

    getTaskInfo(name)
    {
        if (this._values[name]) {
            return this._values[name];
        }
        return null;
    }

    debugOutput()
    {
        this._logger.info("*** DEBUG OUTPUT BEGIN");
        for(var x of _.keys(this._values))
        {
            var info = this._values[x];
            if (_.isNullOrUndefined(info.duration))
            {
                this._logger.info("* Task: %s. Working...", x);
            }
            else
            {
                if (info.failed)
                {
                    this._logger.warn("* Task: %s. Failed. Duration: %sms.", x, info.duration);
                }
                else
                {
                    this._logger.info("* Task: %s. Duration: %sms.", x, info.duration);
                }
            }
        }
        this._logger.info("*** DEBUG OUTPUT END");
    }

    _scope(parent, name, cb)
    {
        var fullname;
        if (parent) {
            fullname = parent + '/' + name;
        } else {
            fullname = name;
        }
        this._logger.info("Start: %s", fullname);

        if (!this._values[fullname]) {
            this._values[fullname] = {};
        }

        var scopeObj = {
            scope: (childName, childCb) => {
                return this._scope(fullname, childName, childCb);
            }
        }

        var stopwatch = new StopWatch();
        return Promise.resolve()
            .then(() => cb(scopeObj))
            .then(result => {
                var duration = stopwatch.stop();
                this._logger.info("Completed: %s, Duration: %sms", fullname, duration);
                this._values[fullname] = {
                    duration: duration
                }
                return result;
            })
            .catch(reason => {
                var duration = stopwatch.stop();
                this._logger.info("Failed: %s, Duration: %sms", fullname, duration);
                this._values[fullname] = {
                    duration: duration,
                    failed: true
                }
                throw reason;
            });
    }

}

module.exports = ProcessingTracker;