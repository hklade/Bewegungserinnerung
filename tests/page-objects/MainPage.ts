import type { Download, Locator, Page } from "@playwright/test";

/**
 * Page Object Model für die Bewegungserinnerung-Hauptseite (src/App.tsx).
 * Deckt Hero-Panel (Schnelleingabe), Auswertung (Tag/Woche), Aktivitätsliste,
 * CSV-Import/-Export, Trinkmanager und Konfigurationskarte ab.
 */
export class MainPage {
  readonly page: Page;

  // Hero panel / Schnelleingabe
  readonly heroPanel: Locator;
  readonly heroSubtitle: Locator;
  readonly statusPill: Locator;
  readonly activityInput: Locator;
  readonly saveEntryButton: Locator;

  // Auswertung (Tag/Woche)
  readonly evaluationPanel: Locator;
  readonly dayTabButton: Locator;
  readonly weekTabButton: Locator;
  readonly dayPickerSelect: Locator;
  readonly heatmapCard: Locator;

  // Aktivitätenliste
  readonly activitiesPanel: Locator;
  readonly activitiesRows: Locator;
  readonly showMoreActivitiesButton: Locator;
  readonly exportCsvButton: Locator;
  readonly importCsvButton: Locator;
  readonly importFileInput: Locator;

  // Countdown
  readonly countdownCard: Locator;
  readonly countdownValue: Locator;

  // Trinkmanager
  readonly hydrationCard: Locator;
  readonly hydrationMeta: Locator;
  readonly addHydrationButton: Locator;
  readonly removeHydrationButton: Locator;

  // Konfigurationskarte
  readonly configCard: Locator;
  readonly hourlyReminderCheckbox: Locator;
  readonly weekdaysOnlyCheckbox: Locator;
  readonly exportPathInput: Locator;
  readonly reminderStartTimeInput: Locator;
  readonly reminderEndTimeInput: Locator;
  readonly dailyDrinkLitersInput: Locator;
  readonly testReminderToneButton: Locator;
  readonly reminderToneCheckbox: Locator;
  readonly saveConfigButton: Locator;

  // Reminder-Toast
  readonly reminderToast: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heroPanel = page.locator(".hero-panel");
    this.heroSubtitle = page.locator(".hero-subtitle");
    this.statusPill = this.heroPanel.locator(".status-pill");
    this.activityInput = page.getByPlaceholder("Was hast du gemacht?");
    this.saveEntryButton = page.getByRole("button", { name: "Eintrag speichern" });

    this.evaluationPanel = page.locator(".evaluation-panel");
    this.dayTabButton = page.getByRole("button", { name: "Tagesauswertung" });
    this.weekTabButton = page.getByRole("button", { name: "Wochen-Heatmap" });
    this.dayPickerSelect = page.locator(".day-picker select");
    this.heatmapCard = page.locator(".heatmap-card");

    this.activitiesPanel = page.locator(".activities-panel");
    this.activitiesRows = page.locator(".activities-row");
    this.showMoreActivitiesButton = page.getByRole("button", {
      name: /Weitere anzeigen|Weniger anzeigen/,
    });
    this.exportCsvButton = page.getByRole("button", { name: "CSV-Daten exportieren" });
    this.importCsvButton = page.getByRole("button", {
      name: /CSV-Daten importieren|Import läuft/,
    });
    this.importFileInput = page.locator('input[type="file"]');

    this.countdownCard = page.locator(".countdown-card");
    this.countdownValue = page.locator(".countdown-value");

    this.hydrationCard = page.locator(".hydration-card");
    this.hydrationMeta = page.locator(".hydration-meta strong");
    this.addHydrationButton = page.getByRole("button", { name: "+ 250 ml" });
    this.removeHydrationButton = page.getByRole("button", { name: "- 250 ml" });

