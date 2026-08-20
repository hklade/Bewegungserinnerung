import fs from 'node:fs';
import path from 'node:path';
import { normalizeTime, parseTimeToMinutes } from './utils/time.mjs';
import { parseNumber } from './utils/parsing.mjs';

/**
 * Konfigurationsverwaltung für die Server-App.
 * Enthält Default-Werte, Lade-/Speicherfunktionen und Hilfen für Reminder-Slots und Exportpfade.
 */

const PROJECT_ROOT = process.cwd();
const CONFIG_DIR = path.join(PROJECT_ROOT, 'config');
const DEFAULT_CONFIG_FILE = path.join(CONFIG_DIR, 'bewegungserinnerung.config.json');
const TEST_CONFIG_FILE = path.join(CONFIG_DIR, 'test-bewegungserinnerung.config.json');
const DEFAULT_EXPORT_PATH = path.join(PROJECT_ROOT, 'data', 'Bewegungsdaten.csv');
const TEST_EXPORT_PATH = path.join(PROJECT_ROOT, 'data', 'Test-Bewegungsdaten.csv');
const DEFAULT_HYDRATION_EXPORT_PATH = path.join(PROJECT_ROOT, 'data', 'Trinkdaten.csv');
const TEST_HYDRATION_EXPORT_PATH = path.join(PROJECT_ROOT, 'data', 'Test-Trinkdaten.csv');

function resolveHydrationExportPath() {
  const environment = String(process.env.NODE_ENV ?? '').trim().toLowerCase();
  return environment === 'test' ? TEST_HYDRATION_EXPORT_PATH : DEFAULT_HYDRATION_EXPORT_PATH;
}

export const DEFAULT_CONFIG = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: '07:55',
  reminderEndTime: '16:55',
  weekdaysOnly: true,
  exportPath: DEFAULT_EXPORT_PATH,
  reminderToneEnabled: true,
  dailyDrinkLiters: 2,
};

export const CONFIG_FILES = {
  default: DEFAULT_CONFIG_FILE,
  test: TEST_CONFIG_FILE,
};

export const SERVER_PATHS = {
  projectRoot: PROJECT_ROOT,
  configDir: CONFIG_DIR,
  defaultConfigFile: DEFAULT_CONFIG_FILE,
  testConfigFile: TEST_CONFIG_FILE,
  defaultExportPath: DEFAULT_EXPORT_PATH,
  testExportPath: TEST_EXPORT_PATH,
  defaultHydrationExportPath: DEFAULT_HYDRATION_EXPORT_PATH,
  testHydrationExportPath: TEST_HYDRATION_EXPORT_PATH,
  get hydrationExportPath() {
    return resolveHydrationExportPath();
  },
};

export function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

export function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath));
}

function getConfigFilePath() {
  const environment = String(process.env.NODE_ENV ?? '').trim().toLowerCase();
  if (environment === 'test') {
    return CONFIG_FILES.test;
  }

  return CONFIG_FILES.default;
}

function resolveConfigPath(config) {
  // Absolute Pfade (auch der Windows-Produktionspfad) bleiben unverändert. Ein relativer
  // Pfad wird gegen config/ aufgelöst statt roh übernommen zu werden — betrifft auch vom
  // Nutzer im Konfigurationsformular eingegebene relative Pfade, nicht nur Testdaten.
  const exportPath = String(config?.exportPath ?? DEFAULT_CONFIG.exportPath).trim() || DEFAULT_CONFIG.exportPath;
  return path.isAbsolute(exportPath) ? exportPath : path.resolve(CONFIG_DIR, exportPath);
}

function buildReminderSlotsFromStart(startTime) {
  const normalizedStart = normalizeTime(startTime);
  const startMinutes = parseTimeToMinutes(normalizedStart);

  if (startMinutes === null) {
    return ['07:55', '08:55', '09:55', '10:55', '11:55', '12:55', '13:55', '14:55', '15:55', '16:55'];
  }

  const slots = [];
  for (let minutes = startMinutes; minutes <= 16 * 60; minutes += 60) {
    slots.push(formatMinutesToTime(minutes));
  }

  return slots.length > 0 ? slots : ['07:55', '08:55', '09:55', '10:55', '11:55', '12:55', '13:55', '14:55', '15:55', '16:55'];
}

function formatMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function loadConfig(logStep = () => {}) {
  const configFilePath = getConfigFilePath();
  ensureParentDir(configFilePath);

  if (!fs.existsSync(configFilePath)) {
    return { ...DEFAULT_CONFIG, exportPath: resolveConfigPath(DEFAULT_CONFIG) };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      exportPath: resolveConfigPath(parsed),
      reminderStartTime: normalizeTime(parsed?.reminderStartTime) ?? DEFAULT_CONFIG.reminderStartTime,
      reminderEndTime: normalizeTime(parsed?.reminderEndTime) ?? DEFAULT_CONFIG.reminderEndTime,
      hourlyReminderEnabled: Boolean(parsed?.hourlyReminderEnabled ?? DEFAULT_CONFIG.hourlyReminderEnabled),
      showReminderDialog: Boolean(parsed?.showReminderDialog ?? DEFAULT_CONFIG.showReminderDialog),
      weekdaysOnly: Boolean(parsed?.weekdaysOnly ?? DEFAULT_CONFIG.weekdaysOnly),
      reminderToneEnabled: Boolean(parsed?.reminderToneEnabled ?? DEFAULT_CONFIG.reminderToneEnabled),
      dailyDrinkLiters: Number.isFinite(parseNumber(parsed?.dailyDrinkLiters))
        ? parseNumber(parsed?.dailyDrinkLiters)
        : DEFAULT_CONFIG.dailyDrinkLiters,
    };
  } catch (error) {
    logStep('config.read.failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { ...DEFAULT_CONFIG, exportPath: resolveConfigPath(DEFAULT_CONFIG) };
  }
}

export function saveConfig(config, logStep = () => {}) {
  const configFilePath = getConfigFilePath();
  const nextConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    exportPath: resolveConfigPath(config),
    reminderStartTime: normalizeTime(config.reminderStartTime) ?? DEFAULT_CONFIG.reminderStartTime,
    reminderEndTime: normalizeTime(config.reminderEndTime) ?? DEFAULT_CONFIG.reminderEndTime,
    hourlyReminderEnabled: Boolean(config.hourlyReminderEnabled),
    showReminderDialog: Boolean(config.showReminderDialog),
    weekdaysOnly: Boolean(config.weekdaysOnly),
    reminderToneEnabled: Boolean(config.reminderToneEnabled),
    dailyDrinkLiters: Number.isFinite(parseNumber(config.dailyDrinkLiters))
      ? parseNumber(config.dailyDrinkLiters)
      : DEFAULT_CONFIG.dailyDrinkLiters,
  };

  ensureParentDir(configFilePath);
  fs.writeFileSync(configFilePath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
  return nextConfig;
}

export function normalizeConfigPath(config) {
  return resolveConfigPath(config);
}

export function buildReminderSlots(config) {
  const startMinutes = parseTimeToMinutes(config.reminderStartTime);
  const endMinutes = parseTimeToMinutes(config.reminderEndTime);

  if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
    return buildReminderSlotsFromStart(config.reminderStartTime);
  }

  const slots = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
    slots.push(formatMinutesToTime(minutes));
  }

  return slots.length > 0 ? slots : buildReminderSlotsFromStart(config.reminderStartTime);
}

export function ensureConfigDir() {
  ensureDir(CONFIG_DIR);
}
