import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 3001;
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const EXPORT_DIR = path.join(PROJECT_ROOT, "export");
const CODEX_ROOT = "C:\\Users\\HeidiKlade\\Documents\\Codex";
const CODEX_APP_DIR = path.join(CODEX_ROOT, "Bewegungserinnerung");
const CODEX_EXPORT_DIR = path.join(CODEX_APP_DIR, "export");
const DEFAULT_EXPORT_PATH = path.join(CODEX_EXPORT_DIR, "Bewegungsdaten.csv");
const LEGACY_EXPORT_PATH = path.join(EXPORT_DIR, "bewegungstracker_daten.csv");
const CONFIG_PATH = path.join(CODEX_APP_DIR, "bewegungserinnerung.config.json");
const LEGACY_CONFIG_PATH = path.join(DATA_DIR, "bewegungserinnerung.config.json");
const VIENNA_TIME_ZONE = "Europe/Vienna";
const CSV_HEADERS = [
  "id",
  "date",
  "weekday",
  "reminder_time",
  "response_time",
  "delay_minutes",
  "value",
  "description",
  "duration_minutes",
  "is_additional_break",
  "entry_type",
  "note",
  "created_at",
];
const DEFAULT_REMINDER_SLOTS = ["07:55", "08:55", "09:55", "10:55", "11:55", "12:55", "13:55", "14:55", "15:55", "16:55"];
const DEFAULT_CONFIG = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: "07:55",
  reminderEndTime: "16:55",
  weekdaysOnly: true,
  exportPath: DEFAULT_EXPORT_PATH,
  reminderToneEnabled: true,
};

function logStep(step, details = {}) {
  console.info(`[bewegungserinnerung] ${step} ${JSON.stringify(details)}`);
}

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath));
}

function normalizeTime(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return trimmed.slice(0, 5);
  }

  const hours = String(Number(match[1])).padStart(2, "0");
  const minutes = String(Number(match[2])).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getViennaIsoDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: VIENNA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getViennaTime(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: VIENNA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getViennaWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("de-AT", {
    timeZone: VIENNA_TIME_ZONE,
    weekday: "long",
  }).format(date);
}

function getLocalDateFromIso(dateIso) {
  return new Date(`${dateIso}T12:00:00`);
}

function getWeekdayIndexFromIso(dateIso) {
  return (getLocalDateFromIso(dateIso).getDay() + 6) % 7;
}

function isWeekend(dateIso) {
  const weekdayIndex = getWeekdayIndexFromIso(dateIso);
  return weekdayIndex === 5 || weekdayIndex === 6;
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "ja";
}

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const number = Number(normalized.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return null;
  }

  return Math.trunc(parsed);
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (insideQuotes) {
      if (character === "\"") {
        if (line[index + 1] === "\"") {
          cell += "\"";
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === "\"") {
      insideQuotes = true;
      continue;
    }

    if (character === ";") {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell);
  return cells;
}

function parseCsvText(text) {
  const cleaned = String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) {
    return { headers: [], rows: [] };
  }

  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });

    return record;
  });

  return { headers, rows };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[;\n\r"]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}

function serializeCsv(rows) {
  const lines = [CSV_HEADERS.join(";")];
  for (const row of rows) {
    lines.push(
      CSV_HEADERS.map((header) => csvEscape(row[header] ?? "")).join(";"),
    );
  }

  return `${lines.join("\n")}\n`;
}

function normalizeEntry(record, fallbackId = 0) {
  const date = String(record.date ?? record.Date ?? "").trim();
  const reminderTime = normalizeTime(record.reminder_time ?? record.reminderTime ?? record.reminder ?? record.time ?? "");
  const responseTime = normalizeTime(record.response_time ?? record.responseTime ?? "");
  const delayMinutes = parseInteger(record.delay_minutes ?? record.delayMinutes ?? "");
  const value = parseInteger(record.value ?? record.rating ?? record.score ?? "");
  const description = String(record.description ?? record.activity ?? record.note ?? "").trim() || "Eintrag";
  const durationMinutes = parseInteger(record.duration_minutes ?? record.durationMinutes ?? record.duration ?? "");
  const isAdditionalBreak = parseBoolean(record.is_additional_break ?? record.isAdditionalBreak ?? record.additional_break);
  const note = String(record.note ?? record.source_note ?? "").trim();
  const entryTypeRaw = String(record.entry_type ?? record.entryType ?? "").trim();
  const createdAt = String(record.created_at ?? record.imported_at ?? "").trim();
  const weekday = String(record.weekday ?? record.weekday_name ?? "").trim() || (date ? getViennaWeekday(getLocalDateFromIso(date)) : "");

  const entryType =
    entryTypeRaw ||
    (isAdditionalBreak ? "additional_break" : value === null ? "unanswered" : "planned_break_response");

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

function formatEntryForCsv(entry) {
  return {
    id: entry.id,
    date: entry.date,
    weekday: entry.weekday || (entry.date ? getViennaWeekday(getLocalDateFromIso(entry.date)) : ""),
    reminder_time: entry.reminder_time ?? "",
    response_time: entry.response_time ?? "",
    delay_minutes: entry.delay_minutes ?? "",
    value: entry.value ?? "",
    description: entry.description ?? "",
    duration_minutes: entry.duration_minutes ?? "",
    is_additional_break: entry.is_additional_break ? "true" : "false",
    entry_type: entry.entry_type ?? "",
    note: entry.note ?? "",
    created_at: entry.created_at ?? "",
  };
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    const leftTime = left.response_time || left.reminder_time || "";
    const rightTime = right.response_time || right.reminder_time || "";
    if (leftTime !== rightTime) {
      return rightTime.localeCompare(leftTime);
    }

    return (right.id ?? 0) - (left.id ?? 0);
  });
}

