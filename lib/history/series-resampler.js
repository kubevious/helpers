const _ = require('the-lodash');

class SeriesResampler
{
    constructor(resolution)
    {
        this._resolution = resolution;
        this._metadata = {};
    }

    column(name, reducer)
    {
        this._metadata[name] = reducer;
        return this;
    }

    process(data)
    {
        if (data.length <= 2) {
            return data;
        }
    
        let minTime = data[0].date.getTime();
        let maxTime = minTime;
        for(let point of data)
        {
            let time = point.date.getTime();
            minTime = Math.min(time, minTime);
            maxTime = Math.max(time, maxTime);
        }
    
        let bucketWidth = (maxTime - minTime) / this._resolution;
        if (bucketWidth <= 0) {
            return data;
        }
    
        let buckets = [];
        for(let i = 0; i < this._resolution; i++)
        {
            let bucket = {
                time: minTime + bucketWidth * i,
                points: []
            };
            buckets.push(bucket);
        }
        buckets.push({
            time: maxTime,
            points: []
        });
    
        for(let point of data)
        {
            let bucketId = this._getBucketId(point.date, minTime, bucketWidth);
            buckets[bucketId].points.push(point);
        }
    
        let resampled = [];
        let lastPoint = null;
        for(let i = 0; i < buckets.length; i++)
        {
            let bucket = buckets[i];
            let point = {
                date: new Date(bucket.time)
            }
    
            for(let column of _.keys(this._metadata))
            {
                let reducer = this._metadata[column];
    
                const values = bucket.points.map(p => p[column]);
                let value;
                if (values.length == 0)
                {
                    if (lastPoint) {
                        value = lastPoint[column];
                    } else {
                        value = 0;
                    }
                } 
                else 
                {
                    value = Math.floor(reducer(values));
                }
    
                point[column] = value;
            }
    
            lastPoint = point;
    
            resampled.push(point);
        }
    
        return resampled;
    }

    _getBucketId(date, minTime, bucketWidth)
    {
        let timeDiff = date.getTime() - minTime;
        let id = Math.floor(timeDiff / bucketWidth);
        if (id > this._resolution) {
            id = this._resolution;
        }
        return id;
    }
}

module.exports = SeriesResampler;
