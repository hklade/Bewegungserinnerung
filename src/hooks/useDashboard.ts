import { useEffect, useState } from "react";
import { fetchDashboard } from "../api/dashboardApi.js";
import type { AppConfig, DashboardApi } from "../types.js";

export function useDashboard() {
  const [now, setNow] = useState(() => new Date());
  const [dashboard, setDashboard] = useState<DashboardApi | null>(null);
  const [dashboardState, setDashboardState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [configForm, setConfigForm] = useState<AppConfig | null>(null);
  const [drinkProgressMl, setDrinkProgressMl] = useState(0);
  const [selectedDayIso, setSelectedDayIso] = useState("");

  async function refreshDashboard(activeRef = { active: true }) {
    try {
      const payload = await fetchDashboard(200);
      if (!activeRef.active) {
        return;
      }

      setDashboard(payload);
      setDashboardState("ready");
      setConfigForm((current) => current ?? payload.config);
      setDrinkProgressMl(payload.hydration?.todayMl ?? 0);
      setSelectedDayIso((current) => {
        const availableDays = [
          ...new Set([
            payload.today.todayIso,
            ...payload.activities.map((item) => item.date),
          ]),
        ]
          .sort((left, right) => right.localeCompare(left))
          .slice(0, 14);

        if (current && availableDays.includes(current)) {
          return current;
        }

        return availableDays[0] ?? payload.today.todayIso;
      });
    } catch {
      if (!activeRef.active) {
        return;
      }

      setDashboardState("error");
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const activeRef = { active: true };
    void refreshDashboard(activeRef);
    const interval = window.setInterval(() => {
      void refreshDashboard(activeRef);
    }, 15_000);

    return () => {
      activeRef.active = false;
      window.clearInterval(interval);
    };
  }, []);

  return {
    now,
    dashboard,
    dashboardState,
    setDashboardState,
    configForm,
    setConfigForm,
    drinkProgressMl,
    setDrinkProgressMl,
    selectedDayIso,
    setSelectedDayIso,
    refreshDashboard,
  };
}
