import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PROJECT = String.raw`C:\Users\HeidiKlade\OneDrive - Gofore Oyj\Projekte\Bewegungserinnerung`;
const DB_PATH = path.join(PROJECT, 'data', 'bewegungserinnerung.sqlite3');

function trimTime(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 5);
}

function normalizeEntry(row) {
  const updates = {};
  const note = String(row.source_note ?? '').toLowerCase();
  const isUnansweredNote =
    note.includes('keine rückmeldung')
    || note.includes('keine antwort')
    || note.includes('automatisch ergänzt');

  if (row.source_is_additional_break === 1) {
    updates.entry_type = 'additional_break';
    if (row.response_time) {
      updates.reminder_time = trimTime(row.response_time);
      updates.response_time = trimTime(row.response_time);
      updates.delay_minutes = 0;
    }
  } else if (
    row.delay_minutes !== null && row.delay_minutes >= 60
    || isUnansweredNote
    || (row.value === 0 && row.reminder_time == null && row.response_time == null)
  ) {
    updates.entry_type = 'unanswered';
    updates.value = null;
    updates.response_time = null;
    updates.delay_minutes = null;
    updates.description = 'keine Rückmeldung';
    updates.reminder_time = trimTime(row.reminder_time);
  } else {
    updates.entry_type = 'planned_break_response';
  }

  if (row.reminder_time != null) {
    updates.reminder_time = trimTime(row.reminder_time);
  }

  if (row.response_time != null && updates.entry_type !== 'unanswered') {
    updates.response_time = trimTime(row.response_time);
  }

  if (updates.entry_type !== 'unanswered' && row.delay_minutes != null) {
    updates.delay_minutes = row.delay_minutes;
  }

  if (updates.entry_type !== 'unanswered' && row.value != null) {
    updates.value = row.value;
  }

  if (row.description != null && updates.description == null) {
    updates.description = row.description;
  }

  return updates;
}

if (!fs.existsSync(DB_PATH)) {
  throw new Error(`Database not found: ${DB_PATH}`);
}

const backupPath = DB_PATH.replace(/\.sqlite3$/i, `.normalized-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`);
fs.copyFileSync(DB_PATH, backupPath);

const db = new DatabaseSync(DB_PATH);

try {
  db.exec('BEGIN');
  const rows = db.prepare(`
    SELECT id, entry_type, reminder_time, response_time, delay_minutes, value, description, source_note, source_is_additional_break
    FROM movement_pause_entries
    ORDER BY id;
  `).all();

  const updateStmt = db.prepare(`
    UPDATE movement_pause_entries
    SET entry_type = ?,
        reminder_time = ?,
        response_time = ?,
        delay_minutes = ?,
        value = ?,
        description = ?
    WHERE id = ?;
  `);

  let changed = 0;
  for (const row of rows) {
    const updates = normalizeEntry(row);
    const values = [
      updates.entry_type ?? row.entry_type,
      Object.prototype.hasOwnProperty.call(updates, 'reminder_time') ? updates.reminder_time : trimTime(row.reminder_time),
      Object.prototype.hasOwnProperty.call(updates, 'response_time') ? updates.response_time : trimTime(row.response_time),
      Object.prototype.hasOwnProperty.call(updates, 'delay_minutes') ? updates.delay_minutes : row.delay_minutes,
      Object.prototype.hasOwnProperty.call(updates, 'value') ? updates.value : row.value,
      Object.prototype.hasOwnProperty.call(updates, 'description') ? updates.description : row.description,
      row.id,
    ];

    const before = JSON.stringify({
      entry_type: row.entry_type,
      reminder_time: row.reminder_time,
      response_time: row.response_time,
      delay_minutes: row.delay_minutes,
      value: row.value,
      description: row.description,
    });
    const after = JSON.stringify({
      entry_type: values[0],
      reminder_time: values[1],
      response_time: values[2],
      delay_minutes: values[3],
      value: values[4],
      description: values[5],
    });

    if (before !== after) {
      updateStmt.run(...values);
      changed += 1;
    }
  }

  db.exec('COMMIT');
  console.log(`Normalized ${changed} rows.`);
  console.log(`Backup written to ${backupPath}`);
} catch (error) {
  try {
    db.exec('ROLLBACK');
  } catch {}
  throw error;
} finally {
  db.close();
}
