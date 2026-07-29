import { buildReminderSlots, loadConfig, normalizeConfigPath, SERVER_PATHS } from './config.mjs';

/**
 * Business-Logik für Dashboards, Erinnerungen und Booking-Workflows.
 * Zusammenfasst die Funktionen zur Generierung von Einträgen, Statistiken und Import-/Export-Operationen.
 */
import {
  ensureHydrationStorageFile,
  ensureStorageFile,
  normalizeEntry,
  readEntries,
  readHydrationEntries,
  writeEntries,
  writeHydrationEntries,
} from './storage.mjs';
import { getViennaIsoDate, getViennaTime, getViennaWeekday, normalizeTime, parseTimeToMinutes, isWeekend } from './utils/time.mjs';
import { parseCsvText, parseInteger } from './utils/parsing.mjs';

export function isHydrationEntry(entry) {
  return entry.entry_type === 'hydration';
}

function getEntrySlot(entry) {
  return normalizeTime(entry.response_time || entry.reminder_time);
}

function isAutomaticBackfillEntry(entry) {
  return (
    entry.entry_type === 'planned_break_response' &&
    entry.value === 0 &&
    entry.description === 'keine Aktivität eingetragen' &&
    entry.note === 'automatisch ergänzt'
  );
}

export function buildHydrationSummary(now = new Date()) {
  const hydrationEntries = readHydrationEntries();
  const todayIso = getViennaIsoDate(now);
  const perDay = new Map();

  for (const entry of hydrationEntries) {
    if (!entry.date) {
      continue;
    }

    const entryDate = entry.date;
    const entryDay = entryDate.includes('T') ? getViennaIsoDate(new Date(entryDate)) : entryDate;
    const currentValue = Number(entry.hydrationMl) || 0;
    const previousValue = perDay.get(entryDay) ?? 0;
    perDay.set(entryDay, previousValue + currentValue);
  }

  const history = [...perDay.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .slice(0, 14)
    .map(([date, value]) => ({
      date,
      value,
    }));

  return {
    todayMl: perDay.get(todayIso) ?? 0,
    history,
  };
}

export function buildAutomaticReminderEntries(entries, config, now = new Date()) {
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
    .filter((slot) => !entries.some((entry) => entry.date === date && entry.entry_type === 'unanswered' && getEntrySlot(entry) === slot))
    .map((slot) => ({
      id: null,
      date,
      weekday,
      reminder_time: slot,
      response_time: null,
      delay_minutes: null,
      value: null,
      description: 'keine Rückmeldung',
      duration_minutes: null,
      is_additional_break: false,
      entry_type: 'unanswered',
      note: 'automatisch ergänzt',
      created_at: now.toISOString(),
    }));
}

export function buildMissedActivityEntries(entries, config, now = new Date()) {
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
      description: 'keine Aktivität eingetragen',
      duration_minutes: null,
      is_additional_break: false,
      entry_type: 'planned_break_response',
      note: 'automatisch ergänzt',
      created_at: now.toISOString(),
    }));
}

export function ensureAutomaticReminderEntries(filePath, config, now = new Date()) {
  const entries = readEntries(filePath);
  const automaticReminderEntries = buildAutomaticReminderEntries(entries, config, now);

  if (automaticReminderEntries.length === 0) {
    return entries;
  }

  return writeEntries(filePath, [...automaticReminderEntries, ...entries]);
}

export function buildLatestBookings(entries, limit = 5) {
  return entries
    .filter((entry) => entry.entry_type !== 'unanswered' && !isHydrationEntry(entry))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      time: entry.response_time || entry.reminder_time || '--:--',
      value: entry.value,
      description: entry.description || 'Eintrag',
      note:
        entry.entry_type === 'additional_break'
          ? 'Zusatzbewegung'
          : entry.value === null
            ? 'keine Rückmeldung'
            : entry.note || 'erfasst',
    }));
}

