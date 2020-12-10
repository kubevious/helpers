import _ from 'the-lodash';
import moment from 'moment';

export function diffSeconds(a: any, b: any) : number
{
    var momentA = moment(a);
    var momentB = moment(b);
    var duration = moment.duration(momentA.diff(momentB));
    return duration.asSeconds();
}

export function diffMilliseconds(a: any, b: any) : number
{
    var momentA = moment(a);
    var momentB = moment(b);
    var duration = moment.duration(momentA.diff(momentB));
    return duration.asMilliseconds();
}

export function diffFromNowSeconds(a: any) : number
{
    return diffSeconds(new Date(), a);
}

export function toMysqlFormat(date: any) : string
{
    date = makeDate(date);
    return date.getUTCFullYear() + "-" + 
        twoDigits(1 + date.getUTCMonth()) + "-" + 
        twoDigits(date.getUTCDate()) + " " + 
        twoDigits(date.getUTCHours()) + ":" + 
        twoDigits(date.getUTCMinutes()) + ":" + 
        twoDigits(date.getUTCSeconds());
}

export function makeDate(date: any) : Date
{
    if (_.isString(date)) {
        date = new Date(date);
    }
    return date;
}

function twoDigits(d : number) : string {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}
