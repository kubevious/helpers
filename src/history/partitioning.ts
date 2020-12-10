import _ from 'the-lodash';
import moment from 'moment';

export function calculateDatePartition(date: any) : number
{
    let dateM = moment(date);
    let part = ((dateM.year()) * 100 + (dateM.month() + 1) ) * 100 + dateM.date();
    return part;
}

export function partitionName(partition: number) : string
{
    return 'p' + partition;
}