export function buildTodayStats(entries, config, now = new Date()) {
  const todayIso = getViennaIsoDate(now);
  const todayEntries = entries.filter((entry) => entry.date === todayIso && !isHydrationEntry(entry));
  const reminderSlots = buildReminderSlots(config);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lastActiveSlot = [...reminderSlots]
    .reverse()
    .find((slot) => parseTimeToMinutes(slot) !== null && parseTimeToMinutes(slot) <= currentMinutes);
  const activeReminderTime = lastActiveSlot ?? reminderSlots[0] ?? '--:--';
  const slotAlreadyFilled = todayEntries.some((entry) => {
    const entryTime = normalizeTime(entry.response_time || entry.reminder_time);
    return entryTime === activeReminderTime && entry.value !== null;
  });
  const missedReminderEntries = todayEntries.filter(
    (entry) =>
      entry.entry_type === 'unanswered' ||
      (entry.entry_type === 'planned_break_response' &&
        entry.value === 0 &&
        entry.description === 'keine Aktivität eingetragen' &&
        entry.note === 'automatisch ergänzt'),
  );

  return {
    todayIso,
    summary: {
      total: todayEntries.length,
      answered: todayEntries.filter((entry) => entry.value !== null).length,
      unanswered: missedReminderEntries.length,
      planned: todayEntries.filter((entry) => entry.entry_type === 'planned_break_response').length,
      additional: todayEntries.filter((entry) => entry.entry_type === 'additional_break').length,
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
        ? 'deaktiviert'
        : config.weekdaysOnly && isWeekend(todayIso)
          ? 'Wochenende'
          : slotAlreadyFilled
            ? `${activeReminderTime} · Zusatzbewegung`
            : activeReminderTime,
    reminderTime: activeReminderTime,
  };
}

export function buildCurrentWeek(entries, now = new Date()) {
  const todayIso = getViennaIsoDate(now);
  const currentDayIndex = (now.getDay() + 6) % 7;
  const mondayDate = new Date(`${todayIso}T12:00:00`);
  mondayDate.setDate(mondayDate.getDate() - currentDayIndex);

  return Array.from({ length: currentDayIndex + 1 }, (_, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    const iso = getViennaIsoDate(date);
    const dayEntries = entries.filter((entry) => entry.date === iso && entry.value !== null && !isHydrationEntry(entry));
    const avg = dayEntries.length > 0 ? dayEntries.reduce((sum, entry) => sum + Number(entry.value), 0) / dayEntries.length : null;

    return {
      day: getViennaWeekday(date),
      date: iso,
      avg,
      note:
        dayEntries.length > 0
          ? `${dayEntries.length} Einträge`
          : 'Noch keine Daten',
      active: iso === todayIso,
    };
  });
}

function getWeekStart(dateIso) {
  const date = new Date(`${dateIso}T12:00:00`);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return getViennaIsoDate(date);
}

export function buildRecentWeeks(entries, now = new Date()) {
  const groups = new Map();

  for (const entry of entries) {
    if (entry.value === null || isHydrationEntry(entry)) {
      continue;
    }

    const weekStart = getWeekStart(entry.date);
    const bucket = groups.get(weekStart) ?? [];
    bucket.push(entry);
    groups.set(weekStart, bucket);
  }

  const currentWeekStart = getWeekStart(getViennaIsoDate(now));
  const labels = [
    { offset: 0, label: 'Diese Woche' },
    { offset: 7, label: 'Letzte Woche' },
    { offset: 14, label: 'Vorletzte Woche' },
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
          : 'Noch wenig Daten vorhanden',
    };
  });
}

export function buildActivityRows(entries, limit = 200) {
  return entries
    .filter((entry) => entry.entry_type !== 'unanswered' && !isHydrationEntry(entry))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      time: entry.response_time || entry.reminder_time || '--:--',
      plannedTime: entry.reminder_time || '--:--',
      delayMinutes: entry.delay_minutes ?? 0,
      value: entry.value,
      description: entry.description || 'Eintrag',
      note: entry.note || (entry.value === null ? 'keine Rückmeldung' : 'erfasst'),
      entryType: entry.entry_type,
      isAdditionalBreak: Boolean(entry.is_additional_break),
    }));
}

