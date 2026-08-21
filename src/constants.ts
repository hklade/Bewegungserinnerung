import type { AppConfig } from "./types.js";

export const apiBase = "/api";

export const weekdayNames = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

export const defaultConfig: AppConfig = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: "07:55",
  reminderEndTime: "16:55",
  weekdaysOnly: true,
  exportPath:
    "C:\\Users\\HeidiKlade\\Documents\\Codex\\Bewegungserinnerung\\export\\Bewegungsdaten.csv",
  reminderToneEnabled: true,
  dailyDrinkLiters: 2,
};

export const scale = [
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

export const toneByValue = {
  0: "red",
  1: "ochre",
  2: "orange",
  3: "blue",
  4: "green",
} as const;
