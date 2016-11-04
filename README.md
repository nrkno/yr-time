[![NPM Version](https://img.shields.io/npm/v/@yr/time.svg?style=flat)](https://npmjs.org/package/@yr/time)
[![Build Status](https://img.shields.io/travis/YR/time.svg?style=flat)](https://travis-ci.org/YR/time?branch=master)

An efficient, immutable, utility for working with time/dates.

## Usage

```js
const time = require('@yr/time');
const t = time.create('2016-01-01')
  .add(2, 'hours')
  .subtract(1, 'day')
  .format('YYYY-MM-DD HH:mm');
console.log(t); //=> 2015-12-31 02:00
```

## API

**init(_options_)**: override defaults. Options include:
  - **dayStartsAt**: the hour a day begins at (default `0`). Modifies results of `diff()`, `startOf()`, `isSame()`, and `format()`.
  - **nightStartsAt**: the hour night begins (default `18`). Modifies results of `format()` when using `ddr` or `dddr` masks
  - **parseKeys**: the property keys to parse during `time.parse()` (default `['created', 'end', 'from', 'rise', 'set', 'start', 'times', 'to', 'update']`)

**create(_timeString_)**: create a `Time` instance with `timeString`. The following patterns are valid, with or without offset (`+HH:mm`):
- `YYYY`: `time.create('2016')` => `2016-01-01T00:00:00.000+00:00`
- `YYYY-MM`: `time.create('2016-02')` => `2016-02-01T00:00:00.000+00:00`
- `YYYY-MM-DD`: `time.create('2016-02-02')` => `2016-02-02T00:00:00.000+00:00`
- `YYYY-MM-DDTHH`: `time.create('2016-02-02T12')` => `2016-02-02T12:00:00.000+00:00`
- `YYYY-MM-DDTHH:mm`: `time.create('2016-02-02T12:30')` => `2016-02-02T12:30:00.000+00:00`
- `YYYY-MM-DDTHH:mm:ss`: `time.create('2016-02-02T12:30:30')` => `2016-02-02T12:30:30.000+00:00`
- `YYYY-MM-DDTHH:mm:ss.SSS`: `time.create('2016-02-02T12:30:30.500')` => `2016-02-02T12:30:30.500+00:00`

If no offset is specified, the time instance is handled as UTC (`+00:00`).

If `timeString` is omitted altogether, an instance is created with time set to current machine time and timezone offset. 

**now()**: create a `Time` instance based on number of milliseconds elapsed since 1 January 1970 00:00:00 UTC (`Date.now() == Time.now().toValue()`)

**parse(_obj_)**: recursively parse all time strings found in `obj` into `Time` instances. Uses the whitelist of `parseKeys` property names set via `init()`. **Note**: properties are mutated in place.

**isTime(_time_)**: determine if `time` is a `Time` instance.

### Time instances

**offset(_value)**: update an instance's Offset with `value` (in minutes).  Returns a new `Time` instance.

**add(_value_, _unit_)**: add specified `value` in specified `unit` to the instance. Returns a new `Time` instance:

Valid `unit` include:
- `year`, `years`, `Y` and `y`
- `month`, `months` and `M`
- `day`, `days`, `date`, `dates`, `D` and `d`
- `hour`, `hours`, `H` and `h`
- `minute`, `minutes` and `m`
- `second`, `seconds` and `s`
- `millisecond`, `milliseconds` and `S`

```js
time.create('2016-01-01T12:00:00').add(2, 'hours'); 
//=> 2016-01-01T14:00:00.000+00:00
```

**subtract(_value_, _unit_)**: subtract specified `value` in specified `unit` from the instance. Returns a new `Time` instance:

```js
time.create('2016-01-01T12:00:00').subtract(90, 'minutes'); 
//=> 2016-01-01T10:30:00.000+00:00
```

**diff(_time_, _unit_, _asFloat_)**: calculate difference between another `time` in specified `unit`:

```js
time.create('2016-01-01')
  .diff(time.create('2015-01-01'), 'days'); //=> 365
```

If `unit` is omitted, returns difference in milliseconds. 

If `asFloat=true`, returns difference with no rounding, otherwise values are rounded towards `0`. 

If a `dayStartsAt` value is set via `init()`, difference values for `day` units are specially handled:

```js
time.init({ dayStartsAt: 6 });
time.create('2016-01-01T07:00')
  .diff(time.create('2016-01-01T05:00'), 'days'); //=> 1
```

**startOf(_unit_)**: reset to start of specified `unit`. Returns a new `Time` instance:

```js
time.create('2016-12-01')
  .startOf('year'); //=> 2016-01-01T00:00:00.000+00:00
```

**year(_value_)**: get/set year unit. If passed a `value`, returns a new `Time` instance.

**month(_value_)**: get/set month unit (`0-11`). If passed a `value`, returns a new `Time` instance.

**date(_value_)**: get/set day of month unit (`1-31`). If passed a `value`, returns a new `Time` instance.

**day(_value_)**: get/set day of week unit (`0-6`). If passed a `value`, returns a new `Time` instance.

**hour(_value_)**: get/set hour unit (`0-23`). If passed a `value`, returns a new `Time` instance.

**minute(_value_)**: get/set minute unit (`0-59`). If passed a `value`, returns a new `Time` instance.

**second(_value_)**: get/set second unit (`0-59`). If passed a `value`, returns a new `Time` instance.

**millisecond(_value_)**: get/set millisecond unit (`0-999`). If passed a `value`, returns a new `Time` instance.

**isSame(_time_, _unit_)**: determine if `time` is equivalent when evaluated in specified `unit`:

```js
time.create('2016-12-01')
  .isSame(time.create('2016-12-31'), 'month'); //=> true
```

**isBefore(_time_, _unit_)**: determine if `time` comes before when evaluated in specified `unit`:

```js
time.create('2016-12-31')
  .isBefore(time.create('2016-12-30'), 'day'); //=> true
```

**locale(_locale_)**: set locale for this instance. Returns a new `Time` instance. See [en.json](https://github.com/YR/date/blob/master/locale/en.json) for an example of expected properties.

**format(_mask_, _daysFromNow_)**: retrieve a string representation based on format described in `mask`. Format masks can contain one or more of the following tokens:

|                       | Token   | Output                                 |
|-----------------------|:--------|:---------------------------------------|
| __Year__              | YY      | 70 71 ... 29 30                        |
|                       | YYYY    | 1970 1971 ... 2029 2030                |
| __Month__             | M       | 1 2 ... 11 12                          |
|                       | MM      | 01 02 ... 11 12                        |
|                       | MMM*    | Jan Feb ... Nov Dec                    |
|                       | MMMM*   | January February ... November December |
| __Day of month__      | D       | 1 2 ... 30 31                          |
|                       | DD      | 01 02 ... 30 31                        |
| __Day of week__       | d       | 0 1 ... 5 6                            |
|                       | ddd*    | Sun Mon ... Fri Sat                    |
|                       | dddd*   | Sunday Monday ... Friday Saturday      |
|                       | ddr**   | Today Tomorrow ... Fri Sat             |
|                       | dddr**  | Today Tomorrow ... Friday Saturday     |
| __Hour__              | H       | 0 1 ... 22 23                          |
|                       | HH      | 00 01 ... 22 23                        |
| __Minute__            | m       | 0 1 ... 58 59                          |
|                       | mm      | 00 01 ... 58 59                        |
| __Second__            | s       | 0 1 ... 58 59                          |
|                       | ss      | 00 01 ... 58 59                        |
| __Fractional second__ | S       | 0 1 ... 8 9                            |
|                       | SS      | 0 1 ... 98 99                          |
|                       | SSS     | 0 1 ... 998 999                        |
| __Offset__            | ZZ      | -07:00 -06:00 ... +06:00 +07:00        |
\* requires locale
\*\* relative day based on `daysFromNow`

```js
time.create('2016-12-01T12:00:00')
  .format('HH:mm'); //=> 12:00

time.create('2016-12-01T12:00:00')
  .locale(require('@yr/time/locale/en.json'))
  .format('dddr', 0); //=> Today
```

Escape characters in formatting masks by surrounding them with square brackets:

```js
time.create('2016-12-01T12:00:00')
  .format('[it is now] HH:mm'); //=> it is now 12:00
```

**now()**: clone instance and set to current time. Returns a new `Time` instance.

**clone()**: clone intance. Returns a new `Time` instance.