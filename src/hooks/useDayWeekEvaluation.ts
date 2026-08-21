import { useEffect, useMemo, useState } from "react";
import { formatDate, normalizeDateKey, getDayLabel } from "../lib/formatting.js";
import { buildDaySummary, buildHourlyBars } from "../lib/activity.js";
import type { ActivityItem, AnalysisKey, DayOption } from "../types.js";

export function useDayWeekEvaluation(options: {
  activities: ActivityItem[];
  todayIso: string | undefined;
  selectedDayIso: string;
  setSelectedDayIso: (value: string) => void;
}) {
  const { activities, todayIso, selectedDayIso, setSelectedDayIso } = options;

  const [evaluationTab, setEvaluationTab] = useState<AnalysisKey>("day");
  const [showAllActivities, setShowAllActivities] = useState(false);

  const latestActivities = showAllActivities
    ? activities
    : activities.slice(0, 5);
  const hasMoreActivities = activities.length > latestActivities.length;

  const availableDayOptions = useMemo<DayOption[]>(() => {
    const dates = new Set<string>();
    if (todayIso) {
      dates.add(normalizeDateKey(todayIso));
    }

    activities.forEach((item) => {
      dates.add(normalizeDateKey(item.date));
    });

    return [...dates]
      .sort((left, right) => right.localeCompare(left))
      .slice(0, 14)
      .map((date) => ({
        date,
        label: getDayLabel(date),
        shortLabel: formatDate(date),
      }));
  }, [activities, todayIso]);

  const activeDayIso = selectedDayIso || todayIso || "";
  const selectedDayEntries = useMemo(
    () =>
      activities.filter(
        (item) => normalizeDateKey(item.date) === normalizeDateKey(activeDayIso),
      ),
    [activities, activeDayIso],
  );
  const selectedDaySummary = useMemo(
    () => buildDaySummary(selectedDayEntries),
    [selectedDayEntries],
  );
  const selectedDayHourlyBars = useMemo(
    () => buildHourlyBars(selectedDayEntries),
    [selectedDayEntries],
  );

  useEffect(() => {
    if (availableDayOptions.length === 0) {
      return;
    }

    if (availableDayOptions.some((item) => item.date === selectedDayIso)) {
      return;
    }

    setSelectedDayIso(availableDayOptions[0].date);
  }, [availableDayOptions, selectedDayIso]);

  return {
    evaluationTab,
    setEvaluationTab,
    showAllActivities,
    setShowAllActivities,
    latestActivities,
    hasMoreActivities,
    availableDayOptions,
    activeDayIso,
    selectedDaySummary,
    selectedDayHourlyBars,
  };
}
