const moment = require('moment');

class StopWatch
{
    constructor()
    {
        this._startMoment = moment(new Date());
    }

    get durationMs() {
        return this._durationMs;
    }

    stop()
    {
        var now = moment(new Date());
        this._durationMs = moment.duration(now.diff(this._startMoment)).asMilliseconds();
        return this._durationMs;
    }
}

module.exports = StopWatch;