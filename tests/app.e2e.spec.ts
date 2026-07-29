import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const repoDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(repoDir, "..");
const apiBase = "http://127.0.0.1:3001/api";
const defaultExportPath = path.join(repoRoot, "export", "Bewegungsdaten.csv");
const testCsvFixturePath = path.join(repoRoot, "data", "Test-Bewegungsdaten.csv");

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
  return readFileSync(testCsvFixturePath, "utf8");
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

test("config card persists export path and dialog toggle", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(60_000);
  const exportPath = testInfo.outputPath("Test-Bewegungsdaten.csv");
  await seedConfig(request, exportPath, { showReminderDialog: false });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".config-card")).toBeVisible({ timeout: 15_000 });

  const persistedConfigResponse = await request.get(`${apiBase}/config`);
  expect(persistedConfigResponse.ok()).toBeTruthy();
  const persistedConfig = (await persistedConfigResponse.json()) as {
    exportPath: string;
    showReminderDialog: boolean;
  };

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("textbox", { name: "Exportdatei:" })).toHaveValue(
    persistedConfig.exportPath,
  );
  await expect(page.locator(".hero-subtitle")).toContainText(
    "Zeitpunkt der letzten Erinnerung:",
  );

  const preToggleConfigResponse = await request.get(`${apiBase}/config`);
  expect(preToggleConfigResponse.ok()).toBeTruthy();
  const preToggleConfig = (await preToggleConfigResponse.json()) as {
    showReminderDialog: boolean;
    exportPath: string;
  };
  expect(preToggleConfig.showReminderDialog).toBe(false);
  expect(path.normalize(preToggleConfig.exportPath)).toBe(path.normalize(exportPath));

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
  const config = (await configResponse.json()) as {
    showReminderDialog: boolean;
    exportPath: string;
  };
  expect(config.showReminderDialog).toBeTruthy();
  expect(path.normalize(config.exportPath)).toBe(path.normalize(exportPath));
});

test("csv import replaces existing rows", async ({
  page,
  request,
}, testInfo) => {
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
  await expect(page.locator(".activities-row strong")).toHaveText(
    "Spaziergang",
  );
  await expect(
    page.locator(".activities-row strong").filter({ hasText: "Kniebeugen" }),
  ).toHaveCount(0);
});

test("quick entry saves a booking from the dashboard", async ({
  page,
  request,
}, testInfo) => {
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

  await expect(
    page
      .locator(".activities-row strong")
      .filter({ hasText: "quick-entry-test" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".activities-row")).toHaveCount(3);
  await expect(
    page
      .locator(".activities-row strong")
      .filter({ hasText: "quick-entry-test" }),
  ).toHaveText("quick-entry-test");
  await expect(page.getByText("keine Aktivität eingetragen")).toBeVisible();
});

test("csv import via file dialog replaces existing rows", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(60_000);
  const exportPath = testInfo.outputPath("Test-Bewegungsdaten.csv");
  await seedConfig(request, exportPath, { showReminderDialog: true });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "CSV-Daten importieren" }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles(testCsvFixturePath);

  await expect(page.locator(".activities-row")).toHaveCount(2);
  await expect(page.getByText("Kniebeugen")).toBeVisible();
});
