import { useEffect, useMemo, useRef, useState } from "react";
import { formatLocalIsoDate } from "../lib/formatting.js";
import { playReminderTone } from "../lib/reminderTone.js";
import {
  getCurrentReminderSlot,
  getNextReminderCountdown,
} from "../lib/reminderCountdown.js";
import type { AppConfig } from "../types.js";

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
