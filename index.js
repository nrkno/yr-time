'use strict';

/**
 * Time utilities
 * https://github.com/yr/time
 * @copyright Yr
 * @license MIT
 */

var DEFAULT_DATE = 'Invalid Date';
var DEFAULT_DAY_STARTS_AT = 0;
var DEFAULT_NIGHT_STARTS_AT = 18;
var DEFAULT_OFFSET = '+00:00';
var FLAGS = {
  Y: 1,
  M: 2,
  D: 4,
  H: 8,
  m: 16,
  s: 32,
  S: 64
};
var FLAGS_START_OF = {
  Y: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H | FLAGS.D | FLAGS.M,
  M: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H | FLAGS.D,
  D: FLAGS.S | FLAGS.s | FLAGS.m | FLAGS.H,
  H: FLAGS.S | FLAGS.s | FLAGS.m,
  m: FLAGS.S | FLAGS.s,
  s: FLAGS.S
};
// YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.SSSZ or YYYY-MM-DDTHH:mm:ss+00:00
var RE_PARSE = /^(\d{2,4})-?(\d{1,2})?-?(\d{1,2})?T?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?\.?(\d{3})?(?:Z|(([+-])(\d{2}):?(\d{2})))?$/;
var RE_TOKEN = /(LTS?|L{1,4}|Y{4}|Y{2}|M{1,4}|D{1,2}|d{3}r|d{2}r|d{1,4}|H{1,2}r?|m{1,2}|s{1,2}|S{1,3}|ZZ)/g;
var RE_TOKEN_ESCAPE = /(\[[^\]]+\])/g;
var RE_TOKEN_ESCAPED = /(\$\d\d?)/g;
var dayStartsAt = DEFAULT_DAY_STARTS_AT;
var nightStartsAt = DEFAULT_NIGHT_STARTS_AT;

module.exports = {
  isTime: isTime,

  /**
   * Initialize with defaults
   * @param {Object} [options]
   *  - {Number} dayStartsAt
   *  - {Number} nightStartsAt
   *  - {Array} parseKeys
   */
  init: function init() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    dayStartsAt = options.dayStartsAt || DEFAULT_DAY_STARTS_AT;
    nightStartsAt = options.nightStartsAt || DEFAULT_NIGHT_STARTS_AT;
  },


  /**
   * Instance factory
   * @param {String} timeString
   * @returns {Time}
   */
  create: function create(timeString) {
    // Return if passed Time instance
    if (timeString && 'string' != typeof timeString && isTime(timeString)) return timeString;
    return new Time(timeString);
  },


  /**
   * Retrieve instance at current client time
   * @returns {Time}
   */
  now: function now() {
    return this.create().utc();
  }
};

