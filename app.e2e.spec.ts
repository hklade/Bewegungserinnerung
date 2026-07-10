import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const apiBase = "http://127.0.0.1:3001/api";
const defaultExportPath = "C:\\Users\\HeidiKlade\\Documents\\Codex\\Bewegungserinnerung\\export\\Bewegungsdaten.csv";

const baseConfig = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: "07:55",
  reminderEndTime: "16:55",
  weekdaysOnly: true,
  reminderToneEnabled: true,
};

async function restoreDefaultConfig(request: any) {
  const response = await request.put(`${apiBase}/config`, {
    data: {
      ...baseConfig,
      exportPath: defaultExportPath,
      showReminderDialog: true,
    },
  });

  expect(response.ok()).toBeTruthy();
}

function buildCsv(rows: string[]) {
  const header = [
    "id",
    "date",
    "weekday",
    "reminder_time",
    "response_time",
    "delay_minutes",
    "value",
    "description",
    "duration_minutes",
    "is_additional_break",
    "entry_type",
    "note",
    "created_at",
  ].join(";");

  return `${header}\n${rows.join("\n")}\n`;
}

function readTestCsvFixture() {
  return readFileSync("C:\\Users\\HeidiKlade\\Documents\\Codex\\Bewegungserinnerung\\Test-Bewegungsdaten.csv", "utf8");
}

async function seedConfig(request: any, exportPath: string, overrides = {}) {
  const response = await request.put(`${apiBase}/config`, {
    data: {
      ...baseConfig,
      exportPath,
      ...overrides,
    },
  });

  expect(response.ok()).toBeTruthy();
}

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ request }) => {
  await restoreDefaultConfig(request);
});

test("config card persists export path and dialog toggle", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const exportPath = testInfo.outputPath("Test-Bewegungsdaten.csv");
  await seedConfig(request, exportPath, { showReminderDialog: false });

  await page.goto("/");
  await expect(page.getByLabel("Exportdatei:")).toHaveValue(exportPath);
  await expect(page.locator(".hero-subtitle")).toContainText("Zeitpunkt der letzten Erinnerung:");

  await page.getByRole("button", { name: "Reminder" }).click();
  await expect(page.getByRole("heading", { name: "Nur Ton aktiv." })).toBeVisible();

  const enableResponse = await request.put(`${apiBase}/config`, {
    data: {
      ...baseConfig,
      exportPath,
      showReminderDialog: true,
    },
  });
  expect(enableResponse.ok()).toBeTruthy();

  const configResponse = await request.get(`${apiBase}/config`);
  expect(configResponse.ok()).toBeTruthy();
  const config = (await configResponse.json()) as { showReminderDialog: boolean; exportPath: string };
  expect(config.showReminderDialog).toBeTruthy();
  expect(path.normalize(config.exportPath)).toBe(path.normalize(exportPath));
});

test("csv import replaces existing rows", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const exportPath = testInfo.outputPath("Test-Bewegungsdaten.csv");
  await seedConfig(request, exportPath, { showReminderDialog: true });

  const csvOne = readTestCsvFixture();

  const importOne = await request.post(`${apiBase}/bookings/import`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
    },
    data: csvOne,
  });
  expect(importOne.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.locator(".activities-row")).toHaveCount(2);
  await expect(page.getByText("Kniebeugen")).toBeVisible();

  const csvTwo = buildCsv([
    "1;2026-07-08;Mittwoch;09:55;09:57;2;2;Spaziergang;10;false;planned_break_response;neu;2026-07-08T09:57:00.000Z",
  ]);

  const importTwo = await request.post(`${apiBase}/bookings/import`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
    },
    data: csvTwo,
  });
  expect(importTwo.ok()).toBeTruthy();

  await page.reload();
  await expect(page.locator(".activities-row")).toHaveCount(1);
  await expect(page.locator(".activities-row strong")).toHaveText("Spaziergang");
  await expect(page.locator(".activities-row strong").filter({ hasText: "Kniebeugen" })).toHaveCount(0);
});

test("quick entry saves a booking from the dashboard", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const exportPath = testInfo.outputPath("Test-Bewegungsdaten.csv");
  const now = new Date();
  const reminderStartTime = `${String((now.getHours() + 22) % 24).padStart(2, "0")}:55`;
  const reminderEndTime = `${String(now.getHours()).padStart(2, "0")}:55`;
  await seedConfig(request, exportPath, {
    showReminderDialog: true,
    reminderStartTime,
    reminderEndTime,
  });

  await page.goto("/");
  const heroPanel = page.locator(".hero-panel");
  await heroPanel.getByRole("button", { name: "Aktive Pause" }).click();
  await heroPanel.getByLabel("Aktivität").fill("quick-entry-test");
  await heroPanel.getByRole("button", { name: "Eintrag speichern" }).click();

  const activityCount = await page.locator(".activities-row").count();
  expect(activityCount).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".activities-row strong")).toHaveText("quick-entry-test");
  await expect(page.getByText("keine Aktivität eingetragen")).toBeVisible();
});
