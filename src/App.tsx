import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type TabKey = "dashboard" | "reminder" | "day" | "week";
type AnalysisKey = "day" | "week";

type AppConfig = {
  hourlyReminderEnabled: boolean;
  showReminderDialog: boolean;
  reminderStartTime: string;
  reminderEndTime: string;
  weekdaysOnly: boolean;
  exportPath: string;
  reminderToneEnabled: boolean;
};

type ActivityItem = {
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

type DaySummary = {
  total: number;
  answered: number;
  unanswered: number;
  planned: number;
  additional: number;
  averageValue: number | null;
  averageDelayMinutes: number | null;
};

type HeatmapCell = {
  date: string;
  slot: string;
  value: number | null;
  count: number;
};

type HeatmapRow = {
  slot: string;
  cells: HeatmapCell[];
};

type HeatmapColumn = {
  date: string;
  label: string;
  shortLabel: string;
};

type HeatmapData = {
  title: string;
  subtitle: string;
  note: string;
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
};

type DashboardApi = {
  config: AppConfig;
  total: number;
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

type TodayDistributionItem = {
  value: 0 | 1 | 2 | 3 | 4;
  count: number;
  label: string;
  tone: "red" | "ochre" | "orange" | "blue" | "green";
  width: number;
};

type DayOption = {
  date: string;
  label: string;
  shortLabel: string;
};

type HourlyBar = {
  hour: string;
  label: string;
  count: number;
  averageValue: number | null;
  tone: "red" | "ochre" | "orange" | "blue" | "green";
  tooltip: string;
};

const apiBase = "/api";
const weekdayNames = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;
const defaultConfig: AppConfig = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: "07:55",
  reminderEndTime: "16:55",
  weekdaysOnly: true,
  exportPath:
    "C:\\Users\\HeidiKlade\\Documents\\Codex\\Bewegungserinnerung\\export\\Bewegungsdaten.csv",
  reminderToneEnabled: true,
};

const scale = [
  { value: 0, title: "Keine Pause", desc: "sitzen geblieben", tone: "red" },
  { value: 1, title: "Mini-Pause", desc: "kurz innegehalten", tone: "ochre" },
  {
    value: 2,
    title: "Leichte Aktivität",
    desc: "Bürotätigkeit",
    tone: "orange",
  },
  { value: 3, title: "Bewegung", desc: "gehen / dehnen", tone: "blue" },
  {
    value: 4,
    title: "Aktive Pause",
    desc: "Spaziergang / Übungen",
    tone: "green",
  },
] as const;

const toneByValue = {
  0: "red",
  1: "ochre",
  2: "orange",
  3: "blue",
  4: "green",
} as const;

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function normalizeDateKey(value: string) {
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

function formatCalendarDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function formatCurrentDay(date: Date) {
  const weekday = weekdayNames[getWeekdayIndex(date)];
  return `${weekday}, ${formatCalendarDate(date)}`;
}

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildReminderSlots(config: AppConfig) {
  const start = parseTimeToMinutes(config.reminderStartTime);
  const end = parseTimeToMinutes(config.reminderEndTime);

  if (start === null || end === null || end < start) {
    return [
      "07:55",
      "08:55",
      "09:55",
      "10:55",
      "11:55",
      "12:55",
      "13:55",
      "14:55",
      "15:55",
      "16:55",
    ];
  }

  const slots: string[] = [];
  for (let minutes = start; minutes <= end; minutes += 60) {
    slots.push(formatMinutesToTime(minutes));
  }

  return slots;
}

function getNextReminderTime(now: Date, config: AppConfig) {
  if (!config.hourlyReminderEnabled) {
    return "aus";
  }

  if (config.weekdaysOnly && (now.getDay() === 0 || now.getDay() === 6)) {
    return "aus";
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const slot of buildReminderSlots(config)) {
    const slotMinutes = parseTimeToMinutes(slot);
    if (slotMinutes !== null && slotMinutes > currentMinutes) {
      return slot;
    }
  }

  const slots = buildReminderSlots(config);
  return slots[0] ?? "--:--";
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

    if (
      config.weekdaysOnly &&
      (targetDay.getDay() === 0 || targetDay.getDay() === 6)
    ) {
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

  if (config.weekdaysOnly && (now.getDay() === 0 || now.getDay() === 6)) {
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

async function playReminderTone() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Some browsers still require a trusted user gesture; in that case we fall through.
    }
  }

  const master = context.createGain();
  master.connect(context.destination);
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.5, context.currentTime + 0.16);

  const notePlan = [
    { offset: 0.0, frequency: 784, duration: 0.5, type: "sine" as const },
    { offset: 0.6, frequency: 659, duration: 0.5, type: "sine" as const },
    { offset: 1.1, frequency: 988, duration: 1, type: "triangle" as const },
  ];

  notePlan.forEach(({ offset, frequency, duration, type }, index) => {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      context.currentTime + offset,
    );

    oscillator.connect(noteGain);
    noteGain.connect(master);
    noteGain.gain.setValueAtTime(0.0001, context.currentTime + offset);
    noteGain.gain.exponentialRampToValueAtTime(
      index === 2 ? 0.18 : 0.12,
      context.currentTime + offset + 0.045,
    );
    noteGain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + offset + duration,
    );
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + duration + 0.03);
  });

  window.setTimeout(() => void context.close(), 1600);
}

