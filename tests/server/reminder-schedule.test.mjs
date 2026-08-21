import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeTime,
  parseTimeToMinutes,
  formatMinutesToTime,
  buildReminderSlotsFromStart,
  buildReminderSlots,
  isWeekdayEligible,
} from '../../shared/reminder-schedule.mjs';

test('normalizeTime pads and validates HH:MM(:SS) strings', () => {
  assert.equal(normalizeTime('7:05'), '07:05');
  assert.equal(normalizeTime('07:55:30'), '07:55');
  assert.equal(normalizeTime(''), null);
  assert.equal(normalizeTime(null), null);
});

test('parseTimeToMinutes converts a normalized time to total minutes', () => {
  assert.equal(parseTimeToMinutes('07:55'), 475);
  assert.equal(parseTimeToMinutes('16:55'), 1015);
  assert.equal(parseTimeToMinutes('not-a-time'), null);
});

test('formatMinutesToTime wraps and formats minutes as HH:MM', () => {
  assert.equal(formatMinutesToTime(475), '07:55');
  assert.equal(formatMinutesToTime(-5), '23:55');
  assert.equal(formatMinutesToTime(1440), '00:00');
});

test('buildReminderSlotsFromStart builds hourly slots through 16:00 and falls back on invalid input', () => {
  // Note: the loop bound is 16:00 (16 * 60 minutes), not 16:55, so an hourly walk from 07:55
  // never lands exactly on 16:55 — this matches the pre-existing server behavior being preserved.
  assert.deepEqual(buildReminderSlotsFromStart('07:55'), [
    '07:55', '08:55', '09:55', '10:55', '11:55', '12:55', '13:55', '14:55', '15:55',
  ]);
  assert.deepEqual(buildReminderSlotsFromStart('invalid'), [
    '07:55', '08:55', '09:55', '10:55', '11:55', '12:55', '13:55', '14:55', '15:55', '16:55',
  ]);
});

test('buildReminderSlots builds hourly slots between start and end, falling back on an invalid range', () => {
  assert.deepEqual(
    buildReminderSlots({ reminderStartTime: '09:00', reminderEndTime: '11:00' }),
    ['09:00', '10:00', '11:00'],
  );
  assert.deepEqual(
    buildReminderSlots({ reminderStartTime: '11:00', reminderEndTime: '09:00' }),
    buildReminderSlotsFromStart('11:00'),
  );
});

test('isWeekdayEligible accepts a Date or an ISO date string and applies the weekdaysOnly rule', () => {
  const saturday = new Date('2026-08-22T12:00:00');
  const monday = new Date('2026-08-24T12:00:00');

  assert.equal(isWeekdayEligible(saturday, true), false);
  assert.equal(isWeekdayEligible(monday, true), true);
  assert.equal(isWeekdayEligible(saturday, false), true);

  assert.equal(isWeekdayEligible('2026-08-22', true), false);
  assert.equal(isWeekdayEligible('2026-08-24', true), true);
});
