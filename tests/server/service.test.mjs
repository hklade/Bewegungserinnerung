import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  isHydrationEntry,
  buildAutomaticReminderEntries,
  buildMissedActivityEntries,
  buildLatestBookings,
  buildTodayStats,
  buildCurrentWeek,
  buildRecentWeeks,
  buildActivityRows,
  buildHeatmap,
  buildHydrationSummary,
  createHydrationBooking,
  replaceAllBookings,
} from '../../server/service.mjs';
import { SERVER_PATHS } from '../../server/config.mjs';

const CONFIG = { hourlyReminderEnabled: true, weekdaysOnly: true, reminderStartTime: '08:00', reminderEndTime: '12:00' };
const MONDAY_NOON = new Date('2026-08-24T12:00:00');
const SATURDAY_NOON = new Date('2026-08-22T12:00:00');

function movementEntry(overrides = {}) {
  return {
    id: 1,
    date: '2026-08-24',
    weekday: 'Montag',
    reminder_time: '08:00',
    response_time: '08:05',
    delay_minutes: 5,
    value: 2,
    description: 'Eintrag',
    duration_minutes: 5,
    is_additional_break: false,
    entry_type: 'planned_break_response',
    note: 'erfasst',
    created_at: '2026-08-24T08:05:00.000Z',
    ...overrides,
  };
}

test('isHydrationEntry distinguishes hydration from movement entries', () => {
  assert.equal(isHydrationEntry({ entry_type: 'hydration' }), true);
  assert.equal(isHydrationEntry({ entry_type: 'planned_break_response' }), false);
});

test('buildAutomaticReminderEntries returns nothing when reminders are disabled or it is a weekend', () => {
  assert.deepEqual(buildAutomaticReminderEntries([], { ...CONFIG, hourlyReminderEnabled: false }, MONDAY_NOON), []);
  assert.deepEqual(buildAutomaticReminderEntries([], CONFIG, SATURDAY_NOON), []);
});

test('buildAutomaticReminderEntries flags slots at least 59 minutes overdue as unanswered, skipping ones already recorded', () => {
  const entries = buildAutomaticReminderEntries([], CONFIG, MONDAY_NOON);

  assert.deepEqual(entries.map((entry) => entry.reminder_time), ['08:00', '09:00', '10:00', '11:00']);
  assert.ok(entries.every((entry) => entry.entry_type === 'unanswered'));

  const alreadyUnanswered = [{ date: '2026-08-24', entry_type: 'unanswered', response_time: null, reminder_time: '08:00' }];
  const remaining = buildAutomaticReminderEntries(alreadyUnanswered, CONFIG, MONDAY_NOON);
  assert.deepEqual(remaining.map((entry) => entry.reminder_time), ['09:00', '10:00', '11:00']);
});

test('buildMissedActivityEntries returns nothing when reminders are disabled or it is a weekend', () => {
  assert.deepEqual(buildMissedActivityEntries([], { ...CONFIG, hourlyReminderEnabled: false }, MONDAY_NOON), []);
  assert.deepEqual(buildMissedActivityEntries([], CONFIG, SATURDAY_NOON), []);
});

test('buildMissedActivityEntries backfills slots with no real response and no existing backfill', () => {
  const entries = buildMissedActivityEntries([], CONFIG, MONDAY_NOON);

  assert.deepEqual(entries.map((entry) => entry.reminder_time), ['08:00', '09:00', '10:00', '11:00']);
  assert.ok(entries.every((entry) => entry.value === 0 && entry.entry_type === 'planned_break_response'));

  const answered = [movementEntry({ reminder_time: '08:00', response_time: '08:00' })];
  const remaining = buildMissedActivityEntries(answered, CONFIG, MONDAY_NOON);
  assert.deepEqual(remaining.map((entry) => entry.reminder_time), ['09:00', '10:00', '11:00']);
});

test('buildMissedActivityEntries does not duplicate an existing automatic backfill', () => {
  const backfilled = [
    {
      date: '2026-08-24',
      reminder_time: '08:00',
      response_time: null,
      value: 0,
      description: 'keine Aktivität eingetragen',
      note: 'automatisch ergänzt',
    },
  ];
  const remaining = buildMissedActivityEntries(backfilled, CONFIG, MONDAY_NOON);
  assert.deepEqual(remaining.map((entry) => entry.reminder_time), ['09:00', '10:00', '11:00']);
});

