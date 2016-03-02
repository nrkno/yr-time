'use strict';

var time, en, expect;

// Make it work in node..
try {
  time = require('../src/index');
  en = require('../src/locale/en');
  expect = require('expect.js');
// .. or browser
} catch (err) {
  time = require('src/index.js');
  expect = window.expect;
}

describe('time', function () {
  describe('create()', function () {
    it('should handle invalid time strings', function () {
      expect(time.create('foo')._date).to.equal('Invalid Date');
      expect(time.create('2016-foo')._date).to.equal('Invalid Date');
    });
    it('should handle arbitrarily long time strings', function () {
      expect(time.create('foo000000oooooooooooooooooooooooooo')._date).to.equal('Invalid Date');
    });
    it('should handle incomplete time strings', function () {
      expect(time.create('2016')._date).to.be.a(Date);
      expect(time.create('2016-1')._date).to.be.a(Date);
      expect(time.create('2016-01-1')._date).to.be.a(Date);
      expect(time.create('2016-01-01T')._date).to.be.a(Date);
      expect(time.create('2016-01-01T00:')._date).to.be.a(Date);
      expect(time.create('2016-01-01T00:00:')._date).to.be.a(Date);
      expect(time.create('2016-01-01T00:00:00')._date).to.be.a(Date);
      expect(time.create('2016-01-01T00:00:00.000')._date).to.be.a(Date);
      expect(time.create('2016-01-01T00:00:00+01:00')._date).to.be.a(Date);
      expect(time.create('2016-01-01T00:00:00+0100')._date).to.be.a(Date);
    });
    it('should handle incomplete time strings, but not incomplete offsets', function () {
      expect(time.create('2016-01-01T00:00:00+')._date).to.equal('Invalid Date');
      expect(time.create('2016-01-01T00:00:00+1')._date).to.equal('Invalid Date');
      expect(time.create('2016-01-01T00:00:00+1:00')._date).to.equal('Invalid Date');
    });
    it('should set default TZ offset if none specified', function () {
      expect(time.create('2016-01-01T00:00:00')._offset).to.equal(0);
      expect(time.create('2016-01-01T00:00:00')._date.toISOString()).to.equal('2016-01-01T00:00:00.000Z');
    });
    it('should set TZ offset if specified', function () {
      expect(time.create('2016-01-01T00:00:00+01:00')._offset).to.equal(60);
      expect(time.create('2016-01-01T00:00:00+01:00')._date.toISOString()).to.equal('2016-01-01T01:00:00.000Z');
      expect(time.create('2016-01-01T00:00:00-01:30')._offset).to.equal(-90);
      expect(time.create('2016-01-01T00:00:00-01:30')._date.toISOString()).to.equal('2015-12-31T22:30:00.000Z');
    });
  });

  describe('getters', function () {
    describe('year()', function () {
      it('should return full year', function () {
        expect(time.create('2016-01-01T00:00:00').year()).to.equal(2016);
        expect(time.create('1916-01-01T00:00:00').year()).to.equal(1916);
      });
      it('should return full year, accounting for TZ offset', function () {
        expect(time.create('2016-01-01T00:00:00-01:30').year()).to.equal(2015);
        expect(time.create('2016-01-01T00:00:00-00:30').year()).to.equal(2015);
        expect(time.create('2015-12-31T23:00:00+01:00').year()).to.equal(2016);
      });
    });
    describe('month()', function () {
      it('should return month', function () {
        expect(time.create('2016-01-01T00:00:00').month()).to.equal(0);
        expect(time.create('2015-12-01T00:00:00').month()).to.equal(11);
      });
      it('should return month, accounting for TZ offset', function () {
        expect(time.create('2016-01-01T00:00:00-01:30').month()).to.equal(11);
        expect(time.create('2015-12-31T23:00:00+01:00').month()).to.equal(0);
      });
    });
    describe('date()', function () {
      it('should return date', function () {
        expect(time.create('2016-01-01T00:00:00').date()).to.equal(1);
        expect(time.create('2015-12-31T00:00:00').date()).to.equal(31);
      });
      it('should return date, accounting for TZ offset', function () {
        expect(time.create('2016-01-01T00:00:00-01:30').date()).to.equal(31);
        expect(time.create('2015-12-31T23:00:00+01:00').date()).to.equal(1);
      });
    });
    describe('day()', function () {
      it('should return day', function () {
        expect(time.create('2016-01-01T00:00:00').day()).to.equal(5);
        expect(time.create('2015-12-31T00:00:00').day()).to.equal(4);
      });
      it('should return day, accounting for TZ offset', function () {
        expect(time.create('2016-01-01T00:00:00-01:30').day()).to.equal(4);
        expect(time.create('2015-12-31T23:00:00+01:00').day()).to.equal(5);
      });
    });
    describe('hour()', function () {
      it('should return hour', function () {
        expect(time.create('2016-01-01T00:00:00').hour()).to.equal(0);
        expect(time.create('2015-12-31T23:00:00').hour()).to.equal(23);
      });
      it('should return hour, accounting for TZ offset', function () {
        expect(time.create('2016-01-01T00:00:00-01:30').hour()).to.equal(22);
        expect(time.create('2015-12-31T23:00:00+01:00').hour()).to.equal(0);
      });
    });
    describe('minute()', function () {
      it('should return minute', function () {
        expect(time.create('2016-01-01T00:00:00').minute()).to.equal(0);
        expect(time.create('2015-12-31T23:15:00').minute()).to.equal(15);
      });
      it('should return minute, accounting for TZ offset', function () {
        expect(time.create('2016-01-01T00:00:00-01:30').minute()).to.equal(30);
        expect(time.create('2015-12-31T23:15:00+01:15').minute()).to.equal(30);
      });
    });
  });

  describe('setters', function () {
    describe('year()', function () {
      it('should set full year', function () {
        expect(time.create('2016-01-01T00:00:00').year(2015).year()).to.equal(2015);
        expect(time.create('1916-01-01T00:00:00').year(1915).year()).to.equal(1915);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').year('foo').year())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').year('foo').isValid).to.equal(false);
      });
    });
    describe('month()', function () {
      it('should set month', function () {
        expect(time.create('2016-01-01T00:00:00').month(3).month()).to.equal(3);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').month('foo').month())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').month('foo').isValid).to.equal(false);
      });
    });
    describe('date()', function () {
      it('should set date', function () {
        expect(time.create('2016-01-01T00:00:00').date(3).date()).to.equal(3);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').date('foo').date())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').date('foo').isValid).to.equal(false);
      });
    });
    describe('hour()', function () {
      it('should set hour', function () {
        expect(time.create('2016-01-01T00:00:00').hour(3).hour()).to.equal(3);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').hour('foo').hour())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').hour('foo').isValid).to.equal(false);
      });
    });
    describe('minute()', function () {
      it('should set minute', function () {
        expect(time.create('2016-01-01T00:00:00').minute(3).minute()).to.equal(3);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').minute('foo').minute())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').minute('foo').isValid).to.equal(false);
      });
    });
    describe('second()', function () {
      it('should set second', function () {
        expect(time.create('2016-01-01T00:00:00').second(3).second()).to.equal(3);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').second('foo').second())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').second('foo').isValid).to.equal(false);
      });
    });
    describe('millisecond()', function () {
      it('should set millisecond', function () {
        expect(time.create('2016-01-01T00:00:00').millisecond(3).millisecond()).to.equal(3);
      });
      it('should handle invalid value', function () {
        expect(isNaN(time.create('2016-01-01T00:00:00').millisecond('foo').millisecond())).to.equal(true);
        expect(time.create('2016-01-01T00:00:00').millisecond('foo').isValid).to.equal(false);
      });
    });
  });

  describe('clone()', function () {
    it('should create a new copy with same values as the original', function () {
      var t1 = time.create('2015-12-31T23:15:00+01:15')
        , t2 = t1.clone();

      expect(t2).to.not.equal(t1);
      expect(t2._date.toISOString()).to.equal(t1._date.toISOString());
      expect(t2._offset).to.equal(t1._offset);
    });
    it('should create a new copy with same values as the original, even if invalid', function () {
      var t1 = time.create('foo')
        , t2 = t1.clone();

      expect(t2).to.not.equal(t1);
      expect(t2._date).to.equal(t1._date);
      expect(t2._offset).to.equal(t1._offset);
    });
  });

  describe('toJSON()', function () {
    it('should return a string with default TZ offset', function () {
      expect(time.create('2015-12-31T23:59:59').toJSON()).to.equal('2015-12-31T23:59:59+00:00');
      expect(time.create('2016-01-01T00:00:00').toJSON()).to.equal('2016-01-01T00:00:00+00:00');
    });
    it('should return a string with TZ offset', function () {
      expect(time.create('2015-12-31T23:59:59-01:00').toJSON()).to.equal('2015-12-31T23:59:59-01:00');
      expect(time.create('2016-01-01T00:00:00+01:30').toJSON()).to.equal('2016-01-01T00:00:00+01:30');
    });
  });

  describe('manipulation', function () {
    describe('add()', function () {
      it('should return a new instance with added years', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.add(1, 'Y');

        expect(t2).to.not.equal(t1);
        expect(t2.year()).to.equal(2016);
      });
      it('should return a new instance with added months', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.add(1, 'M');

        expect(t2).to.not.equal(t1);
        expect(t2.month()).to.equal(0);
        expect(t2.add(14, 'M').year()).to.equal(2017);
      });
      it('should return a new instance with added days', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.add(1, 'D');

        expect(t2).to.not.equal(t1);
        expect(t2.date()).to.equal(1);
        expect(t2.day()).to.equal(5);
        expect(t2.month()).to.equal(0);
        expect(t2.add(365, 'D').year()).to.equal(2016);
      });
      it('should return a new instance with added hours', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.add(1, 'H');

        expect(t2).to.not.equal(t1);
        expect(t2.hour()).to.equal(0);
        expect(t2.date()).to.equal(1);
        expect(t2.day()).to.equal(5);
        expect(t2.month()).to.equal(0);
        expect(t2.add(28, 'H').date()).to.equal(2);
      });
      it('should return a new instance with added minutes', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.add(30, 'm');

        expect(t2).to.not.equal(t1);
        expect(t2.minute()).to.equal(45);
        expect(t2.hour()).to.equal(23);
        expect(t2.date()).to.equal(31);
        expect(t2.day()).to.equal(4);
        expect(t2.month()).to.equal(11);
        expect(t2.add(75, 'm').hour()).to.equal(1);
        expect(t2.add(75, 'm').minute()).to.equal(0);
      });
    });

    describe('subtract()', function () {
      it('should return a new instance with subtracted years', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.subtract(1, 'Y');

        expect(t2).to.not.equal(t1);
        expect(t2.year()).to.equal(2014);
      });
      it('should return a new instance with subtracted months', function () {
        var t1 = time.create('2015-12-31T23:15:00')
          , t2 = t1.subtract(1, 'M');

        expect(t2).to.not.equal(t1);
        expect(t2.month()).to.equal(11);
        expect(t2.subtract(14, 'M').year()).to.equal(2014);
      });
      it('should return a new instance with subtracted days', function () {
        var t1 = time.create('2016-01-01T00:15:00')
          , t2 = t1.subtract(1, 'D');

        expect(t2).to.not.equal(t1);
        expect(t2.date()).to.equal(31);
        expect(t2.day()).to.equal(4);
        expect(t2.month()).to.equal(11);
        expect(t2.subtract(366, 'D').year()).to.equal(2014);
      });
      it('should return a new instance with subtracted hours', function () {
        var t1 = time.create('2016-01-01T00:15:00')
          , t2 = t1.subtract(1, 'H');

        expect(t2).to.not.equal(t1);
        expect(t2.hour()).to.equal(23);
        expect(t2.date()).to.equal(31);
        expect(t2.day()).to.equal(4);
        expect(t2.month()).to.equal(11);
        expect(t2.subtract(28, 'H').date()).to.equal(30);
      });
      it('should return a new instance with subtracted minutes', function () {
        var t1 = time.create('2016-01-01T00:15:00')
          , t2 = t1.subtract(30, 'm');

        expect(t2).to.not.equal(t1);
        expect(t2.minute()).to.equal(45);
        expect(t2.hour()).to.equal(23);
        expect(t2.date()).to.equal(31);
        expect(t2.day()).to.equal(4);
        expect(t2.month()).to.equal(11);
        expect(t2.subtract(75, 'm').hour()).to.equal(22);
        expect(t2.subtract(75, 'm').minute()).to.equal(30);
      });
    });

    describe('startOf()', function () {
      it('should set time to start of year', function () {
        expect(time.create('2015-12-31T23:59:59').startOf('Y').toJSON()).to.equal('2015-01-01T00:00:00+00:00');
      });
      it('should set time to start of month', function () {
        expect(time.create('2015-12-31T23:59:59').startOf('M').toJSON()).to.equal('2015-12-01T00:00:00+00:00');
      });
      it('should set time to start of day', function () {
        expect(time.create('2015-12-31T23:59:59').startOf('D').toJSON()).to.equal('2015-12-31T00:00:00+00:00');
      });
      it('should set time to start of hour', function () {
        expect(time.create('2015-12-31T23:59:59').startOf('H').toJSON()).to.equal('2015-12-31T23:00:00+00:00');
      });
      it('should set time to start of minute', function () {
        expect(time.create('2015-12-31T23:59:59').startOf('m').toJSON()).to.equal('2015-12-31T23:59:00+00:00');
      });
      it('should set time to custom start value', function () {
        expect(time.create('2015-12-31T23:59:59').startOf('D', 6).toJSON()).to.equal('2015-12-31T06:00:00+00:00');
        expect(time.create('2015-12-31T00:00:00').startOf('D', 6).toJSON()).to.equal('2015-12-30T06:00:00+00:00');
      });
    });
  });

  describe('diff()', function () {
    it('should return the difference in years between two instances', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-01-01T00:00:00'), 'Y', false)).to.equal(1);
      expect(time.create('2015-01-01T00:00:00').diff(time.create('2016-01-01T00:00:00'), 'Y', false)).to.equal(-1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-06-01T00:00:00'), 'Y', false)).to.equal(0);
    });
    it('should return the difference in years between two instances as float', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-01-01T00:00:00'), 'Y', true)).to.equal(1);
      expect(time.create('2015-01-01T00:00:00').diff(time.create('2016-01-01T00:00:00'), 'Y', true)).to.equal(-1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-07-01T00:00:00'), 'Y', true)).to.equal(0.5);
    });
    it('should return the difference in months between two instances', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-01-01T00:00:00'), 'M', false)).to.equal(12);
      expect(time.create('2015-01-01T00:00:00').diff(time.create('2016-01-01T00:00:00'), 'M', false)).to.equal(-12);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-07-01T00:00:00'), 'M', false)).to.equal(6);
    });
    it('should return the difference in months between two instances as float', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-01-01T00:00:00'), 'M', true)).to.equal(12);
      expect(time.create('2015-01-01T00:00:00').diff(time.create('2016-01-01T00:00:00'), 'M', true)).to.equal(-12);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-12-16T00:00:00'), 'M', true)).to.equal(16 / 31);
    });
    it('should return the difference in days between two instances', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-12-31T00:00:00'), 'D', false)).to.equal(1);
      expect(time.create('2015-12-31T00:00:00').diff(time.create('2016-01-01T00:00:00'), 'D', false)).to.equal(-1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-12-31T06:00:00'), 'D', false)).to.equal(0);
    });
    it('should return the difference in days between two instances as float', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-12-31T00:00:00'), 'D', true)).to.equal(1);
      expect(time.create('2015-12-31T00:00:00').diff(time.create('2016-01-01T00:00:00'), 'D', true)).to.equal(-1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2015-12-31T06:00:00'), 'D', true)).to.equal(0.75);
    });
    it('should return the difference in hours between two instances', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2016-01-01T01:00:00'), 'H', false)).to.equal(-1);
      expect(time.create('2016-01-01T01:00:00').diff(time.create('2016-01-01T00:00:00'), 'H', false)).to.equal(1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2016-01-01T00:45:00'), 'H', false)).to.equal(0);
    });
    it('should return the difference in hours between two instances as float', function () {
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2016-01-01T01:00:00'), 'H', true)).to.equal(-1);
      expect(time.create('2016-01-01T01:00:00').diff(time.create('2016-01-01T00:00:00'), 'H', true)).to.equal(1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2016-01-01T00:45:00'), 'H', true)).to.equal(-3 / 4);
    });
    it('should return the difference in minutes between two instances', function () {
      expect(time.create('2016-01-01T01:00:00').diff(time.create('2016-01-01T00:59:00'), 'm', false)).to.equal(1);
      expect(time.create('2016-01-01T00:59:00').diff(time.create('2016-01-01T01:00:00'), 'm', false)).to.equal(-1);
      expect(time.create('2016-01-01T00:00:00').diff(time.create('2016-01-01T00:00:45'), 'm', false)).to.equal(0);
    });
    it('should return the difference in minutes between two instances as float', function () {
      expect(time.create('2016-01-01T01:00:00').diff(time.create('2016-01-01T00:59:00'), 'm', true)).to.equal(1);
      expect(time.create('2016-01-01T00:59:00').diff(time.create('2016-01-01T01:00:00'), 'm', true)).to.equal(-1);
      expect(time.create('2016-01-01T01:00:00').diff(time.create('2016-01-01T00:59:30'), 'm', true)).to.equal(0.5);
    });
  });

  describe('isSame()', function () {
    it('should return "false" for invalid', function () {
      expect(time.create('foo').isSame(time.create('2016-01-01T00:00:00'))).to.equal(false);
      expect(time.create('2016-01-01T00:00:00').isSame(time.create('foo'))).to.equal(false);
    });
    it('should return "true" for same', function () {
      var t = time.create('2016-01-01T00:00:00');

      expect(t.isSame(time.create('2016-01-01T00:00:00'))).to.equal(true);
      expect(t.isSame(t.clone())).to.equal(true);
    });
    it('should return "true" for same year', function () {
      expect(time.create('2016-01-01T00:00:00').isSame(time.create('2016-02-01T00:00:00'), 'Y')).to.equal(true);
    });
    it('should return "true" for same month', function () {
      expect(time.create('2016-01-01T00:00:00').isSame(time.create('2016-01-02T00:00:00'), 'M')).to.equal(true);
    });
    it('should return "true" for same day', function () {
      expect(time.create('2016-01-01T00:00:00').isSame(time.create('2016-01-01T01:00:00'), 'D')).to.equal(true);
    });
    it('should return "true" for same hour', function () {
      expect(time.create('2016-01-01T00:00:00').isSame(time.create('2016-01-01T00:59:00'), 'H')).to.equal(true);
    });
    it('should return "true" for same minute', function () {
      expect(time.create('2016-01-01T00:00:00').isSame(time.create('2016-01-01T00:00:59'), 'm')).to.equal(true);
    });
  });

  describe('isBefore()', function () {
    it('should return "false" for invalid', function () {
      expect(time.create('foo').isBefore(time.create('2016-01-01T00:00:00'))).to.equal(false);
      expect(time.create('2016-01-01T00:00:00').isBefore(time.create('foo'))).to.equal(false);
    });
    it('should return "false" for same', function () {
      var t = time.create('2016-01-01T00:00:00');

      expect(t.isBefore(time.create('2016-01-01T00:00:00'))).to.equal(false);
      expect(t.isBefore(t.clone())).to.equal(false);
    });
    it('should return "true" for year', function () {
      expect(time.create('2016-01-01T00:00:00').isBefore(time.create('2015-01-01T00:00:00'), 'Y')).to.equal(true);
    });
    it('should return "true" for month', function () {
      expect(time.create('2016-01-01T00:00:00').isBefore(time.create('2015-01-01T00:00:00'), 'M')).to.equal(true);
      expect(time.create('2016-02-01T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'M')).to.equal(true);
    });
    it('should return "true" for day', function () {
      expect(time.create('2016-01-01T00:00:00').isBefore(time.create('2015-01-01T00:00:00'), 'D')).to.equal(true);
      expect(time.create('2016-02-01T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'D')).to.equal(true);
      expect(time.create('2016-01-02T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'D')).to.equal(true);
    });
    it('should return "true" for hour', function () {
      expect(time.create('2016-01-01T00:00:00').isBefore(time.create('2015-01-01T00:00:00'), 'H')).to.equal(true);
      expect(time.create('2016-02-01T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'H')).to.equal(true);
      expect(time.create('2016-01-02T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'H')).to.equal(true);
      expect(time.create('2016-01-01T01:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'H')).to.equal(true);
    });
    it('should return "true" for minute', function () {
      expect(time.create('2016-01-01T00:00:00').isBefore(time.create('2015-01-01T00:00:00'), 'm')).to.equal(true);
      expect(time.create('2016-02-01T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'm')).to.equal(true);
      expect(time.create('2016-01-02T00:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'm')).to.equal(true);
      expect(time.create('2016-01-01T01:00:00').isBefore(time.create('2016-01-01T00:00:00'), 'm')).to.equal(true);
      expect(time.create('2016-01-01T00:01:00').isBefore(time.create('2016-01-01T00:00:00'), 'm')).to.equal(true);
    });
  });

  describe('format()', function () {
    it('should handle year masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('YY')).to.equal('16');
      expect(time.create('2016-01-01T00:00:00').format('YYYY')).to.equal('2016');
      expect(time.create('2016-01-01T00:00:00-01:00').format('YYYY')).to.equal('2015');
    });
    it('should handle month masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('M')).to.equal('1');
      expect(time.create('2016-01-01T00:00:00').format('MM')).to.equal('01');
      expect(time.create('2016-01-01T00:00:00').locale(en).format('MMM')).to.equal('Jan');
      expect(time.create('2016-01-01T00:00:00').locale(en).format('MMMM')).to.equal('January');
      expect(time.create('2016-01-01T00:00:00-01:00').locale(en).format('MMMM')).to.equal('December');
    });
    it('should handle day of month masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('D')).to.equal('1');
      expect(time.create('2016-01-01T00:00:00').format('DD')).to.equal('01');
      expect(time.create('2016-01-01T00:00:00-01:00').format('DD')).to.equal('31');
    });
    it('should handle day of week masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('d')).to.equal('5');
      expect(time.create('2016-01-01T00:00:00').format('dd')).to.equal('05');
      expect(time.create('2016-01-01T00:00:00').locale(en).format('ddd')).to.equal('Fri');
      expect(time.create('2016-01-01T00:00:00').locale(en).format('dddd')).to.equal('Friday');
      expect(time.create('2016-01-01T00:00:00-01:00').locale(en).format('dddd')).to.equal('Thursday');
    });
    it('should handle hour masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('H')).to.equal('0');
      expect(time.create('2016-01-01T00:00:00').format('HH')).to.equal('00');
      expect(time.create('2015-12-31T23:00:00').format('HH')).to.equal('23');
      expect(time.create('2016-01-01T00:00:00-01:00').format('HH')).to.equal('23');
    });
    it('should handle minute masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('m')).to.equal('0');
      expect(time.create('2016-01-01T00:00:00').format('mm')).to.equal('00');
      expect(time.create('2016-01-01T00:15:00').format('mm')).to.equal('15');
      expect(time.create('2016-01-01T00:00:00+00:15').format('mm')).to.equal('15');
    });
    it('should handle second masks', function () {
      expect(time.create('2016-01-01T00:00:00').format('s')).to.equal('0');
      expect(time.create('2016-01-01T00:00:00').format('ss')).to.equal('00');
      expect(time.create('2016-01-01T00:00:15').format('ss')).to.equal('15');
    });
    it('should handle masks when missing locale', function () {
      expect(time.create('2016-01-01T00:00:00').format('MMM')).to.equal('[missing locale]');
    });
  });

  describe.skip('now()', function () {
    it('should return correct epoch timestamp within range of an hour', function () {
      var now = Date.now();
      expect(time.now()).to.be.within(now, moment(now).add(1, 'hour').valueOf());
    });
  });

  describe.skip('sameInterval()', function () {
    describe('DAILY', function () {
      it('should return true for 2 identical days', function () {
        expect(time.sameInterval(moment('2014-01-01T00:00:00'), moment('2014-01-01T00:00:00'), date.DAILY)).to.be.true;
      });
      it('should return true for 2 days falling between 6:00 and 24:00 the same day', function () {
        expect(time.sameInterval(moment('2014-01-01T23:00:00'), moment('2014-01-01T12:00:00'), date.DAILY)).to.be.true;
      });
      it('should return true for 2 days falling between 0:00 and 6:00 the same day', function () {
        expect(time.sameInterval(moment('2014-01-02T01:00:00'), moment('2014-01-02T02:00:00'), date.DAILY)).to.be.true;
      });
      it('should return true for 2 days falling between 6:00 and 5:59 the following day/month/year', function () {
        expect(time.sameInterval(moment('2014-01-01T05:59:00'), moment('2013-12-31T12:00:00'), date.DAILY)).to.be.true;
      });
      it('should return false for 2 days falling on either side of 6:00', function () {
        expect(time.sameInterval(moment('2014-01-01T05:59:00'), moment('2014-01-01T06:00:00'), date.DAILY)).to.not.be.true;
      });
    });
  });

  describe.skip('daysFrom()', function () {
    it('should return 0 for 2 identical dates', function () {
      expect(time.daysFrom(moment('2014-01-01T00:00:00'), moment('2014-01-01T00:00:00'))).to.eql(0);
    });
    it('should return 0 for 2 dates falling between 6:00 and 24:00 the same day', function () {
      expect(time.daysFrom(moment('2014-01-01T23:00:00'), moment('2014-01-01T12:00:00'))).to.eql(0);
    });
    it('should return 0 for 2 dates falling between 0:00 and 6:00 the same day', function () {
      expect(time.daysFrom(moment('2014-01-02T02:00:00'), moment('2014-01-02T01:00:00'))).to.eql(0);
    });
    it('should return 0 for 2 dates falling between 6:00 and 5:59 the following day/month/year', function () {
      expect(time.daysFrom(moment('2014-01-01T05:59:00'), moment('2013-12-31T12:00:00'))).to.eql(0);
    });
    it('should return 1 for 2 dates falling on either side of 6:00', function () {
      expect(time.daysFrom(moment('2014-01-01T06:01:00'), moment('2014-01-01T05:59:00'))).to.eql(1);
    });
    it('should return 1 for 2 dates falling at 6:00 one day apart', function () {
      expect(time.daysFrom(moment('2014-01-02T06:00:00'), moment('2014-01-01T06:00:00'))).to.eql(1);
    });
    it('should return a value greater than 1 for 2 dates more than 1 day apart', function () {
      expect(time.daysFrom(moment('2014-01-04T05:59:00'), moment('2014-01-01T06:01:00'))).to.eql(2);
    });
  });

  describe.skip('parse()', function () {
    it('should return simple object with parsed moments', function () {
      var obj = {
        foo: {},
        bar: 'bat',
        start: 1423227600000,
        end: 1423231200000
      };
      date.parse(obj);
      expect(moment.isMoment(obj.start)).to.be(true);
      expect(moment.isMoment(obj.end)).to.be(true);
    });
    it('should return array containing objects with parsed moments', function () {
      var array = [{
          interval: {
            foo: {},
            bar: 'bat',
            start: 1423227600000,
            end: 1423231200000
          }
        }
      ];
      date.parse(array);
      expect(moment.isMoment(array[0].interval.start)).to.be(true);
      expect(moment.isMoment(array[0].interval.end)).to.be(true);
    });
    it('should return simple object containing array with parsed moments', function () {
      var obj = {
        times: ["2015-11-10T10:46:31+01:00", "2015-11-10T17:00:00+01:00", moment.parseZone("2015-11-10T17:00:00+01:00")]
      };
      date.parse(obj);
      expect(moment.isMoment(obj.times[0])).to.be(true);
      expect(moment.isMoment(obj.times[2])).to.be(true);
    });
    it('should return array of complex objects with parsed moments', function () {
      var obj = {
        times: [{
          name: "Cato",
          from: "2011-12-24T09:55:50",
          to: "2011-12-27T09:55:50"
        },
        {
          name: "Dagmar",
          from: "2011-12-24T10:15:13",
          to: "2011-12-27T10:15:13"
        }]
      };
      date.parse(obj);
      expect(moment.isMoment(obj.times[0].from)).to.be(true);
      expect(moment.isMoment(obj.times[1].from)).to.be(true);
    });
  });
});
