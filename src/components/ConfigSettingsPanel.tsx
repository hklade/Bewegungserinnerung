import type { FormEvent } from "react";
import type { AppConfig } from "../types.js";

export function ConfigSettingsPanel(props: {
  editableConfig: AppConfig;
  configState: "idle" | "saving" | "saved" | "error";
  defaultDailyDrinkLiters: number;
  onConfigSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onConfigChange: (updater: (current: AppConfig) => AppConfig) => void;
  onTestReminderTone: () => void;
}) {
  const {
    editableConfig,
    configState,
    defaultDailyDrinkLiters,
    onConfigSubmit,
    onConfigChange,
    onTestReminderTone,
  } = props;

  return (
    <section className="panel side-card config-card">
      <div className="side-card-title">Konfiguration & Intervalle</div>

      <form className="config-form" onSubmit={onConfigSubmit}>
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
                  onConfigChange((current) => ({
                    ...current,
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
              onConfigChange((current) => ({
                ...current,
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
              onConfigChange((current) => ({
                ...current,
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
                onConfigChange((current) => ({
                  ...current,
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
                onConfigChange((current) => ({
                  ...current,
                  reminderEndTime: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label className="config-field">
          <span>Tägliche Trinkmenge (l)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={editableConfig.dailyDrinkLiters}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              onConfigChange((current) => ({
                ...current,
                dailyDrinkLiters: Number.isFinite(nextValue)
                  ? nextValue
                  : defaultDailyDrinkLiters,
              }));
            }}
          />
        </label>

        <label className="config-switch config-switch--link">
          <div>
            <span>Audio-Chime abspielen</span>
            <br />
            <small>Spielt akustischen Gong bei Alarm</small>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={onTestReminderTone}
            disabled={!editableConfig.reminderToneEnabled}
          >
            Jetzt testen
          </button>
          <input
            type="checkbox"
            checked={editableConfig.reminderToneEnabled}
            onChange={(event) =>
              onConfigChange((current) => ({
                ...current,
                reminderToneEnabled: event.target.checked,
              }))
            }
          />
        </label>

        <div className="preview-actions">
          <button className="primary-btn primary-btn--wide" type="submit">
            {configState === "saving" ? "Speichert..." : "Einstellungen speichern"}
          </button>
        </div>
      </form>
    </section>
  );
}
