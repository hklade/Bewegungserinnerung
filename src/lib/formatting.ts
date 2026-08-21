import { weekdayNames } from "../constants.js";
import type { ActivityItem } from "../types.js";

export function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

export function normalizeDateKey(value: string) {
  if (!value) {
    return "";
  }

  if (value.includes("-")) {
    const [datePart] = value.split("T");
    return datePart ?? value;
  }

  if (value.includes(".")) {
    const [day = "", month = "", year = ""] = value.split(".");
    if (day && month && year) {
      return `${year.padStart(4, "20")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatLocalIsoDate(parsed);
  }

  return value;
}

export function formatCalendarDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function formatCurrentDay(date: Date) {
  const weekday = weekdayNames[getWeekdayIndex(date)];
  return `${weekday}, ${formatCalendarDate(date)}`;
}

export function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDayLabel(dateIso: string) {
  const weekday = weekdayNames[getWeekdayIndex(new Date(`${dateIso}T12:00:00`))];
  return `${weekday}, ${formatDate(dateIso)}`;
}

export function formatValueLabel(value: number | null) {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function toneClassByValue(value: number | null) {
  if (value === null) {
    return "red";
  }

  if (value >= 4) return "green";
  if (value >= 3) return "blue";
  if (value >= 2) return "orange";
  if (value >= 1) return "ochre";
  return "red";
}

export function getTypeLabel(entry: ActivityItem) {
  if (entry.isAdditionalBreak) {
    return "Zusatz";
  }

  if (entry.entryType === "planned_break_response") {
    return "Geplant";
  }

  if (entry.value === null) {
    return "Offen";
  }

  return "Eintrag";
}
