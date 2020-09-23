const StopWatch = require('../lib/stopwatch');
const _ = require('the-lodash');

class ProcessingTracker
{
    constructor(logger)
    {
        this._logger = logger;
        this._values = {};
        this._listeners = [];
    }

    registerListener(cb)
    {
        this._listeners.push(cb);
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
            info.debugOutput();
        }
        this._logger.info("*** DEBUG OUTPUT END");

        const extractedData = this.extract();
        for(var cb of this._listeners)
        {
            cb(extractedData);
        }
    }

    extract()
    {
        const items = [];
        for(var x of _.keys(this._values))
        {
            var info = this._values[x];
            items.push(info.extract());
        }
        return items;
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

        let currentTask = this._values[fullname];
        if (!currentTask) {
            currentTask = new ProcessingTaskInfo(this._logger, fullname);
            this._values[fullname] = currentTask;
        }

        var scopeObj = {
            scope: (childName, childCb) => {
                return this._scope(fullname, childName, childCb);
            }
        }

        currentTask.start();
        return Promise.resolve()
            .then(() => cb(scopeObj))
            .then(result => {
                currentTask.finishSuccess();
                return result;
            })
            .catch(reason => {
                currentTask.finishFail();
                throw reason;
            });
    }
}


class ProcessingTaskInfo
{
    constructor(logger, name)
    {
        this._logger = logger;
        this._data = {
            name: name,
            results: []
        }
        this._currentInterval = null;
    }

    get name() {
        return this._data.name;
    }

    get latestInterval() {
        return _.last(this._data.results);
    }

    get failed() {
        if (this.latestInterval) {
            return this.latestInterval.failed;
        }
        return false;
    }

    get duration() {
        if (this.latestInterval) {
            return this.latestInterval.duration;
        }
        return null;
    }

    get durationInfo() {
        const str = this._data.results.map(x => `[ ${(x.duration == null) ? 'Working' : '' + x.duration + 'ms' } ]`).join(' ');
        return str;
    }

    start()
    {
        this._stopwatch = new StopWatch();
        this._currentInterval = {

        }
    }

    finishSuccess()
    {
        if (!this._currentInterval) {
            return;
        }
        const duration = this._finish(true);
        this._logger.info("Completed: %s, Duration: %sms", this.name, duration);
    }

    finishFail()
    {
        if (!this._currentInterval) {
            return;
        }
        const duration = this._finish(false);
        this._logger.info("Failed: %s, Duration: %sms", this.name, duration);
    }

    _finish(isSucceeded)
    {
        const duration = this._stopwatch.stop();

        this._currentInterval.duration = duration;
        this._currentInterval.failed = !isSucceeded;

        this._data.results.push(this._currentInterval);
        this._data.results = _.takeRight(this._data.results, 5);

        this._currentInterval = null;

        return duration;
    }
    
    extract()
    {
        return this._data;
    }

    debugOutput()
    {
        if (this.failed)
        {
            this._logger.warn("* Task: %s. %s", this.name, this.durationInfo);
        }
        else
        {
            this._logger.info("* Task: %s. %s", this.name, this.durationInfo);
        }
    }
    
}

module.exports = ProcessingTracker;