function loadConfig() {
  ensureParentDir(CONFIG_PATH);

  const sourcePath = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : LEGACY_CONFIG_PATH;
  if (!fs.existsSync(sourcePath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      exportPath: parsed?.exportPath ? String(parsed.exportPath) : DEFAULT_CONFIG.exportPath,
      reminderStartTime: normalizeTime(parsed?.reminderStartTime) ?? DEFAULT_CONFIG.reminderStartTime,
      reminderEndTime: normalizeTime(parsed?.reminderEndTime) ?? DEFAULT_CONFIG.reminderEndTime,
      hourlyReminderEnabled: Boolean(parsed?.hourlyReminderEnabled ?? DEFAULT_CONFIG.hourlyReminderEnabled),
      showReminderDialog: Boolean(parsed?.showReminderDialog ?? DEFAULT_CONFIG.showReminderDialog),
      weekdaysOnly: Boolean(parsed?.weekdaysOnly ?? DEFAULT_CONFIG.weekdaysOnly),
      reminderToneEnabled: Boolean(parsed?.reminderToneEnabled ?? DEFAULT_CONFIG.reminderToneEnabled),
    };
  } catch (error) {
    logStep("config.read.failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  const nextConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    exportPath: String(config.exportPath ?? DEFAULT_CONFIG.exportPath),
    reminderStartTime: normalizeTime(config.reminderStartTime) ?? DEFAULT_CONFIG.reminderStartTime,
    reminderEndTime: normalizeTime(config.reminderEndTime) ?? DEFAULT_CONFIG.reminderEndTime,
    hourlyReminderEnabled: Boolean(config.hourlyReminderEnabled),
    showReminderDialog: Boolean(config.showReminderDialog),
    weekdaysOnly: Boolean(config.weekdaysOnly),
    reminderToneEnabled: Boolean(config.reminderToneEnabled),
  };

  ensureParentDir(CONFIG_PATH);
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
  return nextConfig;
}

function ensureStorageFile(filePath) {
  ensureParentDir(filePath);

  if (fs.existsSync(filePath)) {
    return;
  }

  if (path.resolve(filePath) === path.resolve(DEFAULT_EXPORT_PATH) && fs.existsSync(LEGACY_EXPORT_PATH)) {
    const legacyText = fs.readFileSync(LEGACY_EXPORT_PATH, "utf8");
    const legacyRows = parseCsvText(legacyText).rows.map((record, index) => normalizeEntry(record, index + 1));
    writeEntries(filePath, legacyRows);
    logStep("storage.migrated", { from: path.basename(LEGACY_EXPORT_PATH), to: path.basename(filePath), rows: legacyRows.length });
    return;
  }

  fs.writeFileSync(filePath, `${CSV_HEADERS.join(";")}\n`, "utf8");
}

function readEntries(filePath) {
  ensureStorageFile(filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const { rows } = parseCsvText(text);
  const entries = rows.map((record, index) => normalizeEntry(record, index + 1));
  return sortEntries(entries);
}

function writeEntries(filePath, entries) {
  ensureParentDir(filePath);
  const normalizedRows = sortEntries(entries).map((entry, index) => ({
    ...entry,
    id: Number.isFinite(entry.id) && entry.id > 0 ? entry.id : index + 1,
  }));
  fs.writeFileSync(filePath, serializeCsv(normalizedRows.map(formatEntryForCsv)), "utf8");
  return normalizedRows;
}

function normalizeConfigPath(config) {
  const exportPath = String(config?.exportPath ?? DEFAULT_CONFIG.exportPath).trim();
  return exportPath || DEFAULT_CONFIG.exportPath;
}

function buildReminderSlots(config) {
  const startMinutes = parseTimeToMinutes(config.reminderStartTime);
  const endMinutes = parseTimeToMinutes(config.reminderEndTime);

  if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
    return DEFAULT_REMINDER_SLOTS;
  }

  const slots = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
    slots.push(formatMinutesToTime(minutes));
  }

  return slots.length > 0 ? slots : DEFAULT_REMINDER_SLOTS;
}

