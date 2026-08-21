import { logHydration } from "../api/dashboardApi.js";

export function useHydrationTracker(options: {
  drinkProgressMl: number;
  setDrinkProgressMl: (value: number) => void;
  dailyDrinkLiters: number;
  refreshDashboard: () => Promise<void>;
  setDashboardState: (state: "loading" | "ready" | "error") => void;
}) {
  const {
    drinkProgressMl,
    setDrinkProgressMl,
    dailyDrinkLiters,
    refreshDashboard,
    setDashboardState,
  } = options;

  const drinkGoalMl = Math.max(250, Math.round(dailyDrinkLiters * 1000));
  const drinkOverflowMl = Math.max(0, drinkProgressMl - drinkGoalMl);
  const drinkStepCount = Math.max(1, Math.ceil(drinkGoalMl / 250));
  const drinkOverflowStepCount = Math.max(
    1,
    Math.ceil(Math.max(250, drinkOverflowMl) / 250),
  );
  const drinkProgressBlocks = Math.max(
    0,
    Math.min(drinkStepCount, Math.round(drinkProgressMl / 250)),
  );
  const drinkOverflowBlocks = Math.max(0, Math.round(drinkOverflowMl / 250));

  async function saveHydrationProgress(nextMl: number) {
    const previousMl = drinkProgressMl;
    setDrinkProgressMl(nextMl);

    try {
      await logHydration(nextMl);
      await refreshDashboard();
    } catch {
      setDrinkProgressMl(previousMl);
      setDashboardState("error");
    }
  }

  return {
    drinkGoalMl,
    drinkOverflowMl,
    drinkStepCount,
    drinkOverflowStepCount,
    drinkProgressBlocks,
    drinkOverflowBlocks,
    saveHydrationProgress,
  };
}
