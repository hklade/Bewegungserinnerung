const VIENNA_TIME_ZONE = 'Europe/Vienna';

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

export function getViennaIsoDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VIENNA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getViennaTime(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VIENNA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getViennaNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIENNA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
}

export function getViennaWeekday(date = new Date()) {
  return new Intl.DateTimeFormat('de-AT', {
    timeZone: VIENNA_TIME_ZONE,
    weekday: 'long',
  }).format(date);
}

export function getLocalDateFromIso(dateIso) {
  return new Date(`${dateIso}T12:00:00`);
}

export function getWeekdayIndexFromIso(dateIso) {
  return (getLocalDateFromIso(dateIso).getDay() + 6) % 7;
}

export function isWeekend(dateIso) {
  const weekdayIndex = getWeekdayIndexFromIso(dateIso);
  return weekdayIndex === 5 || weekdayIndex === 6;
}
