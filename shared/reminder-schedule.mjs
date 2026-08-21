const FALLBACK_SLOTS = ['07:55', '08:55', '09:55', '10:55', '11:55', '12:55', '13:55', '14:55', '15:55', '16:55'];

export function normalizeTime(value) {
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

  const hours = String(Number(match[1])).padStart(2, '0');
  const minutes = String(Number(match[2])).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTimeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildReminderSlotsFromStart(startTime) {
  const startMinutes = parseTimeToMinutes(startTime);

  if (startMinutes === null) {
    return [...FALLBACK_SLOTS];
  }

  const slots = [];
  for (let minutes = startMinutes; minutes <= 16 * 60; minutes += 60) {
    slots.push(formatMinutesToTime(minutes));
  }

  return slots.length > 0 ? slots : [...FALLBACK_SLOTS];
}

export function buildReminderSlots(config) {
  const startMinutes = parseTimeToMinutes(config.reminderStartTime);
  const endMinutes = parseTimeToMinutes(config.reminderEndTime);

  if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
    return buildReminderSlotsFromStart(config.reminderStartTime);
  }

  const slots = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
    slots.push(formatMinutesToTime(minutes));
  }

  return slots.length > 0 ? slots : buildReminderSlotsFromStart(config.reminderStartTime);
}

export function isWeekdayEligible(dateLike, weekdaysOnly) {
  if (!weekdaysOnly) {
    return true;
  }

  const date = dateLike instanceof Date ? dateLike : new Date(`${dateLike}T12:00:00`);
  const day = date.getDay();
  return day !== 0 && day !== 6;
}