function getEntrySlot(entry) {
  return normalizeTime(entry.response_time || entry.reminder_time);
}

function isAutomaticBackfillEntry(entry) {
  return (
    entry.entry_type === "planned_break_response" &&
    entry.value === 0 &&
    entry.description === "keine Aktivität eingetragen" &&
    entry.note === "automatisch ergänzt"
  );
}

function buildAutomaticReminderEntries(entries, config, now = new Date()) {
  if (!config.hourlyReminderEnabled) {
    return [];
  }

  const date = getViennaIsoDate(now);
  if (config.weekdaysOnly && isWeekend(date)) {
    return [];
  }

  const weekday = getViennaWeekday(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderSlots = buildReminderSlots(config);

  return reminderSlots
    .filter((slot) => {
      const slotMinutes = parseTimeToMinutes(slot);
      return slotMinutes !== null && currentMinutes - slotMinutes >= 59;
    })
    .filter((slot) => !entries.some((entry) => entry.date === date && entry.entry_type === "unanswered" && getEntrySlot(entry) === slot))
    .map((slot) => ({
      id: null,
      date,
      weekday,
      reminder_time: slot,
      response_time: null,
      delay_minutes: null,
      value: null,
      description: "keine Rückmeldung",
      duration_minutes: null,
      is_additional_break: false,
      entry_type: "unanswered",
      note: "automatisch ergänzt",
      created_at: now.toISOString(),
    }));
}

function buildMissedActivityEntries(entries, config, now = new Date()) {
  if (!config.hourlyReminderEnabled) {
    return [];
  }

  const date = getViennaIsoDate(now);
  if (config.weekdaysOnly && isWeekend(date)) {
    return [];
  }

  const weekday = getViennaWeekday(now);
  const responseTime = getViennaTime(now);
  const responseMinutes = parseTimeToMinutes(responseTime);

  if (responseMinutes === null) {
    return [];
  }

  const reminderSlots = buildReminderSlots(config);

  return reminderSlots
    .filter((slot) => {
      const slotMinutes = parseTimeToMinutes(slot);
      return slotMinutes !== null && responseMinutes - slotMinutes >= 59;
    })
    .filter((slot) => {
      const hasActualResponse = entries.some((entry) => entry.date === date && getEntrySlot(entry) === slot && entry.value !== null && !isAutomaticBackfillEntry(entry));
      const hasBackfill = entries.some((entry) => entry.date === date && getEntrySlot(entry) === slot && isAutomaticBackfillEntry(entry));
      return !hasActualResponse && !hasBackfill;
    })
    .map((slot) => ({
      id: null,
      date,
      weekday,
      reminder_time: slot,
      response_time: null,
      delay_minutes: null,
      value: 0,
      description: "keine Aktivität eingetragen",
      duration_minutes: null,
      is_additional_break: false,
      entry_type: "planned_break_response",
      note: "automatisch ergänzt",
      created_at: now.toISOString(),
    }));
}

function ensureAutomaticReminderEntries(filePath, config, now = new Date()) {
  const entries = readEntries(filePath);
  const automaticReminderEntries = buildAutomaticReminderEntries(entries, config, now);

  if (automaticReminderEntries.length === 0) {
    return entries;
  }

  return writeEntries(filePath, [...automaticReminderEntries, ...entries]);
}

function buildLatestBookings(entries, limit = 5) {
  return entries
    .filter((entry) => entry.entry_type !== "unanswered")
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      time: entry.response_time || entry.reminder_time || "--:--",
      value: entry.value,
      description: entry.description || "Eintrag",
      note:
        entry.entry_type === "additional_break"
          ? "Zusatzbewegung"
          : entry.value === null
            ? "keine Rückmeldung"
            : entry.note || "erfasst",
    }));
}

