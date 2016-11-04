'use strict';

/**
 * Time utilities
 * https://github.com/yr/time
 * @copyright Yr
 * @license MIT
 */

const isPlainObject = require('is-plain-obj');

const DEFAULT_DATE = 'Invalid Date';
const DEFAULT_DAY_STARTS_AT = 0;
const DEFAULT_NIGHT_STARTS_AT = 18;
const DEFAULT_OFFSET = '+00:00';
const DEFAULT_PARSE_KEYS = [
  'created',
  'end',
  'from',
  'rise',
  'set',
  'start',
  'times',
  'to',
  'update'
];
const FLAGS = {
  Y: 1,
  M: 2,
  D: 4,
  H: 8,
  m: 16,
  s: 32,
  S: 64
};
const FLAGS_START_OF = {
  Y: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H | FLAGS.D | FLAGS.M,
  M: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H | FLAGS.D,
  D: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H,
  H: FLAGS.S | FLAGS.s | FLAGS.m,
  m: FLAGS.S | FLAGS.s,
  s: FLAGS.S
};
// YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.SSSZ or YYYY-MM-DDTHH:mm:ss+00:00
const RE_PARSE = /^(\d{2,4})-?(\d{1,2})?-?(\d{1,2})?T?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?\.?(\d{3})?(?:Z|(([+-])(\d{2}):?(\d{2})))?$/;
const RE_TOKEN = /(LTS?|L{1,4}|Y{4}|Y{2}|M{1,4}|D{1,2}|d{3}r|d{2}r|d{1,4}|H{1,2}|m{1,2}|s{1,2}|S{1,3}|ZZ)/g;
const RE_TOKEN_ESCAPE = /(\[[^\]]+\])/g;
const RE_TOKEN_ESCAPED = /(\$\d\d?)/g;
let dayStartsAt = DEFAULT_DAY_STARTS_AT;
let nightStartsAt = DEFAULT_NIGHT_STARTS_AT;
let parseKeys = DEFAULT_PARSE_KEYS;

module.exports = {
  isTime,

  /**
   * Initialize with defaults
   * @param {Object} [options]
   *  - {Number} dayStartsAt
   *  - {Number} nightStartsAt
   *  - {Array} parseKeys
   */
  init (options = {}) {
    dayStartsAt = options.dayStartsAt || DEFAULT_DAY_STARTS_AT;
    nightStartsAt = options.nightStartsAt || DEFAULT_NIGHT_STARTS_AT;
    parseKeys = options.parseKeys || DEFAULT_PARSE_KEYS;
  },

  /**
   * Instance factory
   * @param {String} timeString
   * @returns {Time}
   */
  create (timeString) {
    // Return if passed Time instance
    if (timeString && 'string' != typeof timeString && isTime(timeString)) return timeString;
    return new Time(timeString);
  },

  /**
   * Retrieve instance at current client time
   * @returns {Time}
   */
  now () {
    return this.create().utc();
  },

  /**
   * Parse time strings into Time instances
   * @param {Object} obj
   * @returns {Object}
   */
  parse (obj) {
    function parseValue (value) {
      if (Array.isArray(value)) {
        return value.map((value) => {
          return ('string' == typeof value) ? new Time(value) : traverse(value);
        });
      } else if ('string' == typeof value) {
        return new Time(value);
      }
      return value;
    }

    function traverse (o) {
      // Abort if not object or array
      if (!(Array.isArray(o) || isPlainObject(o))) return o;

      for (const prop in o) {
        // Only parse whitelisted keys
        o[prop] = (~parseKeys.indexOf(prop))
          ? parseValue(o[prop])
          : traverse(o[prop]);
      }

      return o;
    }

    return traverse(obj);
  }
};

