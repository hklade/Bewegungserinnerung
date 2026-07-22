import fs from 'node:fs';
import { SERVER_PATHS } from './config.mjs';

/**
 * Storage-Helpers für Bewegungs- und Hydratationsdaten.
 * Verantwortlich für das Erzeugen, Lesen, Schreiben und Normalisieren von CSV-Dateien.
 */
import { parseCsvText, csvEscape } from './utils/parsing.mjs';
import { normalizeTime, getViennaWeekday, getLocalDateFromIso } from './utils/time.mjs';
import { parseBoolean, parseInteger } from './utils/parsing.mjs';
import { ensureParentDir } from './config.mjs';

const CSV_HEADERS = [
  'id',
  'date',
  'weekday',
  'reminder_time',
  'response_time',
  'delay_minutes',
  'value',
  'description',
  'duration_minutes',
  'is_additional_break',
  'entry_type',
  'note',
  'created_at',
];
const HYDRATION_HEADERS = ['date', 'hydrationMl'];

export function ensureStorageFile(filePath) {
  ensureParentDir(filePath);

  if (fs.existsSync(filePath)) {
    return;
  }

  fs.writeFileSync(filePath, `${CSV_HEADERS.join(';')}\n`, 'utf8');
}

export function ensureHydrationStorageFile(filePath = SERVER_PATHS.hydrationExportPath) {
  ensureParentDir(filePath);

  if (fs.existsSync(filePath)) {
    return;
  }

  fs.writeFileSync(filePath, `${HYDRATION_HEADERS.join(';')}\n`, 'utf8');
}

export function normalizeEntry(record, fallbackId = 0) {
  const date = String(record.date ?? record.Date ?? '').trim();
  const reminderTime = normalizeTime(record.reminder_time ?? record.reminderTime ?? record.reminder ?? record.time ?? '');
  const responseTime = normalizeTime(record.response_time ?? record.responseTime ?? '');
  const delayMinutes = parseInteger(record.delay_minutes ?? record.delayMinutes ?? '');
  const value = parseInteger(record.value ?? record.rating ?? record.score ?? '');
  const description = String(record.description ?? record.activity ?? record.note ?? '').trim() || 'Eintrag';
  const durationMinutes = parseInteger(record.duration_minutes ?? record.durationMinutes ?? record.duration ?? '');
  const isAdditionalBreak = parseBoolean(record.is_additional_break ?? record.isAdditionalBreak ?? record.additional_break);
  const note = String(record.note ?? record.source_note ?? '').trim();
  const entryTypeRaw = String(record.entry_type ?? record.entryType ?? '').trim();
  const createdAt = String(record.created_at ?? record.imported_at ?? '').trim();
  const weekday = String(record.weekday ?? record.weekday_name ?? '').trim() || (date ? getViennaWeekday(getLocalDateFromIso(date)) : '');

  const entryType = entryTypeRaw || (isAdditionalBreak ? 'additional_break' : value === null ? 'unanswered' : 'planned_break_response');

  return {
    id: parseInteger(record.id) ?? fallbackId,
    date,
    weekday,
    reminder_time: reminderTime,
    response_time: responseTime,
    delay_minutes: delayMinutes,
    value,
    description,
    duration_minutes: durationMinutes,
    is_additional_break: isAdditionalBreak,
    entry_type: entryType,
    note,
    created_at: createdAt || new Date().toISOString(),
  };
}

export function normalizeHydrationEntry(record, fallbackDate = '', fallbackHydrationMl = 0) {
  const date = String(record.date ?? record.Date ?? fallbackDate ?? '').trim();
  const hydrationMl = Math.max(
    0,
    parseInteger(record.hydrationMl ?? record.hydration_ml ?? record.value ?? fallbackHydrationMl) ?? 0,
  );

  return {
    date,
    hydrationMl,
  };
}

export function formatEntryForCsv(entry) {
  return {
    id: entry.id,
    date: entry.date,
    weekday: entry.weekday || (entry.date ? getViennaWeekday(getLocalDateFromIso(entry.date)) : ''),
    reminder_time: entry.reminder_time ?? '',
    response_time: entry.response_time ?? '',
    delay_minutes: entry.delay_minutes ?? '',
    value: entry.value ?? '',
    description: entry.description ?? '',
    duration_minutes: entry.duration_minutes ?? '',
    is_additional_break: entry.is_additional_break ? 'true' : 'false',
    entry_type: entry.entry_type ?? '',
    note: entry.note ?? '',
    created_at: entry.created_at ?? '',
  };
}

export function formatHydrationEntryForCsv(entry) {
  return {
    date: entry.date,
    hydrationMl: entry.hydrationMl,
  };
}

export function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    const leftTime = left.response_time || left.reminder_time || '';
    const rightTime = right.response_time || right.reminder_time || '';
    if (leftTime !== rightTime) {
      return rightTime.localeCompare(leftTime);
    }

    return (right.id ?? 0) - (left.id ?? 0);
  });
}

export function serializeCsv(rows) {
  const lines = [CSV_HEADERS.join(';')];
  for (const row of rows) {
    lines.push(
      CSV_HEADERS.map((header) => csvEscape(row[header] ?? '')).join(';'),
    );
  }

  return `${lines.join('\n')}\n`;
}

export function serializeHydrationCsv(rows) {
  const lines = [HYDRATION_HEADERS.join(';')];
  for (const row of rows) {
    lines.push(
      HYDRATION_HEADERS.map((header) => csvEscape(row[header] ?? '')).join(';'),
    );
  }

  return `${lines.join('\n')}\n`;
}

export function readEntries(filePath) {
  ensureStorageFile(filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const { rows } = parseCsvText(text);
  const entries = rows.map((record, index) => normalizeEntry(record, index + 1));
  return sortEntries(entries);
}

export function writeEntries(filePath, entries) {
  ensureParentDir(filePath);
  const normalizedRows = sortEntries(entries).map((entry, index) => ({
    ...entry,
    id: Number.isFinite(entry.id) && entry.id > 0 ? entry.id : index + 1,
  }));
  fs.writeFileSync(filePath, serializeCsv(normalizedRows.map(formatEntryForCsv)), 'utf8');
  return normalizedRows;
}

export function readHydrationEntries(filePath = SERVER_PATHS.hydrationExportPath) {
  ensureHydrationStorageFile(filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const { rows } = parseCsvText(text);
  return rows.map((record, index) => normalizeHydrationEntry(record, '', index));
}

export function writeHydrationEntries(filePath, entries) {
  ensureParentDir(filePath);
  const normalizedRows = entries.map((entry) => ({
    date: String(entry.date ?? '').trim(),
    hydrationMl: Math.max(0, parseInteger(entry.hydrationMl ?? entry.value) ?? 0),
  }));
  fs.writeFileSync(filePath, serializeHydrationCsv(normalizedRows.map(formatHydrationEntryForCsv)), 'utf8');
  return normalizedRows;
}
