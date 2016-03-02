'use strict';

/**
 * Time utilities
 * https://github.com/yr/time
 * @copyright Yr
 * @license MIT
 */

const isPlainObject = require('is-plain-obj')

  , DEFAULT_DATE = 'Invalid Date'
  , DEFAULT_OFFSET = '+00:00'
  , FLAGS = {
      Y: 1,
      M: 2,
      D: 4,
      H: 8,
      m: 16,
      s: 32,
      S: 64
    }
  , FLAGS_START_OF = {
      Y: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H | FLAGS.D | FLAGS.M,
      M: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H | FLAGS.D,
      D: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H,
      H: FLAGS.S | FLAGS.s | FLAGS.m,
      m: FLAGS.S | FLAGS.s,
      s: FLAGS.S
    }
    // YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.SSSZ or YYYY-MM-DDTHH:mm:ss+00:00
  , RE_PARSE = /^(\d{2,4})-?(\d{1,2})?-?(\d{1,2})?T?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?\.?(\d{3})?(?:Z|(([+-])(\d{2}):?(\d{2})))?$/
  , RE_TOKEN = /(Y{4}|Y{2})|(M{1,4})|(D{1,2})|(d{1,4})|(H{1,2})|(m{1,2})|(s{1,2})|(S{1,3})/g;

module.exports = {
  PARSE_KEYS: [
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
  ],

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
  },

  /**
   * Parse time strings into Time instances
   * @param {Object} obj
   * @returns {Object}
   */
  parse (obj) {
    const parseValue = (value) => {
      if (Array.isArray(value)) {
        return value.map((value) => {
          return ('string' == typeof value) ? this.create(value) : traverse(value);
        });
      } else if ('string' == typeof value) {
        return this.create(value);
      }
      return value;
    };

    const traverse = (o) => {
      // Abort if not object or array
      if (!(Array.isArray(o) || isPlainObject(o))) return o;

      for (const prop in o) {
        // Only parse whitelisted keys
        o[prop] = (~this.PARSE_KEYS.indexOf(prop))
          ? parseValue(o[prop])
          : traverse(o[prop]);
      }

      return o;
    };

    return traverse(obj);
  }
};

class Time {
  /**
   * Constructor
   * @param {String} timeString
   */
  constructor (timeString) {
    this._date = DEFAULT_DATE;
    this._locale = null;
    this._offset = 0;
    this._offsetString = DEFAULT_OFFSET;
    this.isValid = false;
    this.timeString = DEFAULT_DATE;

    if (timeString == null) timeString = new Date().toISOString();
    // Prevent regex denial of service
    if (timeString.length > 30) return;

    const match = timeString.match(RE_PARSE);

    if (!match) return;

    const year = +match[1]
      , month = +match[2] || 1
      , day = +match[3] || 1
      , second = +match[6] || 0
      , millisecond = +match[7] || 0
      , offset = match[8] || '';
    let hour = +match[4] || 0
      , minute = +match[5] || 0;

    // Handle TZ offset
    if (offset && offset != DEFAULT_OFFSET) {
      const dir = (match[9] == '+') ? 1 : -1;

      hour += dir * +match[10];
      minute += dir * +match[11];
      this._offset = dir * ((+match[10] * 60) + +match[11]);
      this._offsetString = offset;
    }

    this._date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    this.isValid = isValid(this._date);
    this.timeString = this.toString();
  }

  /**
   * Add 'value' of 'unit' (years|months|days|hours|minutes|seconds|milliseconds)
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */
  add (value, unit) {
    return this._manipulate(value, unit);
  }

  /**
   * Subtract 'value' of 'unit' (years|months|days|hours|minutes|seconds|milliseconds)
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */
  subtract (value, unit) {
    return this._manipulate(value * -1, unit);
  }

  /**
   * Compute difference between 'time' of 'unit'
   * (from Moment.js)
   * @param {Time} time
   * @param {String} unit
   * @param {Boolean} [asFloat]
   * @param {Number} [value]
   * @returns {Number}
   */
  diff (time, unit, asFloat, value) {
    if (!this.isValid) return NaN;
    if (!time.isValid) return NaN;

    unit = normalizeUnit(unit);

    let diff = 0
      , t1 = this
      , t2 = time;

    // Reset to start of if custom value (will result in whole delta)
    if (value != null) {
      t1 = t1.startOf(unit, value);
      t2 = t2.startOf(unit, value);
    }

    if (unit == 'Y' || unit == 'M') {
      diff = t1._monthDiff(t2);
      if (unit == 'Y') diff /= 12;
    } else {
      const delta = t1._date - t2._date;

      switch (unit) {
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
        default:
          diff = delta;
      }
    }

    return asFloat ? diff : round(diff);
  }