class Time {
  /**
   * Constructor
   * @param {String} timeString
   */
  constructor (timeString) {
    // Return if timeString not a string
    if (timeString && 'string' != typeof timeString) return timeString;

    this._date = DEFAULT_DATE;
    this._locale = null;
    this._offset = 0;
    this._offsetString = DEFAULT_OFFSET;
    this.isValid = false;
    this.timeString = DEFAULT_DATE;

    // Local "now"
    if (timeString == null) timeString = clientNow();
    // Prevent regex denial of service
    if (timeString.length > 30) return;

    const match = timeString.match(RE_PARSE);

    if (!match) return;

    const year = +match[1];
    const month = +match[2] || 1;
    const day = +match[3] || 1;
    const hour = +match[4] || 0;
    const minute = +match[5] || 0;
    const second = +match[6] || 0;
    const millisecond = +match[7] || 0;
    const offset = match[8] || '';

    // Handle TZ offset
    if (offset && offset != DEFAULT_OFFSET) {
      const dir = (match[9] == '+') ? 1 : -1;

      this._offset = dir * ((+match[10] * 60) + +match[11]);
      this._offsetString = offset;
    }

    // Create UTC date based on local time so we can always use UTC methods
    this._date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    this.isValid = isValid(this._date);
    this.timeString = this.toString();
  }