function formatValueLabel(value: number | null) {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toneClassByValue(value: number | null) {
  if (value === null) {
    return "red";
  }

  if (value >= 4) return "green";
  if (value >= 3) return "blue";
  if (value >= 2) return "orange";
  if (value >= 1) return "ochre";
  return "red";
}

function isMissedReminderEntry(entry: ActivityItem) {
  return (
    entry.entryType === "unanswered" ||
    (entry.entryType === "planned_break_response" &&
      entry.value === 0 &&
      entry.description === "keine Aktivität eingetragen" &&
      entry.note === "automatisch ergänzt")
  );
}

function getDayLabel(dateIso: string) {
  const weekday = weekdayNames[getWeekdayIndex(new Date(`${dateIso}T12:00:00`))];
  return `${weekday}, ${formatDate(dateIso)}`;
}

function getEntryTime(entry: ActivityItem) {
  return (
    entry.time ||
    entry.plannedTime ||
    (entry as ActivityItem & { responseTime?: string }).responseTime ||
    (entry as ActivityItem & { reminderTime?: string }).reminderTime ||
    "--:--"
  );
}

function getEntryHour(entry: ActivityItem) {
  const [hour = "00"] = getEntryTime(entry).split(":");
  const numericHour = Number.parseInt(hour, 10);
  if (!Number.isFinite(numericHour)) {
    return "00:00";
  }

  return `${String(Math.max(0, Math.min(23, numericHour))).padStart(2, "0")}:00`;
}

function buildHourlyBars(entries: ActivityItem[]) {
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

function buildDaySummary(entries: ActivityItem[]): DaySummary {
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

function getTypeLabel(entry: ActivityItem) {
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

export default function App() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [analysisTab, setAnalysisTab] = useState<AnalysisKey>("day");
  const [selectedScore, setSelectedScore] = useState<number>(1);
  const [note, setNote] = useState("Mustereintrag");
  const [now, setNow] = useState(() => new Date());
  const [dashboard, setDashboard] = useState<DashboardApi | null>(null);
  const [dashboardState, setDashboardState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [configForm, setConfigForm] = useState<AppConfig | null>(null);
  const [configState, setConfigState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [importState, setImportState] = useState<
    "idle" | "importing" | "error"
  >("idle");
  const [evaluationTab, setEvaluationTab] = useState<AnalysisKey>("day");
  const [selectedDayIso, setSelectedDayIso] = useState("");
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [reminderPopup, setReminderPopup] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const reminderPopupTimerRef = useRef<number | null>(null);
  const lastAutoReminderRef = useRef<string | null>(null);

  async function refreshDashboard(activeRef = { active: true }) {
    try {
      const response = await fetch(`${apiBase}/dashboard?limit=200`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as DashboardApi;
      if (!activeRef.active) {
        return;
      }

      setDashboard(payload);
      setDashboardState("ready");
      setConfigForm((current) => current ?? payload.config);
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

  const currentConfig = configForm ?? dashboard?.config ?? defaultConfig;

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

  const currentDayLabel = useMemo(() => formatCurrentDay(now), [now]);
  const nextReminderTime = useMemo(
    () => getNextReminderTime(now, currentConfig),
    [currentConfig, now],
  );
  const nextReminderCountdown = useMemo(
    () => getNextReminderCountdown(now, currentConfig),
    [currentConfig, now],
  );
  const reminderHeadline = dashboard?.today.reminderHeadline ?? "--:--";
  const reminderTime = dashboard?.today.reminderTime ?? reminderHeadline;
  const bookingTotal = dashboard?.total ?? 0;
  const activities = dashboard?.activities ?? [];
  const latestActivities = showAllActivities
    ? activities
    : activities.slice(0, 5);
  const hasMoreActivities = activities.length > latestActivities.length;
  const availableDayOptions = useMemo<DayOption[]>(() => {
    const dates = new Set<string>();
    if (dashboard?.today.todayIso) {
      dates.add(normalizeDateKey(dashboard.today.todayIso));
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
  }, [activities, dashboard?.today.todayIso]);
  const activeDayIso = selectedDayIso || dashboard?.today.todayIso || "";
  const selectedDayEntries = activities.filter(
    (item) => normalizeDateKey(item.date) === normalizeDateKey(activeDayIso),
  );
  const selectedDayOption =
    availableDayOptions.find((item) => item.date === activeDayIso) ?? null;
  const selectedDaySummary = useMemo(
    () => buildDaySummary(selectedDayEntries),
    [selectedDayEntries],
  );
  const selectedDayHourlyBars = useMemo(
    () => buildHourlyBars(selectedDayEntries),
    [selectedDayEntries],
  );
  const todaySummary = dashboard?.today.summary;
  const apiStatusLabel =
    dashboardState === "ready"
      ? "API bereit"
      : dashboardState === "error"
        ? "API Fehler"
        : "API lädt";
  const summaryLine = `${selectedScore} - ${note || "Kurznotiz"}`;
  const latestSummary = dashboard?.latestBookings[0]
    ? `${dashboard.latestBookings[0].value === null ? "—" : dashboard.latestBookings[0].value} - ${dashboard.latestBookings[0].description}`
    : summaryLine;
  const reminderDialogVisible = currentConfig.showReminderDialog;
  const reminderComposerSubtitle = reminderDialogVisible
    ? `Zuletzt gespeichert: ${latestSummary}`
    : `Zeitpunkt der letzten Erinnerung: ${reminderTime}`;
  const reminderToneEnabled = currentConfig.reminderToneEnabled;
  const countdownLabel =
    nextReminderCountdown === null ? "aus" : `${nextReminderCountdown} Min`;
  const editableConfig = configForm ?? dashboard?.config ?? defaultConfig;

  const selectedDayDistribution = useMemo(() => {
    const source = [0, 1, 2, 3, 4].map((value) => ({
      value: value as 0 | 1 | 2 | 3 | 4,
      count: selectedDayEntries.filter((entry) => entry.value === value).length,
    }));
    const byValue = new Map(source.map((item) => [item.value, item.count]));

    return [0, 1, 2, 3, 4].map((value) => {
      const count = byValue.get(value as 0 | 1 | 2 | 3 | 4) ?? 0;
      return {
        value: value as 0 | 1 | 2 | 3 | 4,
        count,
        label: `${value}`,
        tone: toneByValue[value as 0 | 1 | 2 | 3 | 4],
        width: count > 0 ? count : 0.25,
      };
    }) satisfies TodayDistributionItem[];
  }, [selectedDayEntries]);

  const maxTodayWidth = Math.max(
    1,
    ...selectedDayDistribution.map((item) => item.width),
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

  async function handleQuickSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const trimmedNote = note.trim();
      const fallbackDescription =
        scale.find((item) => item.value === selectedScore)?.title ?? "Eintrag";
      const response = await fetch(`${apiBase}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: selectedScore,
          description: trimmedNote || fallbackDescription,
          note: trimmedNote || fallbackDescription,
          entryType: reminderHeadline.includes("Zusatzbewegung")
            ? "additional_break"
            : "planned_break_response",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await refreshDashboard();
      setNote("");
    } catch {
      setDashboardState("error");
    }
  }

  async function handleConfigSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setConfigState("saving");
    try {
      const response = await fetch(`${apiBase}/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editableConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AppConfig;
      setConfigForm(payload);
      setConfigState("saved");
      await refreshDashboard();
      window.setTimeout(() => {
        setConfigState("idle");
      }, 1500);
    } catch {
      setConfigState("error");
    }
  }

  function openImportDialog() {
    importFileInputRef.current?.click();
  }

  async function handleImportFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      window.alert("Bitte eine CSV-Datei auswählen.");
      return;
    }

    const confirmed = window.confirm(
      `Achtung: Beim Import werden alle aktuellen Daten gelöscht und durch die ausgewählte CSV-Datei ersetzt.\n\nDatei: ${file.name}\n\nFortfahren?`,
    );
    if (!confirmed) {
      return;
    }

    setImportState("importing");
    try {
      const response = await fetch(`${apiBase}/bookings/import`, {
        method: "POST",
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
        },
        body: await file.text(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      try {
        await refreshDashboard();
      } catch {
        // The import already succeeded; keep the UI usable even if the follow-up refresh fails.
      }
    } catch {
      setImportState("error");
      return;
    }

    setImportState("idle");
  }

  async function handleExportCsv() {
    try {
      const response = await fetch(`${apiBase}/bookings/export`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csv = await response.blob();
      const url = URL.createObjectURL(csv);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Bewegungsdaten.csv";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      // keep quiet; export is optional
    }
  }

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "reminder" as const, label: "Reminder" },
    { key: "day" as const, label: "Tagesansicht" },
    { key: "week" as const, label: "Wochenansicht" },
  ];

  return (
    <div className="app-shell">
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />
      <div className="bg-orb orb-c" />

      <header className="app-header panel">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <img
              src="/public/icons8-hyperaktiver-hauttyp-2-48.png"
              alt="Bewegungserinnerung"
            />
          </div>
          <div>
            <div className="brand-title">Bewegungserinnerung</div>
            <div className="brand-subtitle">Stündlicher Bewegungstracker</div>
          </div>
        </div>

        <div className="header-clock">
          <div className="header-clock-label">{currentDayLabel}</div>
          <div className="header-clock-time">
            {now.toLocaleTimeString("de-AT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </header>

      <nav className="tabs panel">
        {tabs.map((item) => (
          <button
            key={item.key}
            className={item.key === tab ? "tab active" : "tab"}
            onClick={() => setTab(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="workspace">
        <main className="workspace-main">
          {tab === "dashboard" && (
            <>
              <section className="panel hero-panel">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">Schnelleingabe</div>
                    <div className="hero-subtitle">
                      Zeitpunkt der letzten Erinnerung: {reminderTime}
                    </div>
                  </div>
                  <div className="status-pill">
                    {dashboardState === "ready"
                      ? "bereit"
                      : dashboardState === "error"
                        ? "Fehler"
                        : "lädt"}
                  </div>
                </div>

                <form className="quick-entry" onSubmit={handleQuickSubmit}>
                  <div className="entry-section-title">Aktivitätslevel</div>
                  <div className="scale-grid">
                    {scale.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={
                          item.value === selectedScore
                            ? `score-card selected tone-${item.tone}`
                            : `score-card tone-${item.tone}`
                        }
                        onClick={() => setSelectedScore(item.value)}
                      >
                        <div className="score-number">{item.value}</div>
                        <strong>{item.title}</strong>
                        <span>{item.desc}</span>
                      </button>
                    ))}
                  </div>

                  <label className="entry-field">
                    <span>Aktivität</span>
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Was hast du gemacht?"
                    />
                  </label>

                  <button
                    className="primary-btn primary-btn--compact"
                    type="submit"
                  >
                    Eintrag speichern
                  </button>
                </form>
              </section>

              <section className="panel evaluation-panel">
                <div className="panel-heading">
                  <div className="eyebrow">Aktivitätsauswertung</div>
                  <div className="segmented">
                    <button
                      type="button"
                      className={
                        evaluationTab === "day" ? "segment active" : "segment"
                      }
                      onClick={() => setEvaluationTab("day")}
                    >
                      Tagesauswertung
                    </button>
                    <button
                      type="button"
                      className={
                        evaluationTab === "week" ? "segment active" : "segment"
                      }
                      onClick={() => setEvaluationTab("week")}
                    >
                      Wochen-Heatmap
                    </button>
                  </div>
                </div>

                {evaluationTab === "day" ? (
                  <div className="day-eval">
                    <div className="day-meta">
                      <div className="day-picker">
                        <select
                          value={activeDayIso}
                          onChange={(event) =>
                            setSelectedDayIso(event.target.value)
                          }
                        >
                          {availableDayOptions.map((option) => (
                            <option key={option.date} value={option.date}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="stat-grid">
                      <StatCard
                        label="Bewegungen"
                        value={String(selectedDaySummary.answered)}
                        note={`${selectedDaySummary.planned} geplant · ${selectedDaySummary.additional} extra`}
                        tone="green"
                      />
                      <StatCard
                        label="Verpasste Erinnerungen"
                        value={String(selectedDaySummary.unanswered)}
                        note="Nicht wahrgenommen"
                        tone="red"
                      />
                      <StatCard
                        label="Verzögerung"
                        value={`${Math.round(selectedDaySummary.averageDelayMinutes ?? 0)} Min.`}
                        note="Reaktionszeit nach Alarm"
                        tone="orange"
                      />
                    </div>

                    <div className="chart-card">
                      <div className="chart-head">
                        <div>Aktivitäts-Skala chronologisch</div>
                        <div className="legend">
                          <span>
                            <i className="legend-dot green" /> Ø pro Stunde
                          </span>
                          <span>
                            <i className="legend-dot blue" /> Farbe = Durchschnittsbewertung (aufgerundet)
                          </span>
                        </div>
                      </div>

                      {selectedDayHourlyBars.length > 0 ? (
                        <div className="hourly-bars">
                          {selectedDayHourlyBars.map((item) => (
                            <div key={item.hour} className="hourly-bar-row">
                              <div className="hourly-bar-label">{item.hour}</div>
                              <div className="hourly-bar-track">
                                <div
                                  className={`hourly-bar-fill tone-${item.tone}`}
                                  style={{
                                    height: `${24 + Math.round((item.averageValue ?? 0) * 18)}px`,
                                  }}
                                >
                                  <span>{formatValueLabel(item.averageValue)}</span>
                                </div>
                              </div>
                              <div className="hourly-bar-meta" title={item.tooltip}>
                                <strong>{item.count}</strong>
                                <span>{item.count === 1 ? "Eintrag" : "Einträge"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          Für den gewählten Tag sind noch keine Einträge
                          vorhanden.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <HeatmapCard heatmap={dashboard?.heatmap} />
                )}
              </section>

              <section className="panel activities-panel">
                <div className="panel-heading">
                  <div className="eyebrow">Letzte Aktivitäten</div>
                  <div className="status-pill">
                    {latestActivities.length} Zeilen
                  </div>
                </div>

                <div className="activities-table">
                  <div className="activities-head">
                    <span>Datum</span>
                    <span>Geplant</span>
                    <span>Verzögerung</span>
                    <span>Skala</span>
                    <span>Aktivität</span>
                    <span>Typ</span>
                  </div>

                  {latestActivities.map((item) => (
                    <div className="activities-row" key={item.id}>
                      <span>{formatDate(item.date)}</span>
                      <span>{item.plannedTime}</span>
                      <span>
                        {item.delayMinutes ? `${item.delayMinutes} Min` : "—"}
                      </span>
                      <span>
                        <span
                          className={`scale-pill tone-${toneClassByValue(item.value)}`}
                        >
                          {formatValueLabel(item.value)}/4
                        </span>
                      </span>
                      <span>
                        <strong>{item.description}</strong>
                        <small>{item.note}</small>
                      </span>
                      <span>
                        <span
                          className={`type-pill ${item.isAdditionalBreak ? "accent" : "soft"}`}
                        >
                          {getTypeLabel(item)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {hasMoreActivities && (
                  <div className="activity-more">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() =>
                        setShowAllActivities((current) => !current)
                      }
                    >
                      {showAllActivities
                        ? "Weniger anzeigen"
                        : "Weitere anzeigen"}
                    </button>
                  </div>
                )}

                <div className="activity-footer">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={handleExportCsv}
                  >
                    CSV-Daten exportieren
                  </button>
                  <button
                    className="secondary-btn warning"
                    type="button"
                    onClick={openImportDialog}
                    disabled={importState === "importing"}
                  >
                    {importState === "importing"
                      ? "Import läuft..."
                      : "CSV-Daten importieren"}
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportFileSelected}
                    style={{ display: "none" }}
                  />
                </div>
              </section>
            </>
          )}

          {tab === "reminder" && (
            <>
              <section className="panel hero-panel">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">Reminder</div>
                    <div className="hero-subtitle">
                      {reminderDialogVisible
                        ? "Immer dasselbe Format, nur die motivierende Nachricht ändert sich."
                        : "Nur Ton aktiv, Dialog ausgeblendet."}
                    </div>
                  </div>
                  <div
                    className={`status-pill status-pill--compact status-pill--${dashboardState}`}
                  >
                    {apiStatusLabel}
                  </div>
                </div>

                <div className="reminder-layout">
                  <article className="reminder-main">
                    <div className="time-label">Letzter aktiver Reminder</div>
                    <div className="time">{reminderHeadline}</div>
                    {reminderDialogVisible ? (
                      <>
                        <h3>Zeit für einen kurzen Neustart.</h3>
                        <p>
                          Steh kurz auf, lockere Schultern und Rücken oder geh
                          ein paar Schritte. Ein kleiner Wechsel reicht oft
                          schon, um den Kopf wieder frei zu bekommen.{" "}
                          <button
                            className="inline-link"
                            type="button"
                            onClick={() =>
                              reminderToneEnabled && playReminderTone()
                            }
                            disabled={!reminderToneEnabled}
                          >
                            Ton abspielen
                          </button>
                        </p>
                      </>
                    ) : (
                      <>
                        <h3>Nur Ton aktiv.</h3>
                        <p>
                          Der Erinnerungsdialog ist ausgeblendet. Es wird nur
                          der Ton abgespielt und die Schnelleingabe arbeitet mit
                          dem Zeitpunkt der letzten Erinnerung.{" "}
                          <button
                            className="inline-link"
                            type="button"
                            onClick={() =>
                              reminderToneEnabled && playReminderTone()
                            }
                            disabled={!reminderToneEnabled}
                          >
                            Ton abspielen
                          </button>
                        </p>
                      </>
                    )}
                  </article>

                  <aside className="reminder-side reminder-side--light">
                    <ReminderComposer
                      selectedScore={selectedScore}
                      note={note}
                      summaryLine={summaryLine}
                      latestSummary={latestSummary}
                      subtitleLine={reminderComposerSubtitle}
                      toneEnabled={reminderToneEnabled}
                      onScoreChange={setSelectedScore}
                      onNoteChange={setNote}
                      onSubmit={handleQuickSubmit}
                      onPlayTone={() =>
                        reminderToneEnabled && playReminderTone()
                      }
                    />
                  </aside>
                </div>
              </section>

              <section className="panel activities-panel">
                <div className="panel-heading">
                  <div className="eyebrow">Heute im Überblick</div>
                  <div className="status-pill">
                    {dashboardState === "ready"
                      ? `${todaySummary?.answered ?? 0} beantwortet`
                      : "lädt"}
                  </div>
                </div>

                <div className="stat-grid stat-grid--compact">
                  <StatCard
                    label="Pausen"
                    value={String(todaySummary?.total ?? 0)}
                    note="erfasst"
                    tone="green"
                  />
                  <StatCard
                    label="Verzögerung"
                    value={`${Math.round(todaySummary?.averageDelayMinutes ?? 0)} Min.`}
                    note="durchschnittlich"
                    tone="orange"
                  />
                  <StatCard
                    label="Ø Skala"
                    value={formatValueLabel(todaySummary?.averageValue ?? null)}
                    note="heutiger Schnitt"
                    tone="blue"
                  />
                </div>
              </section>
            </>
          )}

          {tab === "day" && (
            <section className="panel evaluation-panel evaluation-panel--standalone">
              <div className="panel-heading">
                <div className="eyebrow">Tagesansicht</div>
                <div className="status-pill">{currentDayLabel}</div>
              </div>

              <div className="stat-grid">
                <StatCard
                  label="Erfasst"
                  value={String(selectedDaySummary.total)}
                  note="gewählter Tag"
                  tone="green"
                />
                <StatCard
                  label="Beantwortet"
                  value={String(selectedDaySummary.answered)}
                  note="mit Wert"
                  tone="blue"
                />
                <StatCard
                  label="Unbeantwortet"
                  value={String(selectedDaySummary.unanswered)}
                  note="ohne Rückmeldung"
                  tone="red"
                />
              </div>

              <div className="distribution">
                <div className="section-head">
                  <h3>Werteverteilung</h3>
                  <span>0 bis 4</span>
                </div>
                <div className="bar-list">
                  {selectedDayDistribution.map((item) => (
                    <div className="bar-row" key={item.label}>
                      <div className="bar-label">{item.label}</div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${item.tone}`}
                          style={{
                            width: `${Math.max(8, Math.round((item.width / maxTodayWidth) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="bar-count">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === "week" && (
            <section className="panel heatmap-panel">
              <div className="panel-heading">
                <div className="eyebrow">Wochen-Heatmap</div>
                <div className="status-pill">
                  {dashboard?.heatmap.subtitle ?? "—"}
                </div>
              </div>

              <HeatmapCard heatmap={dashboard?.heatmap} />
            </section>
          )}
        </main>

        <aside className="workspace-side">
          <section className="panel side-card countdown-card">
            <div className="side-card-title">Countdown zur Bewegung</div>
            <div className="countdown-value">{countdownLabel}</div>
            <div className="countdown-note">
              {currentConfig.hourlyReminderEnabled
                ? "Minuten bis zur nächsten Erinnerung"
                : "Reminder deaktiviert"}
            </div>
          </section>

          <section className="panel side-card overview-card">
            <div className="side-card-title">Heute im Überblick</div>
            <div className="mini-grid">
              <MiniStat
                label="Pausen"
                value={String(todaySummary?.total ?? 0)}
              />
              <MiniStat
                label="Verzögerung"
                value={`${Math.round(todaySummary?.averageDelayMinutes ?? 0)}`}
              />
              <MiniStat
                label="Ø Skala"
                value={formatValueLabel(todaySummary?.averageValue ?? null)}
              />
            </div>
          </section>

          <section className="panel side-card config-card">
            <div className="side-card-title">Konfiguration & Intervalle</div>

            <form className="config-form" onSubmit={handleConfigSubmit}>
              <div className="config-main-row">
                <label className="config-switch config-switch--primary">
                  <div>
                    <span>Stündlicher Reminder</span>
                    <br />
                    <small>Erinnert jede Stunde im Intervall</small>
                  </div>
                  <div>
                    <input
                      type="checkbox"
                      checked={editableConfig.hourlyReminderEnabled}
                      onChange={(event) =>
                        setConfigForm((current) => ({
                          ...(current ?? editableConfig),
                          hourlyReminderEnabled: event.target.checked,
                        }))
                      }
                    />
                  </div>
                </label>
              </div>

              <label className="config-switch config-switch--slider">
                <input
                  type="checkbox"
                  checked={editableConfig.weekdaysOnly}
                  onChange={(event) =>
                    setConfigForm((current) => ({
                      ...(current ?? editableConfig),
                      weekdaysOnly: event.target.checked,
                    }))
                  }
                />
                <span>Nur an Werktagen</span>
                <span className="slider-track" aria-hidden="true">
                  <span className="slider-thumb" />
                </span>
              </label>

              <label className="config-field">
                <span>Exportdatei:</span>
                <input
                  type="text"
                  value={editableConfig.exportPath}
                  onChange={(event) =>
                    setConfigForm((current) => ({
                      ...(current ?? editableConfig),
                      exportPath: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="config-row">
                <label className="config-field">
                  <span>Startzeit</span>
                  <input
                    type="text"
                    value={editableConfig.reminderStartTime}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...(current ?? editableConfig),
                        reminderStartTime: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="config-field">
                  <span>Endzeit</span>
                  <input
                    type="text"
                    value={editableConfig.reminderEndTime}
                    onChange={(event) =>
                      setConfigForm((current) => ({
                        ...(current ?? editableConfig),
                        reminderEndTime: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="config-switch config-switch--link">
                <div>
                  <span>Audio-Chime abspielen</span>
                  <br />
                  <small>Spielt akustischen Gong bei Alarm</small>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    currentConfig.reminderToneEnabled && playReminderTone()
                  }
                  disabled={!currentConfig.reminderToneEnabled}
                >
                  Jetzt testen
                </button>
                <input
                  type="checkbox"
                  checked={editableConfig.reminderToneEnabled}
                  onChange={(event) =>
                    setConfigForm((current) => ({
                      ...(current ?? editableConfig),
                      reminderToneEnabled: event.target.checked,
                    }))
                  }
                />
              </label>

              <div className="preview-actions">
                <button className="primary-btn primary-btn--wide" type="submit">
                  {configState === "saving"
                    ? "Speichert..."
                    : "Einstellungen speichern"}
                </button>
              </div>
            </form>
          </section>
        </aside>
      </div>
      {reminderPopup && (
        <div className="reminder-toast" role="status" aria-live="polite">
          <strong>{reminderPopup.title}</strong>
          <span>{reminderPopup.message}</span>
        </div>
      )}
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "orange" | "blue" | "red";
}) {
  return (
    <article className={`stat-card tone-${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.note}</small>
    </article>
  );
}

function MiniStat(props: { label: string; value: string }) {
  return (
    <div className="mini-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function HeatmapCard(props: { heatmap: HeatmapData | undefined }) {
  if (!props.heatmap) {
    return <div className="empty-state">Heatmap wird geladen.</div>;
  }

  const gridStyle = {
    gridTemplateColumns: `64px repeat(${props.heatmap.columns.length}, minmax(40px, 1fr))`,
  } as const;

  return (
    <div className="heatmap-card">
      <div className="heatmap-nav">
        <button
          type="button"
          className="ghost-arrow"
          aria-label="Vorherige Daten"
        >
          ←
        </button>
        <div className="heatmap-title">
          <strong>{props.heatmap.title}</strong>
          <span>{props.heatmap.note}</span>
        </div>
        <button
          type="button"
          className="ghost-arrow"
          aria-label="Nächste Daten"
        >
          →
        </button>
      </div>

      <div className="heatmap-note">{props.heatmap.note}</div>

      <div className="heatmap-grid" style={gridStyle}>
        <div className="heatmap-corner" />
        {props.heatmap.columns.map((column) => (
          <div className="heatmap-column-head" key={column.date}>
            <strong>{column.label}</strong>
            <span>{column.shortLabel}</span>
          </div>
        ))}

        {props.heatmap.rows.map((row) => (
          <div className="heatmap-row" key={row.slot}>
            <div className="heatmap-row-label">{row.slot}</div>
            {row.cells.map((cell) => (
              <div
                key={`${cell.date}-${cell.slot}`}
                className={
                  cell.value === null
                    ? "heatmap-cell empty"
                    : `heatmap-cell tone-${toneClassByValue(cell.value)} intensity-${Math.min(4, Math.max(1, Math.round(cell.value)))}`
                }
              >
                <span>
                  {cell.value === null ? "·" : formatValueLabel(cell.value)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReminderComposer(props: {
  selectedScore: number;
  note: string;
  summaryLine: string;
  latestSummary: string;
  subtitleLine: string;
  toneEnabled: boolean;
  onScoreChange: (score: number) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlayTone: () => void;
}) {
  return (
    <div className="reminder-composer">
      <div className="composer-header">
        <div className="side-label">Schnelleingabe</div>
        <div className="composer-hint">{props.subtitleLine}</div>
      </div>

      <div className="composer-summary">{props.summaryLine}</div>

      <div className="scale-grid composer-scale-grid">
        {scale.map((item) => (
          <button
            type="button"
            key={item.value}
            className={
              item.value === props.selectedScore
                ? "score-card selected"
                : "score-card"
            }
            onClick={() => props.onScoreChange(item.value)}
          >
            <div className={`score-badge ${item.tone}`}>{item.value}</div>
            <strong>{item.title}</strong>
            <span>{item.desc}</span>
          </button>
        ))}
      </div>

      <form className="quick-form composer-form" onSubmit={props.onSubmit}>
        <label className="input-group composer-input-group">
          <span>Beschreibung</span>
          <input
            value={props.note}
            onChange={(event) => props.onNoteChange(event.target.value)}
            placeholder={props.latestSummary}
          />
        </label>

        <button className="primary-btn" type="submit">
          Antwort speichern
        </button>

        <button
          className="inline-link inline-link--standalone"
          type="button"
          onClick={props.onPlayTone}
          disabled={!props.toneEnabled}
        >
          {props.toneEnabled ? "Ton im Reminder testen" : "Ton deaktiviert"}
        </button>
      </form>
    </div>
  );
}