var Time = function () {
  /**
   * Constructor
   * @param {String} timeString
   */
  function Time(timeString) {
    babelHelpers.classCallCheck(this, Time);

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

    var match = timeString.match(RE_PARSE);

    if (!match) return;

    var year = +match[1];
    var month = +match[2] || 1;
    var day = +match[3] || 1;
    var hour = +match[4] || 0;
    var minute = +match[5] || 0;
    var second = +match[6] || 0;
    var millisecond = +match[7] || 0;
    var offset = match[8] || '';

    // Handle TZ offset
    if (offset && offset != DEFAULT_OFFSET) {
      var dir = match[9] == '+' ? 1 : -1;

      this._offset = dir * (+match[10] * 60 + +match[11]);
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


  Time.prototype.offset = function offset(value) {
    if (value == this._offset) return this;

    var instance = this.utc()._manipulate(value, 'minutes');

    instance._offset = value;
    instance._offsetString = minutesToOffsetString(value);
    update(instance);
    return instance;
  };

  /**
   * Add 'value' of 'unit' (years|months|days|hours|minutes|seconds|milliseconds)
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */


  Time.prototype.add = function add(value, unit) {
    return this._manipulate(value, unit);
  };

  /**
   * Subtract 'value' of 'unit' (years|months|days|hours|minutes|seconds|milliseconds)
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */


  Time.prototype.subtract = function subtract(value, unit) {
    return this._manipulate(value * -1, unit);
  };

  /**
   * Compute difference between 'time' of 'unit'
   * (from Moment.js)
   * @param {Time} time
   * @param {String} unit
   * @param {Boolean} [asFloat]
   * @returns {Number}
   */


  Time.prototype.diff = function diff(time, unit, asFloat) {
    if (!this.isValid) return NaN;
    if (!time.isValid) return NaN;

    unit = normalizeUnit(unit);

    var diff = 0;
    var t1 = this;
    var t2 = time;

    if (unit == 'Y' || unit == 'M') {
      diff = t1._monthDiff(t2);
      if (unit == 'Y') diff /= 12;
    } else {
      // Correct for custom day start
      if (unit == 'D' && !asFloat) {
        t1 = t1.startOf('D');
        t2 = t2.startOf('D');
      }
      var delta = t1 - t2;

      switch (unit) {
        case 'D':
          var offsetDelta = 6e4 * (t1._offset - t2._offset);

          diff = (delta + offsetDelta) / 864e5;
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
  };

  /**
   * Reset to start of 'unit'
   * Returns new instance
   * @param {String} unit
   * @returns {Time}
   */


  Time.prototype.startOf = function startOf(unit) {
    if (this.isValid) {
      unit = normalizeUnit(unit);

      var flags = FLAGS_START_OF[unit];
      var instance = this.clone();
      var d = instance._date;

      for (var dim in FLAGS) {
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
  };

  /**
   * Reset to end of 'unit'
   * Returns new instance
   * @param {String} unit
   * @returns {Time}
   */


  Time.prototype.endOf = function endOf(unit) {
    unit = normalizeUnit(unit === undefined ? 'S' : unit);
    if (unit === 'S') return this.clone();
    return this.startOf(unit).add(1, unit).subtract(1, 'S');
  };

  /**
   * Get/set full year
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.year = function year(value) {
    if (value != null) return this._set(value, 'setUTCFullYear');
    return this._date.getUTCFullYear();
  };

  /**
   * Get/set month (0-11)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.month = function month(value) {
    if (value != null) return this._set(value, 'setUTCMonth');
    return this._date.getUTCMonth();
  };

  /**
   * Get/set date (1-31)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.date = function date(value) {
    if (value != null) return this._set(value, 'setUTCDate');
    return this._date.getUTCDate();
  };

  /**
   * Retrieve day of week (0-6)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.day = function day(value) {
    var day = this._date.getUTCDay();

    if (value != null) return this._set(this.date() + value - day, 'setUTCDate');
    return day;
  };

  /**
   * Get/set hour (0-23)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.hour = function hour(value) {
    if (value != null) return this._set(value, 'setUTCHours');
    return this._date.getUTCHours();
  };

  /**
   * Get/set minute (0-59)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.minute = function minute(value) {
    if (value != null) return this._set(value, 'setUTCMinutes');
    return this._date.getUTCMinutes();
  };

  /**
   * Get/set second (0-59)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.second = function second(value) {
    if (value != null) return this._set(value, 'setUTCSeconds');
    return this._date.getUTCSeconds();
  };

  /**
   * Get/set millisecond (0-999)
   * Returns new instance when setting
   * @param {Number} [value]
   * @returns {Number|Time}
   */


  Time.prototype.millisecond = function millisecond(value) {
    if (value != null) return this._set(value, 'setUTCMilliseconds');
    return this._date.getUTCMilliseconds();
  };

  /**
   * Compare 'time', limited by 'unit', and determine if is similar
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */


  Time.prototype.isSame = function isSame(time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = normalizeUnit(unit);

    if (!unit || unit == 'S') return +this._date === +time._date;

    var t1 = this;
    var t2 = time;

    // Correct for custom day start
    if (unit == 'D') {
      t1 = t1.startOf(unit);
      t2 = t2.startOf(unit);
    }

    switch (unit) {
      case 'Y':
        return t1.year() == t2.year();
      case 'M':
        return t1.year() == t2.year() && t1.month() == t2.month();
      case 'D':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date();
      case 'H':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date() && t1.hour() == t2.hour();
      case 'm':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date() && t1.hour() == t2.hour() && t1.minute() == t2.minute();
      case 's':
        return t1.year() == t2.year() && t1.month() == t2.month() && t1.date() == t2.date() && t1.hour() == t2.hour() && t1.minute() == t2.minute() && t1.second() == t2.second();
    }
  };

  /**
   * Compare this, limited by 'unit', and determine if this is before 'time'
   * @param {Time} time
   * @param {String} [unit]
   * @returns {Boolean}
   */


  Time.prototype.isBefore = function isBefore(time, unit) {
    if (!this.isValid || !time.isValid) return false;

    unit = normalizeUnit(unit);
    var tLimited = unit == 'S' ? this : this.endOf(unit);

    return tLimited.valueOf() < time.valueOf();
  };

  /**
   * Set 'locale'
   * @param {Object} locale
   * @returns {Time}
   */


  Time.prototype.locale = function locale(_locale) {
    var instance = this.clone();

    instance._locale = _locale;
    return instance;
  };

  /**
   * Format into string based on 'mask'
   * @param {String} mask
   * @param {Number} [daysFromNow]
   * @returns {String}
   */


  Time.prototype.format = function format(mask, daysFromNow) {
    var _this = this;

    if (!mask) return this.timeString;
    // Prevent regex denial of service
    if (mask.length > 100) return '';

    var relativeDay = daysFromNow != null ? this._getRelativeDay(daysFromNow) : '';
    var escaped = [];
    var idx = 0;

    // Remove all escaped text (in [xxx])
    mask = mask.replace(RE_TOKEN_ESCAPE, function (match) {
      escaped.push(match.slice(1, -1));
      return '$' + idx++;
    });

    mask = mask.replace(RE_TOKEN, function (match) {
      switch (match) {
        case 'LT':
        case 'LTS':
        case 'L':
        case 'LL':
        case 'LLL':
        case 'LLLL':
          return _this._locale && _this._locale.format && _this._locale.format[match] ? _this.format(_this._locale.format[match], daysFromNow) : '[missing locale]';
        case 'YY':
          return String(_this.year()).slice(-2);
        case 'YYYY':
          return _this.year();
        case 'M':
          return _this.month() + 1;
        case 'MM':
          return pad(_this.month() + 1);
        case 'MMM':
          return _this._locale && _this._locale.monthsShort ? _this._locale.monthsShort[_this.month()] : '[missing locale]';
        case 'MMMM':
          return _this._locale && _this._locale.months ? _this._locale.months[_this.month()] : '[missing locale]';
        case 'D':
          return _this.date();
        case 'DD':
          return pad(_this.date());
        case 'ddr':
          if (relativeDay) return _this._locale && _this._locale[relativeDay] ? _this._locale[relativeDay] : '[missing locale]';
          return _this._locale && _this._locale.daysShort ? _this._locale.daysShort[_this.day()] : '[missing locale]';
        case 'dddr':
          if (relativeDay) return _this._locale && _this._locale[relativeDay] ? _this._locale[relativeDay] : '[missing locale]';
          return _this._locale && _this._locale.days ? _this._locale.days[_this.day()] : '[missing locale]';
        case 'd':
          return _this.day();
        case 'ddd':
          return _this._locale && _this._locale.daysShort ? _this._locale.daysShort[_this.day()] : '[missing locale]';
        case 'dddd':
          return _this._locale && _this._locale.days ? _this._locale.days[_this.day()] : '[missing locale]';
        case 'Hr':
          var daySlot = _this._getTimeOfDay();
          return _this._localeHasProperty('daySlots') ? _this._locale.daySlots[daySlot] : '[missing locale]';
        case 'H':
          return _this.hour();
        case 'HH':
          return pad(_this.hour());
        case 'm':
          return _this.minute();
        case 'mm':
          return pad(_this.minute());
        case 's':
          return _this.second();
        case 'ss':
          return pad(_this.second());
        case 'S':
          return Math.floor(_this.millisecond() / 100);
        case 'SS':
          return Math.floor(_this.millisecond() / 10);
        case 'SSS':
          return _this.millisecond();
        case 'ZZ':
          return _this._offsetString;
        default:
          return '';
      }
    });

    // Replace all escaped text
    if (escaped.length) {
      mask = mask.replace(RE_TOKEN_ESCAPED, function (match) {
        return escaped[match.slice(1)];
      });
    }

    return mask;
  };

  /**
   * Retrieve instance of current time
   * @returns {Time}
   */


  Time.prototype.now = function now() {
    var instance = new Time().offset(this._offset);

    instance._locale = this._locale;
    return instance;
  };

  /**
   * Retrieve instance at UTC time
   * @returns {Time}
   */


  Time.prototype.utc = function utc() {
    if (!this._offset) return this.clone();

    var t = this.subtract(this._offset, 'minutes');

    t._offset = 0;
    t._offsetString = DEFAULT_OFFSET;
    return update(t);
  };

  /**
   * Clone instance
   * @returns {Time}
   */


  Time.prototype.clone = function clone() {
    var instance = new Time(this.timeString);

    instance._locale = this._locale;
    return instance;
  };

  /**
   * Set 'value' using 'method'
   * Returns new instance
   * @param {Number} value
   * @param {String} method
   * @returns {Time}
   */


  Time.prototype._set = function _set(value, method) {
    var instance = this.clone();
    var d = instance._date;

    d[method](value);
    return update(instance);
  };

  /**
   * Retrieve relative day type based on number of days from "now"
   * @param {Number} daysFromNow
   * @returns {String}
   */


  Time.prototype._getRelativeDay = function _getRelativeDay(daysFromNow) {
    if (daysFromNow != null && daysFromNow < 2) {
      var hour = this.hour();

      return daysFromNow == 1 ? 'tomorrow' : hour >= nightStartsAt || hour < dayStartsAt ? 'tonight' : 'today';
    }
    return '';
  };

  /**
   * Retrieve the time of the day (night, morning, afternoon, evening)
   *
   * @return {string} The time of the day (night, morning, afternoon, evening)
   * @private
   */


  Time.prototype._getTimeOfDay = function _getTimeOfDay() {
    var hour = this.hour();
    if (hour >= 0 && hour < 6) {
      return 'night';
    } else if (hour >= 6 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon';
    } else {
      return 'evening'; // 18 - 24
    }
  };

  /**
   * A helper function that checks if locale is initialized and if the passed localeProperty exist on locale
   *
   * Optionally also checks if localeProperty has subProperty
   *
   * @param localeProperty {String} Property to check if exist on locale
   * @param [subProperty] {String} Optional subproperty if locale[localeProperty] is an object
   * @return {boolean} True if locale has the passed localeProperty
   * @private
   */


  Time.prototype._localeHasProperty = function _localeHasProperty(localeProperty, subProperty) {
    if (subProperty) {
      return this._locale && this._locale[localeProperty] && this._locale[localeProperty][subProperty];
    } else {
      return this._locale && this._locale[localeProperty];
    }
  };

  /**
   * Add/subtract 'value' in 'unit'
   * Returns new instance
   * @param {Number} value
   * @param {String} unit
   * @returns {Time}
   */


  Time.prototype._manipulate = function _manipulate(value, unit) {
    if (this.isValid) {
      var instance = this.clone();
      var d = instance._date;

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
  };

  /**
   * Compute difference between 'time' in months
   * (from Moment.js)
   * @param {Time} time
   * @returns {Number}
   */


  Time.prototype._monthDiff = function _monthDiff(time) {
    var wholeMonthDiff = (time._date.getUTCFullYear() - this._date.getUTCFullYear()) * 12 + (time._date.getUTCMonth() - this._date.getUTCMonth());
    var anchor = this._manipulate(wholeMonthDiff, 'M');
    var adjust = void 0;

    if (time._date - anchor._date < 0) {
      var anchor2 = this._manipulate(wholeMonthDiff - 1, 'M');

      adjust = (time._date - anchor._date) / (anchor._date - anchor2._date);
    } else {
      var _anchor = this._manipulate(wholeMonthDiff + 1, 'M');

      adjust = (time._date - anchor._date) / (_anchor._date - anchor._date);
    }

    return -(wholeMonthDiff + adjust);
  };

  /**
   * Retrieve stringified
   * @returns {String}
   */


  Time.prototype.toString = function toString() {
    if (!this.isValid) return 'Invalid Date';
    return this._date.toISOString().replace('Z', this._offsetString);
  };

  /**
   * Convert to JSON format
   * @returns {String}
   */


  Time.prototype.toJSON = function toJSON() {
    return this.timeString;
  };

  /**
   * Retrieve number of milliseconds UTC
   * @returns {Number}
   */


  Time.prototype.valueOf = function valueOf() {
    if (!this.isValid) return NaN;
    return +this._date - (this._offset || 0) * 6e4;
  };

  return Time;
}();

/**
 * Retrieve timestring for client "now"
 * @returns {String}
 */


function clientNow() {
  var d = new Date();
  var offset = -1 * d.getTimezoneOffset();

  d.setUTCMinutes(d.getUTCMinutes() + offset);
  return d.toISOString().replace('Z', minutesToOffsetString(offset));
}

/**
 * Update 'instance' state
 * @param {Time} instance
 * @returns {Time}
 */
function update(instance) {
  instance.isValid = isValid(instance._date);
  instance.timeString = instance.toString();
  return instance;
}

/**
 * Normalize 'unit'
 * @param {Strong} unit
 * @returns {String}
 */
function normalizeUnit(unit) {
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
function isValid(date) {
  return Object.prototype.toString.call(date) == '[object Date]' && !isNaN(date.getTime());
}

/**
 * Determine if 'time' is a Time instance
 * @param {Time} time
 * @returns {Boolean}
 */
function isTime(time) {
  return time != null && time._manipulate != null && time._date != null;
}

/**
 * Round 'value' towards 0
 * @param {Number} value
 * @returns {Number}
 */
function round(value) {
  if (value < 0) return Math.ceil(value);
  return Math.floor(value);
}

/**
 * Pad 'value' with zeros up to desired 'length'
 * @param {String|Number} value
 * @param {Number} length
 * @returns {String}
 */
function pad(value, length) {
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
function minutesToOffsetString(minutes) {
  var t = String(Math.abs(minutes / 60)).split('.');
  var H = pad(t[0]);
  var m = t[1] ? parseInt(t[1], 10) * 0.6 : 0;
  var sign = minutes < 0 ? '-' : '+';

  return '' + sign + H + ':' + pad(m);
}