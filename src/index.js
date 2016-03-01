'use strict';

/**
 * Time utilities
 * https://github.com/yr/time
 * @copyright Yr
 * @license MIT
 */

const DAY_END = 18
  , DAY_START = DAY_END - 12
    // YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.SSSZ or YYYY-MM-DDTHH:mm:ss+00:00
  , RE_PARSE = /^(\d{2,4})-?(\d{1,2})?-?(\d{1,2})?T?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?(?:Z|(?:\.\d{3}Z)|(([+-])(\d{2}):?(\d{2})))?$/
  , RE_TOKEN = /(Y{4}|Y{2})|(M{1,4})|(D{1,2})|(d{1,4})|(H{1,2})|(m{1,2})|(s{1,2})/g;

module.exports = {
  /**
   * Instance factory
   * @param {String} timeString
   * @returns {Time}
   */
  create (timeString) {
    return new Time(timeString);
  },

  now () {
    return Date.now();
  }
};

class Time {
  /**
   * Constructor
   * @param {String} timeString
   */
  constructor (timeString) {
    this._date = 'Invalid date';
    this.isValid = false;

    // Prevent regex denial of service
    if (!timeString || timeString.length > 25) return;

    const match = timeString.match(RE_PARSE);

    if (!match) return;

    const year = +match[1]
      , month = +match[2] || 1
      , day = +match[3] || 1
      , second = +match[6] || 0
      , offset = match[7] || '';
    let hour = +match[4] || 0
      , minute = +match[5] || 0;

    // Handle TZ offset
    if (offset) {
      const dir = (match[8] == '+') ? 1 : -1;

      hour += dir * +match[9];
      minute += dir * +match[10];
      this._offset = dir * ((+match[9] * 60) + +match[10]);
    } else {
      this._offset = 0;
    }

    this._date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    this._offsetString = offset || '+00:00';
    this._locale = null;
    this.isValid = true;
  }

  /**
   * Add 'value' in 'dimension' (Y|M|D|H|m|s)
   * Returns new instance
   * @param {Number} value
   * @param {String} dimension
   * @returns {Time}
   */
  add (value, dimension) {
    return this._manipulate(value, dimension);
  }

  /**
   * Subtract 'value' in 'dimension' (Y|M|D|H|m|s)
   * Returns new instance
   * @param {Number} value
   * @param {String} dimension
   * @returns {Time}
   */
  subtract (value, dimension) {
    return this._manipulate(value * -1, dimension);
  }

  /**
   * Compute difference between 'time' in 'dimension' (from Moment.js)
   * @param {Time} time
   * @param {String} dimension
   * @param {Boolean} asFloat
   * @returns {Number}
   */
  diff (time, dimension, asFloat) {
    if (!this.isValid) return NaN;
    if (!time.isValid) return NaN;

    let diff = 0;

    if (dimension == 'Y' || dimension == 'M') {
      diff = this._monthDiff(time);
      if (dimension == 'Y') diff /= 12;
    } else {
      const delta = this._date - time._date;

      switch (dimension) {
        case 'D':
          diff = delta / 864e5;
          break;
        case 'H':
          diff = delta / 36e5;
          break;
        case 'm':
          diff = delta / 6e4;
          break;
        case 's':
          diff = delta / 1e3;
          break;
      }
    }

    return asFloat ? diff : round(diff);
  }

  /**
   * Retrieve full year
   * @returns {Number}
   */
  year () {
    return this._date.getUTCFullYear();
  }

  /**
   * Retrieve month (0-11)
   * @returns {Number}
   */
  month () {
    return this._date.getUTCMonth();
  }

  /**
   * Retrieve day of month (1-31)
   * @returns {Number}
   */
  date () {
    return this._date.getUTCDate();
  }

  /**
   * Retrieve day of week (0-6)
   * @returns {Number}
   */
  day () {
    return this._date.getUTCDay();
  }

  /**
   * Retrieve hour (0-23)
   * @returns {Number}
   */
  hour () {
    return this._date.getUTCHours();
  }

  /**
   * Retrieve minute (0-59)
   * @returns {Number}
   */
  minute () {
    return this._date.getUTCMinutes();
  }

  /**
   * Retrieve second (0-59)
   * @returns {Number}
   */
  second () {
    return this._date.getUTCSeconds();
  }

  /**
   * Determine if 'time' is similar in 'dimension'
   * @param {Time} time
   * @param {String} dimension
   * @returns {Boolean}
   */
  isSame (time, dimension) {
    if (!this.isValid || !time.isValid) return false;

    if (!dimension) return +this._date === +time._date;

    switch (dimension) {
      case 'Y':
        return this.year() == time.year();
      case 'M':
        return this.year() == time.year()
          && this.month() == time.month();
      case 'D':
        return this.year() == time.year()
          && this.month() == time.month()
          && this.date() == time.date();
      case 'H':
        return this.year() == time.year()
          && this.month() == time.month()
          && this.date() == time.date()
          && this.hour() == time.hour();
      case 'm':
        return this.year() == time.year()
          && this.month() == time.month()
          && this.date() == time.date()
          && this.hour() == time.hour()
          && this.minute() == time.minute();
    }
  }

