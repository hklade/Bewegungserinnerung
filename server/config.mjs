import fs from 'node:fs';
import path from 'node:path';
import { normalizeTime } from './utils/time.mjs';
import { parseNumber } from './utils/parsing.mjs';
import { buildReminderSlots } from '../shared/reminder-schedule.mjs';

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

export function isTestEnvironment() {
  return String(process.env.NODE_ENV ?? '').trim().toLowerCase() === 'test';
}

function resolveHydrationExportPath() {
  return isTestEnvironment() ? TEST_HYDRATION_EXPORT_PATH : DEFAULT_HYDRATION_EXPORT_PATH;
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
  return isTestEnvironment() ? CONFIG_FILES.test : CONFIG_FILES.default;
}

function defaultExportPathForCurrentEnvironment() {
  return isTestEnvironment() ? TEST_EXPORT_PATH : DEFAULT_EXPORT_PATH;
}

function resolveConfigPath(config) {
  // Absolute Pfade (auch der Windows-Produktionspfad) bleiben unverändert. Ein relativer
  // Pfad wird gegen config/ aufgelöst statt roh übernommen zu werden — betrifft auch vom
  // Nutzer im Konfigurationsformular eingegebene relative Pfade, nicht nur Testdaten.
  // Fehlt exportPath im übergebenen Config-Objekt (z. B. ein PUT /api/config ohne dieses Feld),
  // fällt es auf den zum aktiven NODE_ENV passenden Default zurück, nie unbedingt auf den
  // Produktionswert — sonst würde ein Testlauf über diesen Umweg die echte Produktions-CSV treffen.
  const fallbackExportPath = defaultExportPathForCurrentEnvironment();
  const exportPath = String(config?.exportPath ?? fallbackExportPath).trim() || fallbackExportPath;
  return path.isAbsolute(exportPath) ? exportPath : path.resolve(CONFIG_DIR, exportPath);
}

export function loadConfig(logStep = () => {}) {
  const configFilePath = getConfigFilePath();
  ensureParentDir(configFilePath);

  if (!fs.existsSync(configFilePath)) {
    return { ...DEFAULT_CONFIG, exportPath: resolveConfigPath({}) };
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
    return { ...DEFAULT_CONFIG, exportPath: resolveConfigPath({}) };
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

export { buildReminderSlots };

export function ensureConfigDir() {
  ensureDir(CONFIG_DIR);
}
