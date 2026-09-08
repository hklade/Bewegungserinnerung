## Why

"Bewegungserinnerung" only exists today as a local React/Vite web prototype paired with a plain-Node server, both running on a workstation. That shape does not match how the reminder is actually needed: hourly movement/hydration nudges only work if they reach the person away from their desk, survive OS-level background/Doze restrictions, and fire as a real system notification with sound/vibration — none of which a browser tab reliably provides. This change specifies a standalone native Android app, built from scratch, that reproduces every user-facing capability of the web app on-device, with local persistence and OS-native scheduling, and no server component at all.

## What Changes

- **BREAKING** (new project, not a migration): introduce a new, independent Android application ("Bewegungserinnerung Android") implementing all capabilities of the existing web app; this does not modify or replace the existing `src/`/`server/` web app, which continues to exist unchanged in this repository.
- Quick-entry ("Schnelleingabe") becomes the app's default/start screen and must fit entirely on one screen with no scrolling required, on typical Android phone form factors.
- Reminder scheduling moves from a client-side countdown + server-side backfill split to a single on-device scheduling and backfill model (Android `WorkManager`/`AlarmManager`), replacing the browser popup/Web Audio chime with native Android notifications (sound + vibration).
- The dual, string-heuristic "Zusatzbewegung" (additional-break) detection in the web app (client string-matching on `reminderHeadline` plus a separate server-side `existingForSlot` check) is replaced by a single explicit "slot already answered" flag computed once by the on-device data layer.
- The two overlapping "missed reminder" backfill mechanisms in the web app (`unanswered` entries generated on every dashboard read, and `planned_break_response`/`value:0` entries generated on every booking write) are unified into one deterministic backfill rule evaluated on a single schedule.
- CSV import/export is retained as the interchange format, but the transport mechanism changes from browser download/file-input to Android's Storage Access Framework (SAF) and Share intents; a destructive-import confirmation dialog is retained.
- All persistence moves from semicolon/comma-delimited CSV files on a server filesystem to on-device local storage (see design.md for the storage technology decision); CSV becomes purely an import/export exchange format, not the system of record.
- The client/server split is eliminated entirely: there is no HTTP API, no separate server process, and no shared-host CORS/networking concerns — the app is single-user and fully on-device.
- German UI text and domain vocabulary (Schnelleingabe, Trinkmanager, Bewegungserinnerung, Zusatzbewegung, etc.) are preserved unchanged.

## Capabilities

### New Capabilities
- `android-quick-entry`: The default, one-screen quick-entry flow for logging an activity level (0–4) and free-text note against the currently active reminder slot.
- `android-reminder-scheduling`: On-device hourly reminder scheduling between configurable start/end times, weekday-only eligibility, native notifications with sound/vibration, countdown display, and the unified missed/unanswered backfill rule.
- `android-hydration-tracking`: The "Trinkmanager" daily hydration goal, +250 ml/−250 ml logging, and progress/overflow display.
- `android-day-week-evaluation`: Day picker (last 14 active days) with per-day stats and hourly bar chart, plus the 7-day × hourly-slot heatmap.
- `android-activity-history`: The recent-activity list (date, planned time, delay, value, description/note, type) with expand/collapse.
- `android-csv-import-export`: CSV export via Share/SAF and full-replace CSV import with a destructive-action confirmation, using the same CSV schema as the web app where practical.
- `android-settings-configuration`: The settings screen covering reminder on/off, start/end time, weekdays-only, hydration goal, tone/vibration on/off with a test action, and export location.

### Modified Capabilities
_None._ This change does not alter any existing spec — the current web app's specs (`ci-test-pipeline`, `cross-platform-dev-tooling`, `server-environment-isolation`) describe the existing Node/CSV server and are unaffected, since the Android app has no server component.

## Impact

- **New code**: an entirely new Android project (not yet present in this repository — see design.md for proposed location and module layout). No existing `src/`, `server/`, or `shared/` files are modified.
- **New build/tooling**: Gradle-based Android build, a new CI concern (out of scope for this change beyond noting it in tasks.md) separate from the existing `npm run test:e2e`/`test:server` pipeline.
- **Dependencies**: none of the existing npm dependencies are affected; the Android project brings its own dependency set (see design.md).
- **Data compatibility**: CSV files produced by the existing web app should remain importable by the Android app's CSV import (same delimiter/column conventions), so a user can carry existing history over; this is a design constraint, not a live sync between the two apps.
- **No shared runtime**: the Android app and the existing web app are two independent products; they do not talk to each other, share a server, or share a database.
