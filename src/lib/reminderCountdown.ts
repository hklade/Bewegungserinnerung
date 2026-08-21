import {
  parseTimeToMinutes,
  buildReminderSlots as buildReminderSlotsFromSchedule,
  isWeekdayEligible,
} from "../../shared/reminder-schedule.mjs";
import type { AppConfig } from "../types.js";

export function getCurrentReminderSlot(now: Date, config: AppConfig) {
  if (!config.hourlyReminderEnabled) {
    return null;
  }

  if (!isWeekdayEligible(now, config.weekdaysOnly)) {
    return null;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    buildReminderSlotsFromSchedule(config).find((slot) => {
      const slotMinutes = parseTimeToMinutes(slot);
      return slotMinutes !== null && slotMinutes === currentMinutes;
    }) ?? null
  );
}

export function getNextReminderCountdown(now: Date, config: AppConfig) {
  if (!config.hourlyReminderEnabled) {
    return null;
  }

  const slots = buildReminderSlotsFromSchedule(config);
  if (slots.length === 0) {
    return null;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const targetDay = new Date(now);
    targetDay.setDate(now.getDate() + dayOffset);

    if (!isWeekdayEligible(targetDay, config.weekdaysOnly)) {
      continue;
    }

    for (const slot of slots) {
      const slotMinutes = parseTimeToMinutes(slot);
      if (slotMinutes === null) {
        continue;
      }

      if (dayOffset === 0 && slotMinutes <= currentMinutes) {
        continue;
      }

      const totalMinutes =
        dayOffset === 0
          ? slotMinutes - currentMinutes
          : 1440 - currentMinutes + (dayOffset - 1) * 1440 + slotMinutes;
      return totalMinutes;
    }
  }

  const firstSlot = parseTimeToMinutes(slots[0]);
  if (firstSlot === null) {
    return null;
  }

  return (1440 - currentMinutes + firstSlot) % 1440 || 1440;
}