function buildTodayStats(entries, config, now = new Date()) {
  const todayIso = getViennaIsoDate(now);
  const todayEntries = entries.filter((entry) => entry.date === todayIso);
  const reminderSlots = buildReminderSlots(config);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lastActiveSlot = [...reminderSlots]
    .reverse()
    .find((slot) => parseTimeToMinutes(slot) !== null && parseTimeToMinutes(slot) <= currentMinutes);
  const activeReminderTime = lastActiveSlot ?? reminderSlots[0] ?? "--:--";
  const slotAlreadyFilled = todayEntries.some((entry) => {
    const entryTime = normalizeTime(entry.response_time || entry.reminder_time);
    return entryTime === activeReminderTime && entry.value !== null;
  });
  const missedReminderEntries = todayEntries.filter(
    (entry) =>
      entry.entry_type === "unanswered" ||
      (entry.entry_type === "planned_break_response" &&
        entry.value === 0 &&
        entry.description === "keine Aktivität eingetragen" &&
        entry.note === "automatisch ergänzt"),
  );

  return {
    todayIso,
    summary: {
      total: todayEntries.length,
      answered: todayEntries.filter((entry) => entry.value !== null).length,
      unanswered: missedReminderEntries.length,
      planned: todayEntries.filter((entry) => entry.entry_type === "planned_break_response").length,
      additional: todayEntries.filter((entry) => entry.entry_type === "additional_break").length,
      averageValue:
        todayEntries.filter((entry) => entry.value !== null).length > 0
          ? todayEntries.filter((entry) => entry.value !== null).reduce((sum, entry) => sum + Number(entry.value), 0) /
            todayEntries.filter((entry) => entry.value !== null).length
          : null,
      averageDelayMinutes:
        todayEntries.filter((entry) => Number.isFinite(entry.delay_minutes)).length > 0
          ? todayEntries.filter((entry) => Number.isFinite(entry.delay_minutes)).reduce((sum, entry) => sum + Number(entry.delay_minutes || 0), 0) /
            todayEntries.filter((entry) => Number.isFinite(entry.delay_minutes)).length
          : null,
    },
    distribution: [0, 1, 2, 3, 4].map((value) => ({
      value,
      count: todayEntries.filter((entry) => entry.value === value).length,
    })),
    reminderHeadline:
      !config.hourlyReminderEnabled
        ? "deaktiviert"
        : config.weekdaysOnly && isWeekend(todayIso)
          ? "Wochenende"
          : slotAlreadyFilled
            ? `${activeReminderTime} · Zusatzbewegung`
            : activeReminderTime,
    reminderTime: activeReminderTime,
  };
}

function buildCurrentWeek(entries, now = new Date()) {
  const todayIso = getViennaIsoDate(now);
  const currentDayIndex = (now.getDay() + 6) % 7;
  const mondayDate = new Date(`${todayIso}T12:00:00`);
  mondayDate.setDate(mondayDate.getDate() - currentDayIndex);

  return Array.from({ length: currentDayIndex + 1 }, (_, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    const iso = getViennaIsoDate(date);
    const dayEntries = entries.filter((entry) => entry.date === iso && entry.value !== null);
    const avg = dayEntries.length > 0 ? dayEntries.reduce((sum, entry) => sum + Number(entry.value), 0) / dayEntries.length : null;

    return {
      day: getViennaWeekday(date),
      date: iso,
      avg,
      note:
        dayEntries.length > 0
          ? `${dayEntries.length} Einträge`
          : "Noch keine Daten",
      active: iso === todayIso,
    };
  });
}

