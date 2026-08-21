import { formatValueLabel, toneClassByValue } from "./formatting.js";
import type { ActivityItem, DaySummary, HourlyBar } from "../types.js";

export function isMissedReminderEntry(entry: ActivityItem) {
  return (
    entry.entryType === "unanswered" ||
    (entry.entryType === "planned_break_response" &&
      entry.value === 0 &&
      entry.description === "keine Aktivität eingetragen" &&
      entry.note === "automatisch ergänzt")
  );
}

export function getEntryTime(entry: ActivityItem) {
  return (
    entry.time ||
    entry.plannedTime ||
    (entry as ActivityItem & { responseTime?: string }).responseTime ||
    (entry as ActivityItem & { reminderTime?: string }).reminderTime ||
    "--:--"
  );
}

export function getEntryHour(entry: ActivityItem) {
  const [hour = "00"] = getEntryTime(entry).split(":");
  const numericHour = Number.parseInt(hour, 10);
  if (!Number.isFinite(numericHour)) {
    return "00:00";
  }

  return `${String(Math.max(0, Math.min(23, numericHour))).padStart(2, "0")}:00`;
}

export function buildHourlyBars(entries: ActivityItem[]) {
  const groups = new Map<string, ActivityItem[]>();

  [...entries]
    .filter((entry) => entry.value !== null || entry.entryType === "unanswered")
    .sort((left, right) => getEntryTime(left).localeCompare(getEntryTime(right)))
    .forEach((entry) => {
      const hour = getEntryHour(entry);
      const current = groups.get(hour) ?? [];
      current.push(entry);
      groups.set(hour, current);
    });

  return [...groups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([hour, items]) => {
      const values = items.map((item) => Number(item.value ?? 0));
      const averageValue =
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;
      const maxValue = values.length > 0 ? Math.max(...values) : 0;
      const tooltip = items
        .map((item) => {
          const entryTime = getEntryTime(item);
          const entryValue =
            item.value === null ? "offen" : `${formatValueLabel(item.value)}/4`;
          return `${entryTime} · ${entryValue} · ${item.description}`;
        })
        .join("\n");

      return {
        hour,
        label: hour,
        count: items.length,
        averageValue,
        tone: toneClassByValue(maxValue),
        tooltip,
      } satisfies HourlyBar;
    });
}

export function buildDaySummary(entries: ActivityItem[]): DaySummary {
  const answeredEntries = entries.filter((entry) => entry.value !== null);
  const delayEntries = entries.filter((entry) =>
    Number.isFinite(entry.delayMinutes),
  );
  const missedReminderEntries = entries.filter((entry) =>
    isMissedReminderEntry(entry),
  );

  return {
    total: entries.length,
    answered: answeredEntries.length,
    unanswered: missedReminderEntries.length,
    planned: entries.filter(
      (entry) => entry.entryType === "planned_break_response",
    ).length,
    additional: entries.filter((entry) => entry.isAdditionalBreak).length,
    averageValue:
      answeredEntries.length > 0
        ? answeredEntries.reduce((sum, entry) => sum + Number(entry.value), 0) /
          answeredEntries.length
        : null,
    averageDelayMinutes:
      delayEntries.length > 0
        ? delayEntries.reduce(
            (sum, entry) => sum + Number(entry.delayMinutes || 0),
            0,
          ) / delayEntries.length
        : null,
  };
}
