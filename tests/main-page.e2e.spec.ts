import { expect, test } from "./helpers/config-fixtures";
import { MainPage } from "./page-objects/MainPage";

const baseConfig = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: "07:55",
  reminderEndTime: "16:55",
  weekdaysOnly: true,
  reminderToneEnabled: true,
};

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ request, apiURL }) => {
  const response = await request.put(`${apiURL}/config`, {
    data: { ...baseConfig, showReminderDialog: true },
  });
  expect(response.ok()).toBeTruthy();
});

test("Hauptseite lädt und zeigt die zentralen Panels", async ({ page, appURL }) => {
  const mainPage = new MainPage(page);
  await mainPage.goto(appURL);

  await expect(mainPage.heroPanel).toBeVisible();
  await expect(mainPage.heroSubtitle).toContainText("Zeitpunkt der letzten Erinnerung:");
  await expect(mainPage.activitiesPanel).toBeVisible();
  await expect(mainPage.hydrationCard).toBeVisible();
  await expect(mainPage.configCard).toBeVisible();
});

test("Schnelleingabe: Aktivitätslevel wählen und Eintrag speichern", async ({
  page,
  appURL,
}) => {
  const mainPage = new MainPage(page);
  await mainPage.goto(appURL);

  await mainPage.submitQuickEntry("pom-smoke-test", "Aktive Pause");

  await expect(mainPage.activityRowByText("pom-smoke-test")).toBeVisible({
    timeout: 15_000,
  });
});

test("Auswertung: zwischen Tages- und Wochenansicht wechseln", async ({ page, appURL }) => {
  const mainPage = new MainPage(page);
  await mainPage.goto(appURL);

  await mainPage.switchToWeekEvaluation();
  await expect(mainPage.heatmapCard).toBeVisible();

  await mainPage.switchToDayEvaluation();
  await expect(mainPage.dayPickerSelect).toBeVisible();
});

test("Trinkmanager: +250 ml erhöht die Anzeige", async ({ page, appURL }) => {
  const mainPage = new MainPage(page);
  await mainPage.goto(appURL);

  const before = await mainPage.readHydrationMl();
  await mainPage.addHydration();

  await expect
    .poll(async () => mainPage.readHydrationMl())
    .toBe(before + 250);
});

test("Konfiguration: Exportpfad wird angezeigt und ist editierbar", async ({
  page,
  appURL,
}) => {
  const mainPage = new MainPage(page);
  await mainPage.goto(appURL);

  await expect(mainPage.exportPathInput).toBeVisible();
  await expect(mainPage.saveConfigButton).toBeEnabled();
});
