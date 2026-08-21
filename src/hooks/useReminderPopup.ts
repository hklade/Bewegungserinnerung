import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseTimeToMinutes,
  buildReminderSlots as buildReminderSlotsFromSchedule,
  isWeekdayEligible,
} from "../../shared/reminder-schedule.mjs";
import { formatLocalIsoDate } from "../lib/formatting.js";
import { playReminderTone } from "../lib/reminderTone.js";
import type { AppConfig } from "../types.js";

function buildReminderSlots(config: AppConfig): string[] {
  return buildReminderSlotsFromSchedule(config);
}

function getNextReminderCountdown(now: Date, config: AppConfig) {
  if (!config.hourlyReminderEnabled) {
    return null;
  }

  const slots = buildReminderSlots(config);
  if (slots.length === 0) {
    return null;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();
  const dayOffsetStart =
    config.weekdaysOnly && currentDay >= 5 ? 7 - currentDay : 0;

  for (
    let dayOffset = dayOffsetStart;
    dayOffset < dayOffsetStart + 8;
    dayOffset += 1
  ) {
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
        dayOffset * 1440 +
        (dayOffset === 0
          ? slotMinutes - currentMinutes
          : 1440 - currentMinutes + slotMinutes);
      return totalMinutes;
    }
  }

  const firstSlot = parseTimeToMinutes(slots[0]);
  if (firstSlot === null) {
    return null;
  }

  return (1440 - currentMinutes + firstSlot) % 1440 || 1440;
}

function getCurrentReminderSlot(now: Date, config: AppConfig) {
  if (!config.hourlyReminderEnabled) {
    return null;
  }

  if (!isWeekdayEligible(now, config.weekdaysOnly)) {
    return null;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    buildReminderSlots(config).find((slot) => {
      const slotMinutes = parseTimeToMinutes(slot);
      return slotMinutes !== null && slotMinutes === currentMinutes;
    }) ?? null
  );
}

export function useReminderPopup(options: {
  now: Date;
  currentConfig: AppConfig;
  dashboardState: "loading" | "ready" | "error";
}) {
  const { now, currentConfig, dashboardState } = options;
  const [reminderPopup, setReminderPopup] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const reminderPopupTimerRef = useRef<number | null>(null);
  const lastAutoReminderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentConfig.hourlyReminderEnabled || dashboardState !== "ready") {
      setReminderPopup(null);
      return;
    }

    const triggerReminderCheck = async () => {
      const currentNow = new Date();
      const reminderSlot = getCurrentReminderSlot(currentNow, currentConfig);
      if (!reminderSlot) {
        return;
      }

      const reminderKey = `${formatLocalIsoDate(currentNow)}-${reminderSlot}`;
      if (lastAutoReminderRef.current === reminderKey) {
        return;
      }

      lastAutoReminderRef.current = reminderKey;

      const popup =
        currentConfig.showReminderDialog
          ? {
              title: "Bewegungserinnerung",
              message: `Erinnerung um ${reminderSlot}: Zeit für einen kurzen Neustart.`,
            }
          : {
              title: "Ton abgespielt",
              message: `Erinnerung um ${reminderSlot} ausgelöst.`,
            };

      setReminderPopup(popup);
      if (reminderPopupTimerRef.current !== null) {
        window.clearTimeout(reminderPopupTimerRef.current);
      }
      reminderPopupTimerRef.current = window.setTimeout(() => {
        setReminderPopup(null);
      }, 4500);

      if (currentConfig.reminderToneEnabled) {
        await playReminderTone();
      }
    };

    void triggerReminderCheck();
    const interval = window.setInterval(() => {
      void triggerReminderCheck();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      if (reminderPopupTimerRef.current !== null) {
        window.clearTimeout(reminderPopupTimerRef.current);
        reminderPopupTimerRef.current = null;
      }
    };
  }, [currentConfig, dashboardState]);

  const nextReminderCountdown = useMemo(
    () => getNextReminderCountdown(now, currentConfig),
    [currentConfig, now],
  );
  const countdownLabel =
    nextReminderCountdown === null ? "aus" : `${nextReminderCountdown} Min`;

  return { reminderPopup, countdownLabel };
}
