import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PROJECT = String.raw`C:\Users\HeidiKlade\OneDrive - Gofore Oyj\Projekte\Bewegungserinnerung`;
const CSV_PATH = String.raw`C:\Users\HeidiKlade\Downloads\bewegungspausen_export_alle_daten_bis_2026-07-06_korrigiert.csv`;
const DB_PATH = path.join(PROJECT, 'data', 'bewegungserinnerung.sqlite3');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toInt(value) {
  const text = (value ?? '').trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toText(value) {
  const text = (value ?? '').trim();
  return text || null;
}

function toBool(value) {
  return ['true', '1', 'yes', 'y'].includes((value ?? '').trim().toLowerCase());
}

function weekdayFor(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  return WEEKDAYS[date.getUTCDay()];
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(';');
  return lines.slice(1).map((line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ';' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    const record = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? '';
    });
    return record;
  });
}

const csvText = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCsv(csvText);

fs.rmSync(DB_PATH, { force: true });
const db = new DatabaseSync(DB_PATH);

try {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE movement_pause_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weekday TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      reminder_time TEXT,
      response_time TEXT,
      delay_minutes INTEGER,
      value INTEGER,
      description TEXT,
      source_rating INTEGER,
      source_activity TEXT,
      source_duration_minutes INTEGER,
      source_is_additional_break INTEGER,
      source_note TEXT,
      source_csv_row INTEGER NOT NULL,
      imported_at TEXT NOT NULL
    );

    CREATE INDEX idx_movement_pause_entries_date ON movement_pause_entries(date);
    CREATE INDEX idx_movement_pause_entries_entry_type ON movement_pause_entries(entry_type);
  `);

  const insert = db.prepare(`
    INSERT INTO movement_pause_entries (
      date, weekday, entry_type, reminder_time, response_time, delay_minutes,
      value, description, source_rating, source_activity, source_duration_minutes,
      source_is_additional_break, source_note, source_csv_row, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const now = new Date().toISOString();
  db.exec('BEGIN');
  let imported = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const date = toText(row.date);
    if (!date) continue;
    const activity = toText(row.activity);
    const note = toText(row.note);
    const sourceRating = toInt(row.rating);
    const isAdditionalBreak = toBool(row.is_additional_break) ? 1 : 0;
    const entryType = isAdditionalBreak ? 'additional_break' : (sourceRating === null ? 'unanswered' : 'planned_break_response');

    insert.run(
      date,
      weekdayFor(date),
      entryType,
      toText(row.reminder_time),
      toText(row.response_time),
      toInt(row.delay_minutes),
      sourceRating,
      activity,
      sourceRating,
      activity,
      toInt(row.duration_minutes),
      isAdditionalBreak,
      note,
      index + 2,
      now,
    );
    imported += 1;
  }
  db.exec('COMMIT');
  console.log(`Imported ${imported} rows into ${DB_PATH}`);
} catch (error) {
  try { db.exec('ROLLBACK'); } catch {}
  throw error;
} finally {
  db.close();
}