    this.configCard = page.locator(".config-card");
    this.hourlyReminderCheckbox = page.locator(
      '.config-switch--primary input[type="checkbox"]',
    );
    this.weekdaysOnlyCheckbox = page.locator(
      '.config-switch--slider input[type="checkbox"]',
    );
    this.exportPathInput = page.getByLabel("Exportdatei:");
    this.reminderStartTimeInput = page.getByLabel("Startzeit");
    this.reminderEndTimeInput = page.getByLabel("Endzeit");
    this.dailyDrinkLitersInput = page.getByLabel("Tägliche Trinkmenge (l)");
    this.testReminderToneButton = page.getByRole("button", { name: "Jetzt testen" });
    this.reminderToneCheckbox = page.locator(
      '.config-switch--link input[type="checkbox"]',
    );
    this.saveConfigButton = page.getByRole("button", {
      name: /Einstellungen speichern|Speichert/,
    });

    this.reminderToast = page.locator(".reminder-toast");
  }

  async goto(url = "/") {
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
  }

  // --- Schnelleingabe -----------------------------------------------------

  /** Wählt eine Aktivitätslevel-Karte über ihren Titel (z. B. "Aktive Pause"). */
  scoreCardByTitle(title: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(title) });
  }

  async selectScore(title: string) {
    await this.scoreCardByTitle(title).click();
  }

  async fillActivity(text: string) {
    await this.activityInput.fill(text);
  }

  async submitQuickEntry(activityText?: string, scoreTitle?: string) {
    if (scoreTitle) {
      await this.selectScore(scoreTitle);
    }
    if (activityText !== undefined) {
      await this.fillActivity(activityText);
    }
    await this.saveEntryButton.click();
  }

  // --- Auswertung -----------------------------------------------------------

  async switchToDayEvaluation() {
    await this.dayTabButton.click();
  }

  async switchToWeekEvaluation() {
    await this.weekTabButton.click();
  }

  async selectDay(dateIsoValue: string) {
    await this.dayPickerSelect.selectOption(dateIsoValue);
  }

  statCard(label: string): Locator {
    return this.page.locator(".stat-card").filter({ hasText: label });
  }

  // --- Aktivitätenliste -------------------------------------------------

  async activitiesCount() {
    return this.activitiesRows.count();
  }

  activityRowByText(text: string): Locator {
    return this.activitiesRows.filter({ hasText: text });
  }

  async toggleShowMoreActivities() {
    await this.showMoreActivitiesButton.click();
  }

  async exportCsv(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent("download"),
      this.exportCsvButton.click(),
    ]);
    return download;
  }

  /**
   * Importiert eine CSV-Datei über den versteckten File-Input und bestätigt
   * den nativen confirm()-Dialog, den handleImportFileSelected auslöst.
   */
  async importCsv(filePath: string, accept = true) {
    this.page.once("dialog", async (dialog) => {
      if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
    await this.importFileInput.setInputFiles(filePath);
  }

  // --- Trinkmanager -------------------------------------------------------

  async addHydration() {
    await this.addHydrationButton.click();
  }

  async removeHydration() {
    await this.removeHydrationButton.click();
  }

  async readHydrationMl(): Promise<number> {
    const text = await this.hydrationMeta.innerText();
    const match = text.match(/(\d+)\s*ml/);
    return match ? Number(match[1]) : NaN;
  }

  // --- Konfiguration --------------------------------------------------------

  async setHourlyReminderEnabled(enabled: boolean) {
    const isChecked = await this.hourlyReminderCheckbox.isChecked();
    if (isChecked !== enabled) {
      await this.hourlyReminderCheckbox.click();
    }
  }

  async setWeekdaysOnly(enabled: boolean) {
    const isChecked = await this.weekdaysOnlyCheckbox.isChecked();
    if (isChecked !== enabled) {
      await this.weekdaysOnlyCheckbox.click();
    }
  }

  async setExportPath(path: string) {
    await this.exportPathInput.fill(path);
  }

  async setReminderWindow(startTime: string, endTime: string) {
    await this.reminderStartTimeInput.fill(startTime);
    await this.reminderEndTimeInput.fill(endTime);
  }

  async setDailyDrinkLiters(liters: number) {
    await this.dailyDrinkLitersInput.fill(String(liters));
  }

  async saveConfig() {
    await this.saveConfigButton.click();
  }
}