test('buildLatestBookings excludes unanswered/hydration entries and labels additional breaks', () => {
  const entries = [
    movementEntry({ id: 1 }),
    movementEntry({ id: 2, entry_type: 'unanswered', value: null }),
    { id: 3, entry_type: 'hydration', date: '2026-08-24', hydrationMl: 250 },
    movementEntry({ id: 4, entry_type: 'additional_break' }),
  ];

  const bookings = buildLatestBookings(entries, 5);

  assert.deepEqual(bookings.map((b) => b.id), [1, 4]);
  assert.equal(bookings[1].note, 'Zusatzbewegung');
});

test('buildTodayStats summarizes counts, averages and the active reminder slot', () => {
  const entries = [
    movementEntry({ id: 1, reminder_time: '08:00', response_time: '08:00', value: 2, delay_minutes: 0 }),
    movementEntry({ id: 2, reminder_time: '09:00', response_time: '09:10', value: 4, delay_minutes: 10 }),
  ];

  const stats = buildTodayStats(entries, CONFIG, MONDAY_NOON);

  assert.equal(stats.todayIso, '2026-08-24');
  assert.equal(stats.summary.total, 2);
  assert.equal(stats.summary.answered, 2);
  assert.equal(stats.summary.averageValue, 3);
  assert.equal(stats.summary.averageDelayMinutes, 5);
  assert.equal(stats.reminderTime, '12:00');
});

test('buildTodayStats reports a disabled/weekend headline instead of a reminder slot', () => {
  const disabled = buildTodayStats([], { ...CONFIG, hourlyReminderEnabled: false }, MONDAY_NOON);
  assert.equal(disabled.reminderHeadline, 'deaktiviert');

  const weekend = buildTodayStats([], CONFIG, SATURDAY_NOON);
  assert.equal(weekend.reminderHeadline, 'Wochenende');
});

test('buildCurrentWeek returns one entry per day from Monday through today, averaging values per day', () => {
  const entries = [movementEntry({ date: '2026-08-24', value: 2 }), movementEntry({ date: '2026-08-24', value: 4 })];

  const week = buildCurrentWeek(entries, MONDAY_NOON);

  assert.equal(week.length, 1);
  assert.equal(week[0].date, '2026-08-24');
  assert.equal(week[0].avg, 3);
  assert.equal(week[0].active, true);
});

test('buildRecentWeeks groups entries by week and labels this/last/the-week-before', () => {
  const entries = [
    movementEntry({ date: '2026-08-24', value: 2 }),
    movementEntry({ date: '2026-08-17', value: 4 }),
  ];

  const weeks = buildRecentWeeks(entries, MONDAY_NOON);

  assert.deepEqual(weeks.map((w) => w.label), ['Diese Woche', 'Letzte Woche', 'Vorletzte Woche']);
  assert.equal(weeks[0].avg, 2);
  assert.equal(weeks[1].avg, 4);
  assert.equal(weeks[2].avg, null);
});

test('buildActivityRows excludes unanswered/hydration entries and defaults missing fields', () => {
  const entries = [
    movementEntry({ id: 1 }),
    movementEntry({ id: 2, entry_type: 'unanswered', value: null }),
    { id: 3, entry_type: 'hydration', date: '2026-08-24', hydrationMl: 250 },
  ];

  const rows = buildActivityRows(entries);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].plannedTime, '08:00');
});

test('buildHeatmap aggregates average values per date and hourly slot', () => {
  const entries = [
    movementEntry({ date: '2026-08-24', response_time: '08:05', value: 2 }),
    movementEntry({ date: '2026-08-24', response_time: '08:45', value: 4 }),
  ];

  const heatmap = buildHeatmap(entries, CONFIG, MONDAY_NOON);

  assert.equal(heatmap.columns.length, 1);
  assert.equal(heatmap.columns[0].date, '2026-08-24');

  const slotRow = heatmap.rows.find((row) => row.slot === '08:00');
  assert.equal(slotRow.cells[0].value, 3);
  assert.equal(slotRow.cells[0].count, 2);
});

