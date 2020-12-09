import moment from 'moment';

export class StopWatch
{
    private _startMoment : moment.Moment;
    private _durationMs : number = 0;

    constructor()
    {
        this._startMoment = moment(new Date());
    }

    get durationMs() : number {
        return this._durationMs;
    }

    stop()
    {
        var now = moment(new Date());
        this._durationMs = moment.duration(now.diff(this._startMoment)).asMilliseconds();
        return this._durationMs;
    }
}