export function buildHeatmap(entries, config, now = new Date()) {
  const activeDatesDescending = [
    ...new Set(entries.filter((entry) => entry.value !== null && !isHydrationEntry(entry)).map((entry) => entry.date)),
  ].sort((left, right) => right.localeCompare(left));

  const columns = activeDatesDescending.slice(0, 7).sort((left, right) => left.localeCompare(right)).map((date) => ({
    date,
    label: getViennaWeekday(new Date(`${date}T12:00:00`)).slice(0, 2),
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
        return entryDate === column.date && entryTime && entryTime.slice(0, 2) === slotKey.slice(0, 2) && entry.value !== null && !isHydrationEntry(entry);
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
    title: 'Letzte 7 eingetragene Tage',
    subtitle: `${columns.length} aktive Tage`,
    columns,
    rows,
    note: 'Grüne Kacheln stehen für geplante oder zusätzliche Einheiten. Je kräftiger das Grün, desto höher die Bewertung.',
  };
}

function formatMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildDashboard(limit = 5) {
  const config = loadConfig();
  const exportPath = normalizeConfigPath(config);
  ensureStorageFile(exportPath);
  const entries = ensureAutomaticReminderEntries(exportPath, config);
  const movementEntries = entries.filter((entry) => !isHydrationEntry(entry));
  const now = new Date();

  return {
    config: {
      ...config,
      exportPath,
    },
    total: movementEntries.length,
    hydration: buildHydrationSummary(now),
    today: buildTodayStats(movementEntries, config, now),
    latestBookings: buildLatestBookings(movementEntries, limit),
    activities: buildActivityRows(movementEntries, 200),
    currentWeek: buildCurrentWeek(movementEntries, now),
    recentWeeks: buildRecentWeeks(movementEntries, now),
    heatmap: buildHeatmap(movementEntries, config, now),
  };
}

export function createHydrationBooking(payload) {
  const config = loadConfig();
  if (payload?.entryType === 'hydration') {
    const now = new Date();
    const date = now.toISOString();
    const hydrationMl = Math.max(0, parseInteger(payload?.value) ?? 0);
    const hydrationPath = SERVER_PATHS.hydrationExportPath;
    ensureHydrationStorageFile(hydrationPath);
    const existingEntries = readHydrationEntries(hydrationPath);
    const updatedEntries = writeHydrationEntries(hydrationPath, [
      ...existingEntries,
      {
        date,
        hydrationMl,
      },
    ]);

    return {
      item: null,
      total: updatedEntries.length,
    };
  }

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
  const isAdditionalBreak = payload?.entryType === 'additional_break' || existingForSlot;
  const value = parseInteger(payload?.value);
  const description = String(payload?.description ?? payload?.note ?? '').trim() || 'Eintrag';
  const note = String(payload?.note ?? '').trim() || description;
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
    entry_type: isAdditionalBreak ? 'additional_break' : 'planned_break_response',
    note,
    created_at: now.toISOString(),
  };
  const generatedEntries = missedActivityEntries.map((entry) => ({
    ...entry,
    id: nextEntryId++,
  }));

  const updatedEntries = writeEntries(exportPath, [record, ...generatedEntries, ...entries]);
  return {
    item: buildLatestBookings(updatedEntries, 1)[0] ?? null,
    total: updatedEntries.length,
  };
}

export function replaceAllBookings(csvText) {
  const config = loadConfig();
  const exportPath = normalizeConfigPath(config);
  ensureStorageFile(exportPath);
  const { rows } = parseCsvText(csvText);
  const normalizedRows = rows.map((record, index) => normalizeEntry(record, index + 1));
  const updatedEntries = writeEntries(exportPath, normalizedRows);

  return {
    total: updatedEntries.length,
  };
}
