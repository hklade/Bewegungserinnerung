import { normalizeTime, parseTimeToMinutes, formatMinutesToTime, isWeekdayEligible } from '../../shared/reminder-schedule.mjs';

const VIENNA_TIME_ZONE = 'Europe/Vienna';

export { normalizeTime, parseTimeToMinutes, formatMinutesToTime };

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
  return !isWeekdayEligible(dateIso, true);
}
