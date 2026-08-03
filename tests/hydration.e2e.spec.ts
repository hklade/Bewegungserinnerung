import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const repoDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(repoDir, "..");
const apiBase = "http://127.0.0.1:3001/api";
const testHydrationCsvPath = path.join(repoRoot, "data", "Test-Trinkdaten.csv");

function resetHydrationFile() {
  writeFileSync(testHydrationCsvPath, "date;hydrationMl\n", "utf8");
}

async function getTodayMl(request: APIRequestContext) {
  const response = await request.get(`${apiBase}/dashboard?limit=1`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { hydration: { todayMl: number } };
  return payload.hydration.todayMl;
}

async function readDisplayedMl(page: Page) {
  const text = await page.locator(".hydration-meta strong").innerText();
  const match = text.match(/(\d+)\s*ml/);
  return match ? Number(match[1]) : NaN;
}

const addButton = (page: Page) => page.getByRole("button", { name: "+ 250 ml" });
const removeButton = (page: Page) => page.getByRole("button", { name: "- 250 ml" });

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  resetHydrationFile();
});

test.describe("Trinkmanager", () => {
  test("startet bei 0 ml und schreibt nach einem Klick die Tagessumme in die Datei", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.locator(".hydration-card")).toBeVisible();
    expect(await readDisplayedMl(page)).toBe(0);

    await addButton(page).click();

    await expect
      .poll(async () => readDisplayedMl(page))
      .toBe(250);
    await expect.poll(async () => getTodayMl(request)).toBe(250);
  });

  test("summiert mehrere +250 ml Klicks korrekt auf (Regressionstest für den Berechnungsfehler)", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    await addButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(250);

    await addButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(500);

    await addButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(750);

    // Der alte Fehler summierte alle in der Datei gespeicherten Tageswerte
    // erneut auf (250 + 500 + 750 = 1500 statt 750).
    await expect.poll(async () => getTodayMl(request)).toBe(750);

    await page.reload();
    expect(await readDisplayedMl(page)).toBe(750);
  });

  test("verringert die Menge korrekt über -250 ml", async ({ page, request }) => {
    await page.goto("/");

    await addButton(page).click();
    await addButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(500);

    await removeButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(250);
    await expect.poll(async () => getTodayMl(request)).toBe(250);
  });

  test("geht nie ins Minus: Button ist bei 0 ml deaktiviert", async ({ page }) => {
    await page.goto("/");
    expect(await readDisplayedMl(page)).toBe(0);

    await expect(removeButton(page)).toBeDisabled();

    await addButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(250);
    await expect(removeButton(page)).toBeEnabled();

    await removeButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(0);
    await expect(removeButton(page)).toBeDisabled();
  });

  test("Randfall: wiederholtes Verringern bleibt bei 0 ml stehen, auch über mehrere Reloads", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    await addButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(250);

    await removeButton(page).click();
    await expect.poll(async () => readDisplayedMl(page)).toBe(0);

    await page.reload();
    expect(await readDisplayedMl(page)).toBe(0);
    await expect(removeButton(page)).toBeDisabled();
    expect(await getTodayMl(request)).toBe(0);
  });

  test("Randfall: ein direkter API-Aufruf mit negativem Wert wird auf 0 ml begrenzt", async ({
    request,
  }) => {
    const response = await request.post(`${apiBase}/bookings`, {
      data: {
        entryType: "hydration",
        value: -250,
        description: "Trinkmenge",
        note: "-250 ml",
      },
    });
    expect(response.ok()).toBeTruthy();

    expect(await getTodayMl(request)).toBe(0);
  });

  test("Randfall: mehrere Tageseinträge summieren sich nicht auf, nur der letzte Stand pro Tag zählt", async ({
    request,
  }) => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayIso = yesterday.toISOString();

    writeFileSync(
      testHydrationCsvPath,
      [
        "date;hydrationMl",
        `${yesterdayIso};250`,
        `${yesterdayIso};500`,
        `${yesterdayIso};750`,
      ].join("\n") + "\n",
      "utf8",
    );

    const response = await request.get(`${apiBase}/dashboard?limit=1`);
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as {
      hydration: { todayMl: number; history: Array<{ date: string; value: number }> };
    };

    expect(payload.hydration.todayMl).toBe(0);
    expect(payload.hydration.history[0].value).toBe(750);
  });
});
