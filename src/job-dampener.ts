import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { HandledError } from './handled-error';

export type JobDampenerHandler<T> = (data : T, date : Date) => void;

export class JobDampener<T>
{
    private _logger : ILogger;

    private _options: JobDampenerOptions;

    private _handlerCb : JobDampenerHandler<T>;

    private _jobQueue : Job<T>[] = [];
    private _isProcessing = false;
    private _isScheduled = false;
    private _queueSize = 1;
    private _rescheduleTimeoutMs = 5000;

    constructor(logger: ILogger, handler : JobDampenerHandler<T>, options?: JobDampenerOptions)
    {
        this._logger = logger;
        this._handlerCb = handler;

        this._options = options ?? {};

        if (_.isNotNullOrUndefined(this._options.queueSize)) {
            this._queueSize = this._options.queueSize!;
        }

        if (_.isNotNullOrUndefined(this._options.rescheduleTimeoutMs)) {
            this._rescheduleTimeoutMs = this._options.rescheduleTimeoutMs!;
        }

        this._notifyState();
    }

    get logger() {
        return this._logger;
    }

    get queueLength() {
        return this._jobQueue.length;
    }

    get isBusy() {
        return this._isProcessing || (this.queueLength > 0);
    }

    acceptJob(data : T, date? : Date)
    {
        if (!date) {
            date = new Date()
        }
        this._jobQueue.push({ data: data, date: date });
        this._filterJobs();

        this._logger.info("[acceptJob] job date: %s. queue size: %s", date.toISOString(), this._jobQueue.length);

        this._tryProcessJob();
    }

    private _filterJobs()
    {
        while(this._jobQueue.length > this._queueSize) {
            this._jobQueue.shift()
        }
    }

    private _tryProcessJob()
    {
        this._notifyState();

        if (this._isProcessing) {
            return;
        }

        if (this._jobQueue.length == 0) {
            this._logger.info("[_tryProcessJob] empty");
            return;
        }

        const job = _.head(this._jobQueue)!;
        this._jobQueue.shift();
        this._isProcessing = true;
        this._processJob(job)
            .then(result => {
                this._isProcessing = false;
                if (result.success)
                {
                    this._logger.info("[_tryProcessJob] END");
                    this._tryProcessJob();
                }
                else
                {
                    this._logger.warn("[_tryProcessJob] last job failed");
                    this._retryJob(job);
                }
                return null;
            })
            .catch(reason => {
                this._logger.error("[_tryProcessJob] ", reason);
                this._isProcessing = false;
                this._retryJob(job);
                return null;
            })
    }

    private _processJob(job: Job<T>)
    {
        this.logger.info("[_processJob] BEGIN. Date: %s", job.date.toISOString());

        return Promise.resolve(null)
            .then(() => {
                return this._handlerCb(job.data, job.date);
            })
            .then(() => {
                this.logger.info("[_processJob] END");
                return {
                    success: true
                };
            })
            .catch(reason => {
                if (reason instanceof HandledError) {
                    this.logger.error('[_processJob] ERROR: %s', reason.message);
                } else {
                    this.logger.error('[_processJob] ERROR: ', reason);
                }
                return {
                    success: false
                };
            });
    }

    private _retryJob(job: Job<T>)
    {
        this._jobQueue.splice(0, 0, job);
        this._filterJobs();
        this._rescheduleProcess();
    }

    private _rescheduleProcess()
    {
        this._logger.info("[_rescheduleProcess]");
        if (this._isScheduled) {
            return;
        }
        this._isScheduled = true;

        setTimeout(() => {
            this._isScheduled = false;
            this._tryProcessJob();
        }, this._rescheduleTimeoutMs);
    }

    private _notifyState()
    {
        const state : JobDampenerState = {
            inQueue: this._jobQueue.length,
            isProcessing: this._isProcessing,
            totalJobs: this._jobQueue.length + (this._isProcessing ? 1 : 0)
        }

        this.logger.debug("[_notifyState] state: ", state);

        return Promise.resolve(null)
            .then(() => {
                if (this._options.stateMonitorCb) {
                    return this._options.stateMonitorCb(state);
                }
                // return this._handlerCb(job.data, job.date);
            })
            .then(() => {
                return null;
            })
            .catch(reason => {
                this.logger.error('[_notifyProgress] ERROR: ', reason);
                return null;
            });
    }

}

interface Job<T>
{
    date: Date;
    data: T
}

export interface JobDampenerOptions
{
    queueSize?: number;
    rescheduleTimeoutMs?: number;
    stateMonitorCb?: (state: JobDampenerState) => any;
}

export interface JobDampenerState
{
    inQueue: number;
    isProcessing: boolean;
    totalJobs: number
}