function getWeekStart(dateIso) {
  const date = getLocalDateFromIso(dateIso);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return getViennaIsoDate(date);
}

function buildRecentWeeks(entries, now = new Date()) {
  const groups = new Map();

  for (const entry of entries) {
    if (entry.value === null) {
      continue;
    }

    const weekStart = getWeekStart(entry.date);
    const bucket = groups.get(weekStart) ?? [];
    bucket.push(entry);
    groups.set(weekStart, bucket);
  }

  const currentWeekStart = getWeekStart(getViennaIsoDate(now));
  const labels = [
    { offset: 0, label: "Diese Woche" },
    { offset: 7, label: "Letzte Woche" },
    { offset: 14, label: "Vorletzte Woche" },
  ];

  return labels.map(({ offset, label }) => {
    const targetDate = new Date(`${currentWeekStart}T12:00:00`);
    targetDate.setDate(targetDate.getDate() - offset);
    const weekStart = getViennaIsoDate(targetDate);
    const weekEntries = groups.get(weekStart) ?? [];
    const avg =
      weekEntries.length > 0
        ? weekEntries.reduce((sum, entry) => sum + Number(entry.value), 0) / weekEntries.length
        : null;

    return {
      label,
      avg,
      note:
        weekEntries.length > 0
          ? `${weekEntries.length} Werte`
          : "Noch wenig Daten vorhanden",
    };
  });
}

function buildActivityRows(entries, limit = 200) {
  return entries
    .filter((entry) => entry.entry_type !== "unanswered")
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      time: entry.response_time || entry.reminder_time || "--:--",
      plannedTime: entry.reminder_time || "--:--",
      delayMinutes: entry.delay_minutes ?? 0,
      value: entry.value,
      description: entry.description || "Eintrag",
      note: entry.note || (entry.value === null ? "keine Rückmeldung" : "erfasst"),
      entryType: entry.entry_type,
      isAdditionalBreak: Boolean(entry.is_additional_break),
    }));
}

function buildHeatmap(entries, config, now = new Date()) {
  const activeDatesDescending = [
    ...new Set(entries.filter((entry) => entry.value !== null).map((entry) => entry.date)),
  ].sort((left, right) => right.localeCompare(left));

  const columns = activeDatesDescending.slice(0, 7).sort((left, right) => left.localeCompare(right)).map((date) => ({
    date,
    label: getViennaWeekday(getLocalDateFromIso(date)).slice(0, 2),
    shortLabel: date.slice(8, 10),
  }));

  const startMinutes = parseTimeToMinutes(config.reminderStartTime);
  const endMinutes = parseTimeToMinutes(config.reminderEndTime);
  const startHour = startMinutes === null ? 8 : Math.max(0, Math.ceil(startMinutes / 60) * 60);
  const endHour = endMinutes === null ? 17 * 60 : Math.min(23 * 60, Math.ceil(endMinutes / 60) * 60);

  const rows = [];
  for (let minutes = startHour; minutes <= endHour; minutes += 60) {
    const slot = formatMinutesToTime(minutes);
    const slotKey = `${slot.slice(0, 2)}:00`;
    const cells = columns.map((column) => {
      const matchingEntries = entries.filter((entry) => {
        const entryDate = entry.date;
        const entryTime = normalizeTime(entry.response_time || entry.reminder_time);
        return entryDate === column.date && entryTime && entryTime.slice(0, 2) === slotKey.slice(0, 2) && entry.value !== null;
      });

      if (matchingEntries.length === 0) {
        return {
          date: column.date,
          slot: slotKey,
          value: null,
          count: 0,
        };
      }

      const average = matchingEntries.reduce((sum, entry) => sum + Number(entry.value), 0) / matchingEntries.length;
      return {
        date: column.date,
        slot: slotKey,
        value: average,
        count: matchingEntries.length,
      };
    });

    rows.push({
      slot: slotKey,
      cells,
    });
  }

  return {
    title: "Letzte 7 eingetragene Tage",
    subtitle: `${columns.length} aktive Tage`,
    columns,
    rows,
    note:
      "Grüne Kacheln stehen für geplante oder zusätzliche Einheiten. Je kräftiger das Grün, desto höher die Bewertung.",
  };
}

