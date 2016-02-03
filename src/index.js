'use strict';

const isPlainObject = require('is-plain-obj')
  , moment = require('moment')

  , PARSE_KEYS = [
      'created',
      'end',
      'from',
      'middle',
      'nominalStart',
      'rise',
      'set',
      'start',
      'times',
      'to',
      'update'
    ]

  , localNow = Date.now()
  , utcNow = moment.utc().valueOf();

exports.ANNUALLY = 'annually';
exports.DAILY = 'daily';
exports.DAY_END = 18;
exports.DAY_START = exports.DAY_END - 12;
exports.HOURLY = 'hourly';
exports.MONTHLY = 'monthly';
// Local timezone offset
exports.TZ_OFFSET = moment().utcOffset();
exports.WEEKLY = 'weekly';

// Expose current version of moment
// Because of patching, we need to always use this reference
exports.moment = moment;
exports.momentPath = require.resolve('moment');

// Monkey patch Moment for stringify support
moment.fn.toJSON = function () {
  return this.format();
};

/**
 * 'Now' relative to UTC and localtime
 * @returns {Number}
 */
exports.now = function () {
  return utcNow + (Date.now() - localNow);
};

/**
 * Retrieve epoch from UTC string
 * @param {Moment|String} date
 * @returns {Number}
 */
exports.epochFromUTC = function (date) {
  date = moment.isMoment(date) ? date : Date.parse(date);
  return moment.utc(date).valueOf();
};

/**
 * Determine if 'date1' and 'date2' fall within same 'interval'
 * @param {Moment} date1
 * @param {Moment} date2
 * @param {String} interval
 * @returns {Boolean}
 */
exports.sameInterval = function (date1, date2, interval) {
  switch (interval) {
    case exports.DAILY:
      return getDay(date1).isSame(getDay(date2), 'day');
  }
};

/**
 * Retrieve number of days between 'date1' and 'date2'
 * @param {Moment} date1
 * @param {Moment} date2
 * @returns {Number}
 */
exports.daysFrom = function (date1, date2) {
  return getDay(date1).diff(getDay(date2), 'days');
};

/**
 * Retrieve number of milliseconds between 'date1' and 'date2'
 * @param {Moment|String} date1
 * @param {Moment|String} date2
 * @returns {Number}
 */
exports.millisecondsFrom = function (date1, date2) {
  date1 = moment.isMoment(date1) ? date1 : Date.parse(date1);
  date2 = moment.isMoment(date2) ? date2 : Date.parse(date2);

  return moment(date2).diff(moment(date1));
};

/**
 * Retrieve long format day text from 'date'
 * @param {Moment} date
 * @param {Number} daysFromNow
 * @param {String} format
 * @param {Object} grammar
 * @returns {String}
 */
exports.formatDay = function (date, daysFromNow, format, grammar) {
  if (daysFromNow < 2) {
    const hour = date.hour();

    return ((daysFromNow == 1)
      ? grammar.tomorrow
      : (hour >= exports.DAY_END || hour < exports.DAY_START)
        ? grammar.tonight
        : grammar.today
    );
  }

  return date.format(format);
};

/**
 * Parse date strings into moment instances
 * @param {Object} obj
 * @returns {Object}
 */
exports.parse = function (obj) {
  function isParseable (val) {
    const type = typeof val;

    return 'number' == type || 'string' == type;
  }

  function parse (val) {
    if (Array.isArray(val)) {
      return val.map((v) => {
        return isParseable(v) ? moment.parseZone(v) : traverse(v);
      });
    } else if (isParseable(val)) {
      return moment.parseZone(val);
    }
    return val;
  }

  function traverse (o) {
    // Abort if not object or array
    if (!(Array.isArray(o) || isPlainObject(o))) return o;

    for (const prop in o) {
      // Only parse whitelisted keys
      o[prop] = (~PARSE_KEYS.indexOf(prop))
        ? parse(o[prop])
        : traverse(o[prop]);
    }

    return o;
  }

  return traverse(obj);
};

/**
 * Get expiry as epoch timestamp
 * @param {Number} number
 * @param {String} key
 * @returns {String}
 */
exports.getExpires = function (number, key) {
  return moment.utc().add(number, key).valueOf();
};

/**
 * Adjust 'date' to whole day, taking into account daily offset start time
 * @param {Moment} date
 * @returns {Moment}
 */
function getDay (date) {
  var d = moment({
    y: date.year(),
    M: date.month(),
    d: date.date(),
    h: 0,
    m: 0
  });

  return (date.hour() < exports.DAY_START)
    ? d.subtract(1, 'day')
    : d;
}