  /**
   * Determine if 'time' is before in 'dimension'
   * @param {Time} time
   * @param {String} dimension
   * @returns {Boolean}
   */
  isBefore (time, dimension) {
    if (!this.isValid || !time.isValid) return false;

    if (!dimension) return +this._date < +time._date;

    const Y1 = this.year()
      , Y2 = time.year()
      , M1 = this.month()
      , M2 = time.month()
      , D1 = this.date()
      , D2 = time.date()
      , H1 = this.hour()
      , H2 = time.hour()
      , m1 = this.minute()
      , m2 = time.minute();
    let test = false;

    test = Y1 > Y2;
    if (dimension == 'Y') return test;
    test = test || Y1 == Y2 && M1 > M2;
    if (dimension == 'M') return test;
    test = test || M1 == M2 && D1 > D2;
    if (dimension == 'D') return test;
    test = test || D1 == D2 && H1 > H2;
    if (dimension == 'H') return test;
    test = test || H1 == H2 && m1 > m2;

    return test;
  }

  /**
   * Set 'locale'
   * @param {Object} locale
   * @returns {Time}
   */
  locale (locale) {
    let instance = this.clone();

    instance._locale = locale;
    return instance;
  }

  /**
   * Format into string based on 'mask'
   * @param {String} mask
   * @returns {String}
   */
  format (mask) {
    // Prevent regex denial of service
    if (!mask || mask.length > 100) return '';

    return mask.replace(RE_TOKEN, (match) => {
      switch (match) {
        case 'YY':
          return String(this.year()).slice(-2);
        case 'YYYY':
          return this.year();
        case 'M':
          return this.month() + 1;
        case 'MM':
          return pad(this.month() + 1);
        case 'MMM':
          return this._locale && this._locale.monthsShort ? this._locale.monthsShort[this.month()] : '[missing locale]';
        case 'MMMM':
          return this._locale && this._locale.months ? this._locale.months[this.month()] : '[missing locale]';
        case 'D':
          return this.date();
        case 'DD':
          return pad(this.date());
        case 'd':
          return this.day();
        case 'dd':
          return pad(this.day());
        case 'ddd':
          return this._locale && this._locale.daysShort ? this._locale.daysShort[this.day()] : '[missing locale]';
        case 'dddd':
          return this._locale && this._locale.days ? this._locale.days[this.day()] : '[missing locale]';
        case 'H':
          return this.hour();
        case 'HH':
          return pad(this.hour());
        case 'm':
          return this.minute();
        case 'mm':
          return pad(this.minute());
        case 's':
          return this.second();
        case 'ss':
          return pad(this.second());
        default:
          return '';
      }
    });
  }

  /**
   * Clone instance
   * @returns {Time}
   */
  clone () {
    let instance = new Time(this.isValid ? this._date.toISOString() : null);

    instance._offset = this._offset;
    instance._offsetString = this._offsetString;
    instance._locale = this._locale;

    return instance;
  }

  /**
   * Add/subtract 'value' in 'dimension' (Y|M|D|H|m|s)
   * Returns new instance
   * @param {Number} value
   * @param {String} dimension
   * @returns {Time}
   */
  _manipulate (value, dimension) {
    if (this.isValid) {
      let instance = this.clone();

      switch (dimension) {
        case 'Y':
          instance._date.setUTCFullYear(this.year() + value);
          break;
        case 'M':
          instance._date.setUTCMonth(this.month() + value);
          break;
        case 'D':
        case 'd':
          instance._date.setUTCDate(this.date() + value);
          break;
        case 'H':
          instance._date.setUTCHours(this.hour() + value);
          break;
        case 'm':
          instance._date.setUTCMinutes(this.minute() + value);
          break;
      }

      return instance;
    }

    return this;
  }

  /**
   * Compute difference between 'time' in months (from Moment.js)
   * @param {Time} time
   * @returns {Number}
   */
  _monthDiff (time) {
    const wholeMonthDiff = ((time.year() - this.year()) * 12) + (time.month() - this.month())
      , anchor = this._manipulate(wholeMonthDiff, 'M');
    let adjust;

    if (time._date - anchor._date < 0) {
      const anchor2 = this._manipulate(wholeMonthDiff - 1, 'M');

      adjust = (time._date - anchor._date) / (anchor._date - anchor2._date);
    } else {
      const anchor2 = this._manipulate(wholeMonthDiff + 1, 'M');

      adjust = (time._date - anchor._date) / (anchor2._date - anchor._date);
    }

    return -(wholeMonthDiff + adjust);
  }