test('buildHydrationSummary keeps only the latest (already cumulative) entry per day', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test');

  const hydrationPath = SERVER_PATHS.testHydrationExportPath;
  const before = fs.existsSync(hydrationPath) ? fs.readFileSync(hydrationPath, 'utf8') : null;
  t.after(() => {
    if (before === null) {
      fs.rmSync(hydrationPath, { force: true });
    } else {
      fs.writeFileSync(hydrationPath, before, 'utf8');
    }
  });

  const { writeHydrationEntries } = await import('../../server/storage.mjs');
  writeHydrationEntries(hydrationPath, [
    { date: '2026-08-24T07:00:00.000Z', hydrationMl: 250 },
    { date: '2026-08-24T09:00:00.000Z', hydrationMl: 500 },
    { date: '2026-08-23T09:00:00.000Z', hydrationMl: 1000 },
  ]);

  const summary = buildHydrationSummary(new Date('2026-08-24T12:00:00.000Z'));

  assert.equal(summary.todayMl, 500);
  assert.deepEqual(summary.history, [
    { date: '2026-08-24', value: 500 },
    { date: '2026-08-23', value: 1000 },
  ]);
});

test('createHydrationBooking appends a hydration entry and returns the running total', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test');

  const hydrationPath = SERVER_PATHS.testHydrationExportPath;
  const before = fs.existsSync(hydrationPath) ? fs.readFileSync(hydrationPath, 'utf8') : null;
  t.after(() => {
    if (before === null) {
      fs.rmSync(hydrationPath, { force: true });
    } else {
      fs.writeFileSync(hydrationPath, before, 'utf8');
    }
  });

  fs.rmSync(hydrationPath, { force: true });

  const result = createHydrationBooking({ entryType: 'hydration', value: 250 });

  assert.equal(result.item, null);
  assert.equal(result.total, 1);

  const { readHydrationEntries } = await import('../../server/storage.mjs');
  const entries = readHydrationEntries(hydrationPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].hydrationMl, 250);
});

test('createHydrationBooking records a movement booking and marks a repeat slot as an additional break', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test');

  const exportPath = SERVER_PATHS.testExportPath;
  const before = fs.existsSync(exportPath) ? fs.readFileSync(exportPath, 'utf8') : null;
  t.after(() => {
    if (before === null) {
      fs.rmSync(exportPath, { force: true });
    } else {
      fs.writeFileSync(exportPath, before, 'utf8');
    }
  });

  fs.rmSync(exportPath, { force: true });

  // Beide Aufrufe können neben dem eigenen Eintrag zusätzliche automatische
  // Backfill-Einträge für bereits fällige, bislang unbeantwortete Slots des
  // heutigen Tages erzeugen (ensureAutomaticReminderEntries/buildMissedActivityEntries) —
  // daher wird über die description gezielt der eigene Eintrag herausgesucht,
  // statt auf eine feste Gesamtzahl oder den zuletzt sortierten Eintrag zu vertrauen.
  const first = createHydrationBooking({ value: 2, description: 'Spaziergang' });
  assert.equal(first.item.value, 2);
  assert.equal(first.item.description, 'Spaziergang');

  // entryType: 'additional_break' erzwingt den additional-break-Zweig explizit —
  // der implizite Zweig (zweite Buchung im selben Reminder-Slot) greift nur, wenn
  // response_time zufällig exakt auf die volle Reminder-Slot-Minute fällt.
  const second = createHydrationBooking({ value: 3, description: 'Nochmal', entryType: 'additional_break' });
  assert.equal(second.item.note, 'Zusatzbewegung');

  const { readEntries } = await import('../../server/storage.mjs');
  const entries = readEntries(exportPath);
  const firstBooking = entries.find((entry) => entry.description === 'Spaziergang');
  const secondBooking = entries.find((entry) => entry.description === 'Nochmal');

  assert.equal(firstBooking.entry_type, 'planned_break_response');
  assert.equal(firstBooking.is_additional_break, false);
  assert.equal(secondBooking.entry_type, 'additional_break');
  assert.equal(secondBooking.is_additional_break, true);
});

test('replaceAllBookings overwrites all entries from CSV text', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test');

  const exportPath = SERVER_PATHS.testExportPath;
  const before = fs.existsSync(exportPath) ? fs.readFileSync(exportPath, 'utf8') : null;
  t.after(() => {
    if (before === null) {
      fs.rmSync(exportPath, { force: true });
    } else {
      fs.writeFileSync(exportPath, before, 'utf8');
    }
  });

  const header = 'id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at';
  const row = '1;2026-08-24;Montag;08:00;08:05;5;2;Import-Eintrag;5;false;planned_break_response;erfasst;2026-08-24T08:05:00.000Z';
  const csvText = `${header}\n${row}\n`;

  const result = replaceAllBookings(csvText);

  assert.equal(result.total, 1);

  const { readEntries } = await import('../../server/storage.mjs');
  const entries = readEntries(exportPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].description, 'Import-Eintrag');
});
