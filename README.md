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

**init(options)**: override defaults. Options include:
  - **dayStartsAt**: the hour a day begins at (default `0`). Modifies results of `diff()`, `startOf()`, `isSame()`, and `format()`.
  - **nightStartsAt**: the hour night begins (default `18`). Modifies results of `format()` when using `ddr` or `dddr` masks
  - **parseKeys**: the property keys to parse during `time.parse()` (default `['created', 'end', 'from', 'rise', 'set', 'start', 'times', 'to', 'update']`)

**create(timeString)**: create a `Time` instance at `timeString`.