  /**
   * Return stringified
   * @returns {String}
   */
  toJSON () {
    // Reverse offset
    const d = this._manipulate(-this._offset, 'm');

    return `${d.year()}-${pad(d.month() + 1)}-${pad(d.date())}T${pad(d.hour())}:${pad(d.minute())}:${pad(d.second())}${this._offsetString}`;
  }
}

/**
 * Round 'value' towards 0
 * @param {Number} value
 * @returns {Number}
 */
function round (value) {
  if (value < 0) return Math.ceil(value);
  return Math.floor(value);
}

/**
 * Pad 'value' with zeros up to desired 'length'
 * @param {String|Number} value
 * @param {Number} length
 * @returns {String}
 */
function pad (value, length) {
  value = String(value);
  length = length || 2;

  while (value.length < length) {
    value = '0' + value;
  }

  return value;
}

// const isPlainObject = require('is-plain-obj')
//   , moment = require('moment')

//   , PARSE_KEYS = [
//       'created',
//       'end',
//       'from',
//       'middle',
//       'nominalStart',
//       'rise',
//       'set',
//       'start',
//       'times',
//       'to',
//       'update'
//     ]

//   , localNow = Date.now()
//   , utcNow = moment.utc().valueOf();

// exports.ANNUALLY = 'annually';
// exports.DAILY = 'daily';
// exports.DAY_END = 18;
// exports.DAY_START = exports.DAY_END - 12;
// exports.HOURLY = 'hourly';
// exports.MONTHLY = 'monthly';
// // Local timezone offset
// exports.TZ_OFFSET = moment().utcOffset();
// exports.WEEKLY = 'weekly';

// /**
//  * Determine if 'date1' and 'date2' fall within same 'interval'
//  * @param {Moment} date1
//  * @param {Moment} date2
//  * @param {String} interval
//  * @returns {Boolean}
//  */
// exports.sameInterval = function (date1, date2, interval) {
//   switch (interval) {
//     case exports.DAILY:
//       return getDay(date1).isSame(getDay(date2), 'day');
//   }
// };

// /**
//  * Retrieve number of days between 'date1' and 'date2'
//  * @param {Moment} date1
//  * @param {Moment} date2
//  * @returns {Number}
//  */
// exports.daysFrom = function (date1, date2) {
//   return getDay(date1).diff(getDay(date2), 'days');
// };

// /**
//  * Retrieve long format day text from 'date'
//  * @param {Moment} date
//  * @param {Number} daysFromNow
//  * @param {String} format
//  * @param {Object} grammar
//  * @returns {String}
//  */
// exports.formatDay = function (date, daysFromNow, format, grammar) {
//   if (daysFromNow < 2) {
//     const hour = date.hour();

//     return ((daysFromNow == 1)
//       ? grammar.tomorrow
//       : (hour >= exports.DAY_END || hour < exports.DAY_START)
//         ? grammar.tonight
//         : grammar.today
//     );
//   }

//   return date.format(format);
// };

// /**
//  * Parse date strings into moment instances
//  * @param {Object} obj
//  * @returns {Object}
//  */
// exports.parse = function (obj) {
//   function isParseable (val) {
//     const type = typeof val;

//     return 'number' == type || 'string' == type;
//   }

//   function parse (val) {
//     if (Array.isArray(val)) {
//       return val.map((v) => {
//         return isParseable(v) ? moment.parseZone(v) : traverse(v);
//       });
//     } else if (isParseable(val)) {
//       return moment.parseZone(val);
//     }
//     return val;
//   }

//   function traverse (o) {
//     // Abort if not object or array
//     if (!(Array.isArray(o) || isPlainObject(o))) return o;

//     for (const prop in o) {
//       // Only parse whitelisted keys
//       o[prop] = (~PARSE_KEYS.indexOf(prop))
//         ? parse(o[prop])
//         : traverse(o[prop]);
//     }

//     return o;
//   }

//   return traverse(obj);
// };

// /**
//  * Get expiry as epoch timestamp
//  * @param {Number} number
//  * @param {String} key
//  * @returns {String}
//  */
// exports.getExpires = function (number, key) {
//   return moment.utc().add(number, key).valueOf();
// };

// /**
//  * Adjust 'date' to whole day, taking into account daily offset start time
//  * @param {Moment} date
//  * @returns {Moment}
//  */
// function getDay (date) {
//   var d = moment({
//     y: date.year(),
//     M: date.month(),
//     d: date.date(),
//     h: 0,
//     m: 0
//   });

//   return (date.hour() < exports.DAY_START)
//     ? d.subtract(1, 'day')
//     : d;
// }