  /**
   * Reset to start of 'unit'
   * Returns new instance
   * @param {String} unit
   * @param {Number} [value]
   * @returns {Time}
   */
  startOf (unit, value) {
    if (this.isValid) {
      unit = normalizeUnit(unit);

      const flags = FLAGS_START_OF[unit];
      let instance = this.clone()
        , d = instance._date
        , val;

      for (const dim in FLAGS) {
        if (flags & FLAGS[dim]) {
          switch (dim) {
            case 'M':
              val = 0;
              if (unit == 'Y' && value != null) {
                val = value;
                if (val > d.getUTCMonth()) d.setUTCFullYear(d.getUTCFullYear() - 1);
              }
              d.setUTCMonth(val);
              break;
            case 'D':
              val = 1;
              if (unit == 'M' && value != null) {
                val = value;
                if (val > d.getUTCDate()) d.setUTCMonth(d.getUTCMonth() - 1);
              }
              d.setUTCDate(val);
              break;
            case 'H':
              val = 0;
              if (unit == 'D' && value != null) {
                val = value;
                if (val > d.getUTCHours()) d.setUTCDate(d.getUTCDate() - 1);
              }
              d.setUTCHours(val);
              break;
            case 'm':
              val = 0;
              if (unit == 'H' && value != null) {
                val = value;
                if (val > d.getUTCMinutes()) d.setUTCHours(d.getUTCHours() - 1);
              }
              d.setUTCMinutes(val);
              break;
            case 's':
              val = 0;
              if (unit == 'm' && value != null) {
                val = value;
                if (val > d.getUTCSeconds()) d.setUTCMinutes(d.getUTCMinutes() - 1);
              }
              d.setUTCSeconds(val);
              break;
            case 'S':
              val = 0;
              if (unit == 's' && value != null) {
                val = value;
                if (val > d.getUTCMilliseconds()) d.setUTCSeconds(d.getUTCSeconds() - 1);
              }
              d.setUTCMilliseconds(val);
              break;
          }
        }
      }

      return update(instance);
    }

    return this;
  }

  /**
   * Get/set full year
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  year (value) {
    if (value != null) return this._set(value, 'setUTCFullYear');
    return this._date.getUTCFullYear();;
  }

  /**
   * Get/set month (0-11)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  month (value) {
    if (value != null) return this._set(value, 'setUTCMonth');
    return this._date.getUTCMonth();
  }

  /**
   * Get/set date (1-31)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  date (value) {
    if (value != null) return this._set(value, 'setUTCDate');
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
   * Get/set hour (0-23)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  hour (value) {
    if (value != null) return this._set(value, 'setUTCHours');
    return this._date.getUTCHours();
  }

  /**
   * Get/set minute (0-59)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  minute (value) {
    if (value != null) return this._set(value, 'setUTCMinutes');
    return this._date.getUTCMinutes();
  }

  /**
   * Get/set second (0-59)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  second (value) {
    if (value != null) return this._set(value, 'setUTCSeconds');
    return this._date.getUTCSeconds();
  }

  /**
   * Get/set millisecond (0-999)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  millisecond (value) {
    if (value != null) return this._set(value, 'setUTCMilliseconds');
    return this._date.getUTCMilliseconds();
  }

  /**
   * Compare 'time' with 'unit' and determine is similar
   * @param {Time} time
   * @param {String} [unit]
   * @param {Number} [value]
   * @returns {Boolean}
   */
  isSame (time, unit, value) {
    if (!this.isValid || !time.isValid) return false;

    unit = normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date === +time._date;

    let t1 = this
      , t2 = time;

    // Reset to start of if custom value
    if (value != null) {
      t1 = t1.startOf(unit, value);
      t2 = t2.startOf(unit, value);
    }

    switch (unit) {
      case 'Y':
        return t1.year() == t2.year();
      case 'M':
        return t1.year() == t2.year()
          && t1.month() == t2.month();
      case 'D':
        return t1.year() == t2.year()
          && t1.month() == t2.month()
          && t1.date() == t2.date();
      case 'H':
        return t1.year() == t2.year()
          && t1.month() == t2.month()
          && t1.date() == t2.date()
          && t1.hour() == t2.hour();
      case 'm':
        return t1.year() == t2.year()
          && t1.month() == t2.month()
          && t1.date() == t2.date()
          && t1.hour() == t2.hour()
          && t1.minute() == t2.minute();
      case 's':
        return t1.year() == t2.year()
          && t1.month() == t2.month()
          && t1.date() == t2.date()
          && t1.hour() == t2.hour()
          && t1.minute() == t2.minute()
          && t1.second() == t2.second();
    }
  }