function buildDashboard(limit = 5) {
  const config = loadConfig();
  const exportPath = normalizeConfigPath(config);
  ensureStorageFile(exportPath);
  const entries = ensureAutomaticReminderEntries(exportPath, config);
  const now = new Date();

  return {
    config: {
      ...config,
      exportPath,
    },
    total: entries.length,
    today: buildTodayStats(entries, config, now),
    latestBookings: buildLatestBookings(entries, limit),
    activities: buildActivityRows(entries, 200),
    currentWeek: buildCurrentWeek(entries, now),
    recentWeeks: buildRecentWeeks(entries, now),
    heatmap: buildHeatmap(entries, config, now),
  };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseTextBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function createManualBooking(payload) {
  const config = loadConfig();
  const exportPath = normalizeConfigPath(config);
  ensureStorageFile(exportPath);
  const now = new Date();
  const entries = ensureAutomaticReminderEntries(exportPath, config, now);
  const date = getViennaIsoDate(now);
  const responseTime = getViennaTime(now);
  const weekday = getViennaWeekday(now);
  const reminderSlots = buildReminderSlots(config);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderTime =
    [...reminderSlots]
      .reverse()
      .find((slot) => parseTimeToMinutes(slot) !== null && parseTimeToMinutes(slot) <= currentMinutes) ??
    reminderSlots[0] ??
    responseTime;
  const existingForSlot = entries.some((entry) => entry.date === date && normalizeTime(entry.response_time || entry.reminder_time) === reminderTime && entry.value !== null);
  const isAdditionalBreak =
    payload?.entryType === "additional_break" || existingForSlot;
  const value = parseInteger(payload?.value);
  const description = String(payload?.description ?? payload?.note ?? "").trim() || "Eintrag";
  const note = String(payload?.note ?? "").trim() || description;
  const delayMinutes = Math.max(0, Math.round((parseTimeToMinutes(responseTime) ?? 0) - (parseTimeToMinutes(reminderTime) ?? 0)));

  const missedActivityEntries = buildMissedActivityEntries(entries, config, now);
  const nextId = entries.reduce((max, entry) => Math.max(max, Number(entry.id) || 0), 0) + 1;
  let nextEntryId = nextId;
  const record = {
    id: nextEntryId++,
    date,
    weekday,
    reminder_time: reminderTime,
    response_time: responseTime,
    delay_minutes: delayMinutes,
    value,
    description,
    duration_minutes: parseInteger(payload?.durationMinutes),
    is_additional_break: isAdditionalBreak,
    entry_type: isAdditionalBreak ? "additional_break" : "planned_break_response",
    note,
    created_at: now.toISOString(),
  };
  const generatedEntries = missedActivityEntries.map((entry) => ({
    ...entry,
    id: nextEntryId++,
  }));

  const updatedEntries = writeEntries(exportPath, [record, ...generatedEntries, ...entries]);

  logStep("submit.saved", {
    total: updatedEntries.length,
    date,
    reminderTime,
    responseTime,
    entryType: record.entry_type,
    generatedMissedActivities: generatedEntries.length,
  });

  return {
    item: buildLatestBookings(updatedEntries, 1)[0] ?? null,
    total: updatedEntries.length,
  };
}

function replaceAllBookings(csvText) {
  const config = loadConfig();
  const exportPath = normalizeConfigPath(config);
  ensureStorageFile(exportPath);
  const { rows } = parseCsvText(csvText);
  const normalizedRows = rows.map((record, index) => normalizeEntry(record, index + 1));
  const updatedEntries = writeEntries(exportPath, normalizedRows);

  logStep("import.saved", {
    total: updatedEntries.length,
    exportPath,
  });

  return {
    total: updatedEntries.length,
  };
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(text);
}

const server = http.createServer((req, res) => {
  logStep("request", {
    method: req.method,
    url: req.url ?? null,
  });

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (!req.url) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const url = new URL(req.url, "http://127.0.0.1");

  if (url.pathname === "/api/config" && req.method === "GET") {
    const config = loadConfig();
    sendJson(res, 200, {
      ...config,
      exportPath: normalizeConfigPath(config),
    });
    return;
  }

  if (url.pathname === "/api/config" && req.method === "PUT") {
    parseJsonBody(req)
      .then((payload) => {
        const nextConfig = saveConfig({
          hourlyReminderEnabled: Boolean(payload?.hourlyReminderEnabled),
          showReminderDialog: Boolean(payload?.showReminderDialog),
          reminderStartTime: normalizeTime(payload?.reminderStartTime) ?? DEFAULT_CONFIG.reminderStartTime,
          reminderEndTime: normalizeTime(payload?.reminderEndTime) ?? DEFAULT_CONFIG.reminderEndTime,
          weekdaysOnly: Boolean(payload?.weekdaysOnly),
          exportPath: normalizeConfigPath(payload),
          reminderToneEnabled: Boolean(payload?.reminderToneEnabled),
        });

        ensureStorageFile(normalizeConfigPath(nextConfig));
        logStep("config.saved", { exportPath: nextConfig.exportPath });
        sendJson(res, 200, nextConfig);
      })
      .catch((error) => {
        logStep("config.failed", {
          error: error instanceof Error ? error.message : "Invalid payload",
        });
        sendJson(res, 400, {
          error: error instanceof Error ? error.message : "Invalid payload",
        });
      });
    return;
  }

  if (url.pathname === "/api/dashboard" && req.method === "GET") {
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "5", 10);
    const payload = buildDashboard(Number.isNaN(limit) ? 5 : Math.min(200, Math.max(1, limit)));
    logStep("dashboard.loaded", {
      total: payload.total,
      today: payload.today.summary.total,
      latest: payload.latestBookings.length,
    });
    sendJson(res, 200, payload);
    return;
  }

  if (url.pathname === "/api/dashboard/today" && req.method === "GET") {
    const payload = buildDashboard(5);
    sendJson(res, 200, payload.today);
    return;
  }

  if (url.pathname === "/api/bookings/latest" && req.method === "GET") {
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "5", 10);
    const payload = buildDashboard(Number.isNaN(limit) ? 5 : Math.min(200, Math.max(1, limit)));
    sendJson(res, 200, {
      items: payload.latestBookings,
      total: payload.total,
    });
    return;
  }

  if (url.pathname === "/api/bookings/export" && req.method === "GET") {
    const config = loadConfig();
    const exportPath = normalizeConfigPath(config);
    ensureStorageFile(exportPath);
    sendText(res, 200, fs.readFileSync(exportPath, "utf8"), "text/csv; charset=utf-8");
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "POST") {
    parseJsonBody(req)
      .then((payload) => {
        logStep("submit.body", {
          value: payload?.value ?? null,
          entryType: payload?.entryType ?? null,
          descriptionLength: String(payload?.description ?? "").trim().length,
        });
        const inserted = createManualBooking(payload);
        sendJson(res, 201, inserted);
      })
      .catch((error) => {
        logStep("submit.failed", {
          error: error instanceof Error ? error.message : "Invalid payload",
        });
        sendJson(res, 400, {
          error: error instanceof Error ? error.message : "Invalid payload",
        });
      });
    return;
  }

  if (url.pathname === "/api/bookings/import" && req.method === "POST") {
    parseTextBody(req)
      .then((csvText) => {
        const imported = replaceAllBookings(csvText);
        sendJson(res, 200, imported);
      })
      .catch((error) => {
        logStep("import.failed", {
          error: error instanceof Error ? error.message : "Invalid payload",
        });
        sendJson(res, 400, {
          error: error instanceof Error ? error.message : "Invalid payload",
        });
      });
    return;
  }

  if (url.pathname === "/api/bookings/import-configured" && req.method === "POST") {
    try {
      const config = loadConfig();
      const exportPath = normalizeConfigPath(config);
      ensureStorageFile(exportPath);
      const csvText = fs.readFileSync(exportPath, "utf8");
      const imported = replaceAllBookings(csvText);
      sendJson(res, 200, imported);
    } catch (error) {
      logStep("import.configured.failed", {
        error: error instanceof Error ? error.message : "Invalid payload",
      });
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid payload",
      });
    }
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  logStep("request.not_found", {
    path: url.pathname,
    method: req.method,
  });
  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Bewegungserinnerung API listening on http://127.0.0.1:${PORT}`);
});
