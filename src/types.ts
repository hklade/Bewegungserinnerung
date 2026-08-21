export type AnalysisKey = "day" | "week";

export type AppConfig = {
  hourlyReminderEnabled: boolean;
  showReminderDialog: boolean;
  reminderStartTime: string;
  reminderEndTime: string;
  weekdaysOnly: boolean;
  exportPath: string;
  reminderToneEnabled: boolean;
  dailyDrinkLiters: number;
};

export type ActivityItem = {
  id: number;
  date: string;
  time: string;
  plannedTime: string;
  delayMinutes: number;
  value: number | null;
  description: string;
  note: string;
  entryType: string;
  isAdditionalBreak: boolean;
};

export type DaySummary = {
  total: number;
  answered: number;
  unanswered: number;
  planned: number;
  additional: number;
  averageValue: number | null;
  averageDelayMinutes: number | null;
};

export type HeatmapCell = {
  date: string;
  slot: string;
  value: number | null;
  count: number;
};

export type HeatmapRow = {
  slot: string;
  cells: HeatmapCell[];
};

export type HeatmapColumn = {
  date: string;
  label: string;
  shortLabel: string;
};

export type HeatmapData = {
  title: string;
  subtitle: string;
  note: string;
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
};

export type DashboardApi = {
  config: AppConfig;
  total: number;
  hydration?: {
    todayMl: number;
    history: Array<{
      date: string;
      value: number;
    }>;
  };
  today: {
    todayIso: string;
    summary: {
      total: number;
      answered: number;
      unanswered: number;
      planned: number;
      additional: number;
      averageValue: number | null;
      averageDelayMinutes: number | null;
    };
    distribution: Array<{
      value: 0 | 1 | 2 | 3 | 4;
      count: number;
    }>;
    reminderHeadline: string;
    reminderTime: string;
  };
  latestBookings: ActivityItem[];
  activities: ActivityItem[];
  currentWeek: Array<{
    day: string;
    date: string;
    avg: number | null;
    note: string;
    active: boolean;
  }>;
  recentWeeks: Array<{
    label: string;
    avg: number | null;
    note: string;
  }>;
  heatmap: HeatmapData;
};

export type DayOption = {
  date: string;
  label: string;
  shortLabel: string;
};

export type HourlyBar = {
  hour: string;
  label: string;
  count: number;
  averageValue: number | null;
  tone: "red" | "ochre" | "orange" | "blue" | "green";
  tooltip: string;
};