  /**
   * Compare 'time' with 'unit' and determine if is before
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */
  isBefore (time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date < +time._date;

    const Y1 = this.year()
      , Y2 = time.year()
      , M1 = this.month()
      , M2 = time.month()
      , D1 = this.date()
      , D2 = time.date()
      , H1 = this.hour()
      , H2 = time.hour()
      , m1 = this.minute()
      , m2 = time.minute()
      , s1 = this.second()
      , s2 = time.second();
    let test = false;

    test = Y1 > Y2;
    if (unit == 'Y') return test;
    test = test || Y1 == Y2 && M1 > M2;
    if (unit == 'M') return test;
    test = test || M1 == M2 && D1 > D2;
    if (unit == 'D') return test;
    test = test || D1 == D2 && H1 > H2;
    if (unit == 'H') return test;
    test = test || H1 == H2 && m1 > m2;
    if (unit == 'm') return test;
    test = test || m1 == m2 && s1 > s2;

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
        case 'S':
          return this.millisecond();
        case 'SS':
          return pad(this.millisecond());
        case 'SSS':
          return pad(this.millisecond(), 3);
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
    let instance = new Time(this.timeString);

    instance._locale = this._locale;
    return instance;
  }

  /**
   * Set 'value' using 'method'
   * Returns new instance
   * @param {Number} value
   * @param {String} method
   * @returns {Time}
   */
  _set (value, method) {
    let instance = this.clone()
      , d = instance._date;

    d[method](value);
    return update(instance);
  }

  /**
   * Add/subtract 'value' in 'unit'
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */
  _manipulate (value, unit) {
    if (this.isValid) {
      let instance = this.clone()
        , d = instance._date;

      switch (normalizeUnit(unit)) {
        case 'Y':
          d.setUTCFullYear(d.getUTCFullYear() + value);
          break;
        case 'M':
          d.setUTCMonth(d.getUTCMonth() + value);
          break;
        case 'D':
        case 'd':
          d.setUTCDate(d.getUTCDate() + value);
          break;
        case 'H':
          d.setUTCHours(d.getUTCHours() + value);
          break;
        case 'm':
          d.setUTCMinutes(d.getUTCMinutes() + value);
          break;
        case 's':
          d.setUTCSeconds(d.getUTCSeconds() + value);
          break;
        case 'S':
          d.setUTCMilliseconds(s.getUTCMilliseconds() + value);
          break;
      }

      return update(instance);
    }

    return this;
  }

  /**
   * Compute difference between 'time' in months
   * (from Moment.js)
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
   * Retrieve stringified
   * @returns {String}
   */
  toString () {
    if (!this.isValid) return 'Invalid Date';

    const d = this._date;
    let str = '';

    if (this._offset != 0) {
      // Reverse offset
      d.setUTCMinutes(d.getUTCMinutes() - this._offset);
      str = d.toISOString();
      d.setUTCMinutes(d.getUTCMinutes() + this._offset);
    } else {
      str = d.toISOString();
    }

    return str.replace('Z', this._offsetString);
  }

  /**
   * Convert to JSON format
   * @returns {String}
   */
  toJSON () {
    return this.timeString;
  }

  /**
   * Retrieve numberified
   * @returns {Number}
   */
  valueOf () {
    if (!this.isValid) return NaN;

    const d = this._date;
    let num = 0;

    if (this._offset != 0) {
      // Reverse offset
      d.setUTCMinutes(d.getUTCMinutes() - this._offset);
      num = +d;
      d.setUTCMinutes(d.getUTCMinutes() + this._offset);
    } else {
      num = +d;
    }

    return num;
  }
}

/**
 * Update 'instance' state
 * @param {Time} instance
 * @returns {Time}
 */
function update (instance) {
  instance.isValid = isValid(instance._date);
  instance.timeString = instance.toString();
  return instance;
}

/**
 * Normalize 'unit'
 * @param {Strong} unit
 * @returns {String}
 */
function normalizeUnit (unit) {
  switch (unit) {
    case 'year':
    case 'years':
    case 'Y':
    case 'y':
      return 'Y';
    case 'month':
    case 'months':
    case 'M':
      return 'M';
    case 'day':
    case 'days':
    case 'date':
    case 'dates':
    case 'D':
    case 'd':
      return 'D';
    case 'hour':
    case 'hours':
    case 'H':
    case 'h':
      return 'H';
    case 'minute':
    case 'minutes':
    case 'm':
      return 'm';
    case 'second':
    case 'seconds':
    case 's':
      return 's';
    case 'millisecond':
    case 'milliseconds':
    case 'S':
      return 'S';
  }
  return unit;
}

/**
 * Validate 'date' object
 * @param {Date} date
 * @returns {Boolean}
 */
function isValid (date) {
  return Object.prototype.toString.call(date) == '[object Date]'
    && !isNaN(date.getTime());
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