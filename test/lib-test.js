'use strict';

var moment = require('moment/moment.js')

, date, expect;

// Make it work in node..
try {
	date = require('../src/index.js');
	expect = require('expect.js');
// .. or browser
} catch (err) {
	date = require('src/index.js');
	expect = window.expect;
}

describe('date', function () {
	describe('now()', function () {
		it('should return correct epoch timestamp within range of an hour', function () {
			var now = Date.now();
			expect(date.now()).to.be.within(now, moment(now).add(1, 'hour').valueOf());
		});
	});
	describe('sameInterval()', function () {
		describe('DAILY', function () {
			it('should return true for 2 identical days', function () {
				expect(date.sameInterval(moment('2014-01-01T00:00:00'), moment('2014-01-01T00:00:00'), date.DAILY)).to.be.true;
			});
			it('should return true for 2 days falling between 6:00 and 24:00 the same day', function () {
				expect(date.sameInterval(moment('2014-01-01T23:00:00'), moment('2014-01-01T12:00:00'), date.DAILY)).to.be.true;
			});
			it('should return true for 2 days falling between 0:00 and 6:00 the same day', function () {
				expect(date.sameInterval(moment('2014-01-02T01:00:00'), moment('2014-01-02T02:00:00'), date.DAILY)).to.be.true;
			});
			it('should return true for 2 days falling between 6:00 and 5:59 the following day/month/year', function () {
				expect(date.sameInterval(moment('2014-01-01T05:59:00'), moment('2013-12-31T12:00:00'), date.DAILY)).to.be.true;
			});
			it('should return false for 2 days falling on either side of 6:00', function () {
				expect(date.sameInterval(moment('2014-01-01T05:59:00'), moment('2014-01-01T06:00:00'), date.DAILY)).to.not.be.true;
			});
		});
	});

	describe('daysFrom()', function () {
		it('should return 0 for 2 identical dates', function () {
			expect(date.daysFrom(moment('2014-01-01T00:00:00'), moment('2014-01-01T00:00:00'))).to.eql(0);
		});
		it('should return 0 for 2 dates falling between 6:00 and 24:00 the same day', function () {
			expect(date.daysFrom(moment('2014-01-01T23:00:00'), moment('2014-01-01T12:00:00'))).to.eql(0);
		});
		it('should return 0 for 2 dates falling between 0:00 and 6:00 the same day', function () {
			expect(date.daysFrom(moment('2014-01-02T02:00:00'), moment('2014-01-02T01:00:00'))).to.eql(0);
		});
		it('should return 0 for 2 dates falling between 6:00 and 5:59 the following day/month/year', function () {
			expect(date.daysFrom(moment('2014-01-01T05:59:00'), moment('2013-12-31T12:00:00'))).to.eql(0);
		});
		it('should return 1 for 2 dates falling on either side of 6:00', function () {
			expect(date.daysFrom(moment('2014-01-01T06:01:00'), moment('2014-01-01T05:59:00'))).to.eql(1);
		});
		it('should return 1 for 2 dates falling at 6:00 one day apart', function () {
			expect(date.daysFrom(moment('2014-01-02T06:00:00'), moment('2014-01-01T06:00:00'))).to.eql(1);
		});
		it('should return a value greater than 1 for 2 dates more than 1 day apart', function () {
			expect(date.daysFrom(moment('2014-01-04T05:59:00'), moment('2014-01-01T06:01:00'))).to.eql(2);
		});
	});

	describe('millisecondsFrom()', function () {
		it('should return milliseconds between the two dates', function () {
			expect(date.millisecondsFrom('2014-01-01T00:00:00', '2014-01-01T00:20:00')).to.eql(1200000);
		});
		it('should return minus milliseconds between the two dates', function () {
			expect(date.millisecondsFrom('2014-01-01T00:20:00', '2014-01-01T00:00:00')).to.eql(-1200000);
		});
	});

	describe('parse() from epoch to utc', function () {
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
	});
});
