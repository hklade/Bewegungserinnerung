import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { defaultConfig, scale } from "./constants.js";
import {
  formatDate,
  formatCurrentDay,
  formatValueLabel,
  toneClassByValue,
  getTypeLabel,
} from "./lib/formatting.js";
import { playReminderTone } from "./lib/reminderTone.js";
import { createBooking } from "./api/dashboardApi.js";
import { StatCard } from "./components/StatCard.js";
import { HeatmapCard } from "./components/HeatmapCard.js";
import { ImportExportPanel } from "./components/ImportExportPanel.js";
import { ConfigSettingsPanel } from "./components/ConfigSettingsPanel.js";
import { useDashboard } from "./hooks/useDashboard.js";
import { useHydrationTracker } from "./hooks/useHydrationTracker.js";
import { useDayWeekEvaluation } from "./hooks/useDayWeekEvaluation.js";
import { useConfigForm } from "./hooks/useConfigForm.js";
import { useCsvImportExport } from "./hooks/useCsvImportExport.js";
import { useReminderPopup } from "./hooks/useReminderPopup.js";

export default function App() {
  const [selectedScore, setSelectedScore] = useState<number>(1);
  const [note, setNote] = useState("Mustereintrag");
  const {
    now,
    dashboard,
    dashboardState,
    setDashboardState,
    configForm,
    setConfigForm,
    drinkProgressMl,
    setDrinkProgressMl,
    selectedDayIso,
    setSelectedDayIso,
    refreshDashboard,
  } = useDashboard();
  const {
    importState,
    importFileInputRef,
    openImportDialog,
    handleImportFileSelected,
    handleExportCsv,
  } = useCsvImportExport({ refreshDashboard });

  const currentConfig = configForm ?? dashboard?.config ?? defaultConfig;
  const {
    drinkGoalMl,
    drinkOverflowMl,
    drinkStepCount,
    drinkOverflowStepCount,
    drinkProgressBlocks,
    drinkOverflowBlocks,
    saveHydrationProgress,
  } = useHydrationTracker({
    drinkProgressMl,
    setDrinkProgressMl,
    dailyDrinkLiters:
      currentConfig.dailyDrinkLiters ?? defaultConfig.dailyDrinkLiters,
    refreshDashboard,
    setDashboardState,
  });
  const { reminderPopup, countdownLabel } = useReminderPopup({
    now,
    currentConfig,
    dashboardState,
  });

  const currentDayLabel = useMemo(() => formatCurrentDay(now), [now]);
  const reminderHeadline = dashboard?.today.reminderHeadline ?? "--:--";
  const reminderTime = dashboard?.today.reminderTime ?? reminderHeadline;
  const activities = dashboard?.activities ?? [];
  const {
    evaluationTab,
    setEvaluationTab,
    showAllActivities,
    setShowAllActivities,
    latestActivities,
    hasMoreActivities,
    availableDayOptions,
    activeDayIso,
    selectedDaySummary,
    selectedDayHourlyBars,
  } = useDayWeekEvaluation({
    activities,
    todayIso: dashboard?.today.todayIso,
    selectedDayIso,
    setSelectedDayIso,
  });
  const { configState, handleConfigSubmit } = useConfigForm({
    editableConfig: currentConfig,
    setConfigForm,
    refreshDashboard,
  });

  async function handleQuickSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const trimmedNote = note.trim();
      const fallbackDescription =
        scale.find((item) => item.value === selectedScore)?.title ?? "Eintrag";
      await createBooking({
        value: selectedScore,
        description: trimmedNote || fallbackDescription,
        note: trimmedNote || fallbackDescription,
        entryType: reminderHeadline.includes("Zusatzbewegung")
          ? "additional_break"
          : "planned_break_response",
      });

      await refreshDashboard();
      setNote("");
    } catch {
      setDashboardState("error");
    }
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />
      <div className="bg-orb orb-c" />

      <header className="app-header panel">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <img
              src="/icons8-hyperaktiver-hauttyp-2-48.png"
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

      <div className="workspace">
        <main className="workspace-main">
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

              <button className="primary-btn primary-btn--compact" type="submit">
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
                      onChange={(event) => setSelectedDayIso(event.target.value)}
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
                      Für den gewählten Tag sind noch keine Einträge vorhanden.
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
              <div className="status-pill">{latestActivities.length} Zeilen</div>
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
                  <span>{item.delayMinutes ? `${item.delayMinutes} Min` : "—"}</span>
                  <span>
                    <span className={`scale-pill tone-${toneClassByValue(item.value)}`}>
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
                  onClick={() => setShowAllActivities((current) => !current)}
                >
                  {showAllActivities ? "Weniger anzeigen" : "Weitere anzeigen"}
                </button>
              </div>
            )}

            <ImportExportPanel
              importState={importState}
              importFileInputRef={importFileInputRef}
              onExportCsv={handleExportCsv}
              onOpenImportDialog={openImportDialog}
              onImportFileSelected={handleImportFileSelected}
            />
          </section>
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

          <section className="panel side-card hydration-card">
            <div className="side-card-title">Trinkmanager</div>
            <div className="hydration-meta">
              <strong>
                {drinkProgressMl} ml / {drinkGoalMl} ml
              </strong>
              <span>
                Tagesziel:{" "}
                {String(currentConfig.dailyDrinkLiters).replace(".", ",")} l
              </span>
            </div>

            <div className="hydration-row">
              <div className="hydration-stack">
                {drinkOverflowMl > 0 && (
                  <div
                    className="hydration-bar hydration-bar--overflow"
                    aria-label="Trinküberschuss"
                  >
                    {Array.from(
                      { length: drinkOverflowStepCount },
                      (_, index) => (
                        <div
                          key={`overflow-${index}`}
                          className={
                            index < drinkOverflowBlocks
                              ? "hydration-segment hydration-segment--overflow filled"
                              : "hydration-segment hydration-segment--overflow"
                          }
                        />
                      ),
                    )}
                  </div>
                )}

                <div className="hydration-bar" aria-label="Trinkfortschritt">
                  {Array.from({ length: drinkStepCount }, (_, index) => (
                    <div
                      key={index}
                      className={
                        index < drinkProgressBlocks
                          ? "hydration-segment filled"
                          : "hydration-segment"
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="hydration-controls">
                <button
                  type="button"
                  className="hydration-button hydration-button--add"
                  onClick={() =>
                    void saveHydrationProgress(drinkProgressMl + 250)
                  }
                >
                  + 250 ml
                </button>
                <button
                  type="button"
                  className="hydration-button hydration-button--remove"
                  onClick={() =>
                    void saveHydrationProgress(
                      Math.max(0, drinkProgressMl - 250),
                    )
                  }
                  disabled={drinkProgressMl <= 0}
                >
                  - 250 ml
                </button>
              </div>
            </div>
          </section>

          <ConfigSettingsPanel
            editableConfig={currentConfig}
            configState={configState}
            defaultDailyDrinkLiters={defaultConfig.dailyDrinkLiters}
            onConfigSubmit={handleConfigSubmit}
            onConfigChange={(updater) =>
              setConfigForm((current) => updater(current ?? currentConfig))
            }
            onTestReminderTone={() =>
              currentConfig.reminderToneEnabled && playReminderTone()
            }
          />
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