  /**
   * Modify Offset with new 'value' in minutes
   * @param {Number} value
   * @returns {Time}
   */
  offset (value) {
    if (value == this._offset) return this;

    let instance = this.utc()._manipulate(value, 'minutes');

    instance._offset = value;
    instance._offsetString = minutesToOffsetString(value);
    update(instance);
    return instance;
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
   * @returns {Number}
   */
  diff (time, unit, asFloat) {
    if (!this.isValid) return NaN;
    if (!time.isValid) return NaN;

    unit = normalizeUnit(unit);

    let diff = 0;
    let t1 = this;
    let t2 = time;
    
    if (unit == 'Y' || unit == 'M') {
      diff = t1._monthDiff(t2);
      if (unit == 'Y') diff /= 12;
    } else {
      // Correct for custom day start
      if (unit == 'D' && !asFloat) {
        t1 = t1.startOf('D');
        t2 = t2.startOf('D');
      }
      const offsetDelta = 60000 * (t1._offset - t2._offset);
      const delta = t1._date - t2._date + offsetDelta;

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
   * @returns {Time}
   */
  startOf (unit) {
    if (this.isValid) {
      unit = normalizeUnit(unit);

      const flags = FLAGS_START_OF[unit];
      let instance = this.clone();
      let d = instance._date;

      for (const dim in FLAGS) {
        if (flags & FLAGS[dim]) {
          switch (dim) {
            case 'M':
              d.setUTCMonth(0);
              break;
            case 'D':
              d.setUTCDate(1);
              break;
            case 'H':
              // Adjust day if less than day start hour
              if (unit == 'D' && dayStartsAt > d.getUTCHours()) d.setUTCDate(d.getUTCDate() - 1);
              d.setUTCHours(dayStartsAt);
              break;
            case 'm':
              d.setUTCMinutes(0);
              break;
            case 's':
              d.setUTCSeconds(0);
              break;
            case 'S':
              d.setUTCMilliseconds(0);
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
    return this._date.getUTCFullYear();
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
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */
  day (value) {
    const day = this._date.getUTCDay();

    if (value != null) return this._set(this.date() + value - day, 'setUTCDate');
    return day;
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
   * Compare 'time', limited by 'unit', and determine if is similar
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */
  isSame (time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date === +time._date;

    let t1 = this;
    let t2 = time;

    // Correct for custom day start
    if (unit == 'D') {
      t1 = t1.startOf(unit);
      t2 = t2.startOf(unit);
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
   * Compare 'time', limited by 'unit', and determine if is before
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */
  isBefore (time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date < +time._date;

    const Y1 = this.year();
    const Y2 = time.year();
    const M1 = this.month();
    const M2 = time.month();
    const D1 = this.date();
    const D2 = time.date();
    const H1 = this.hour();
    const H2 = time.hour();
    const m1 = this.minute();
    const m2 = time.minute();
    const s1 = this.second();
    const s2 = time.second();
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
   * @param {Number} [daysFromNow]
   * @returns {String}
   */
  format (mask, daysFromNow) {
    if (!mask) return this.timeString;
    // Prevent regex denial of service
    if (mask.length > 100) return '';

    const relativeDay = (daysFromNow != null)
      ? this._getRelativeDay(daysFromNow)
      : '';
    let escaped = [];
    let idx = 0;

    // Remove all escaped text (in [xxx])
    mask = mask.replace(RE_TOKEN_ESCAPE, (match) => {
      escaped.push(match.slice(1, -1));
      return '$' + idx++;
    });

    mask = mask.replace(RE_TOKEN, (match) => {
      switch (match) {
        case 'LT':
        case 'LTS':
        case 'L':
        case 'LL':
        case 'LLL':
        case 'LLLL':
          return this._locale && this._locale.format && this._locale.format[match] ? this.format(this._locale.format[match], daysFromNow) : '[missing locale]';
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
        case 'ddr':
          if (relativeDay) return this._locale && this._locale[relativeDay] ? this._locale[relativeDay] : '[missing locale]';
          return this._locale && this._locale.daysShort ? this._locale.daysShort[this.day()] : '[missing locale]';
        case 'dddr':
          if (relativeDay) return this._locale && this._locale[relativeDay] ? this._locale[relativeDay] : '[missing locale]';
          return this._locale && this._locale.days ? this._locale.days[this.day()] : '[missing locale]';
        case 'd':
          return this.day();
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
          return Math.floor(this.millisecond() / 100);
        case 'SS':
          return Math.floor(this.millisecond() / 10);
        case 'SSS':
          return this.millisecond();
        case 'ZZ':
          return this._offsetString;
        default:
          return '';
      }
    });

    // Replace all escaped text
    if (escaped.length) {
      mask = mask.replace(RE_TOKEN_ESCAPED, (match) => {
        return escaped[match.slice(1)];
      });
    }

    return mask;
  }

  /**
   * Retrieve instance of current time
   * @returns {Time}
   */
  now () {
    let instance = (new Time()).offset(this._offset);

    instance._locale = this._locale;
    return instance;
  }

  /**
   * Retrieve instance at UTC time
   * @returns {Time}
   */
  utc () {
    if (!this._offset) return this.clone();

    let t = this.subtract(this._offset, 'minutes');

    t._offset = 0;
    t._offsetString = DEFAULT_OFFSET;
    return update(t);
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
    let instance = this.clone();
    let d = instance._date;

    d[method](value);
    return update(instance);
  }

  /**
   * Retrieve relative day type based on number of days from "now"
   * @param {Number} daysFromNow
   * @returns {String}
   */
  _getRelativeDay (daysFromNow) {
    if (daysFromNow != null && daysFromNow < 2) {
      const hour = this.hour();

      return (daysFromNow == 1)
        ? 'tomorrow'
        : (hour >= nightStartsAt || hour < dayStartsAt)
          ? 'tonight'
          : 'today';
    }
    return '';
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
      let instance = this.clone();
      let d = instance._date;

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
          d.setUTCMilliseconds(d.getUTCMilliseconds() + value);
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
    const wholeMonthDiff = ((time._date.getUTCFullYear() - this._date.getUTCFullYear()) * 12) + (time._date.getUTCMonth() - this._date.getUTCMonth());
    const anchor = this._manipulate(wholeMonthDiff, 'M');
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
    return this._date.toISOString().replace('Z', this._offsetString);
  }

  /**
   * Convert to JSON format
   * @returns {String}
   */
  toJSON () {
    return this.timeString;
  }

  /**
   * Retrieve number of milliseconds UTC
   * @returns {Number}
   */
  valueOf () {
    if (!this.isValid) return NaN;
    return +this._date;
  }
}

/**
 * Retrieve timestring for client "now"
 * @returns {String}
 */
function clientNow () {
  const d = new Date();
  const offset = -1 * d.getTimezoneOffset();

  d.setUTCMinutes(d.getUTCMinutes() + offset);
  return d.toISOString().replace('Z', minutesToOffsetString(offset));
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
    case 'ms':
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
 * Determine if 'time' is a Time instance
 * @param {Time} time
 * @returns {Boolean}
 */
function isTime (time) {
  return time != null && time._manipulate != null && time._date != null;
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

/**
 * Convert 'minutes' to offset string
 * @param {Number} minutes
 * @returns {String}
 */
function minutesToOffsetString (minutes) {
  const t = String(Math.abs(minutes / 60)).split('.');
  const H = pad(t[0]);
  const m = t[1] ? (parseInt(t[1], 10) * 0.6) : 0;
  const sign = minutes < 0 ? '-' : '+';

  return `${sign}${H}:${pad(m)}`;
}