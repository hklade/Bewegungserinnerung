## Why

The existing web app's quick-entry ("Schnelleingabe") flow only works while a browser tab is open on a desktop; it does not reach the person away from their desk, and its dual client/server "already answered" heuristic can disagree with itself. This change specifies the default, one-screen quick-entry flow for the standalone Android app: logging an activity level (0-4) and free-text note against the currently active reminder slot, with no scrolling required, as the app's first screen from cold start, launcher icon, or a tapped reminder notification.

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup must land first), `add-android-reminder-scheduling` (consumes the single authoritative slot-status computation to classify a save as primary vs. additional/extra, per design.md D5).
Consumed by: `add-android-activity-history`, `add-android-day-week-evaluation` (the entries this screen creates feed their lists/stats).

## What Changes

- Quick-entry becomes the app's default/start screen, reachable from cold start, the launcher icon, and tapping a reminder notification, and must fit entirely on one screen with no scrolling on the reference device profile.
- Presents exactly five mutually-exclusive activity level options (0-4, German labels), defaulting to value 1 ("Mini-Pause"), laid out as a 2-row grid so per-item touch targets stay reasonable even with longer German labels.
- Provides an optional free-text note field; saving with no note uses a default description derived from the selected level's label, and the note field clears after a successful save while the level selection is preserved.
- On save, creates exactly one new activity entry classified as the current slot's primary answer or as an additional/extra entry, based on the single authoritative slot status from `android-reminder-scheduling` — the screen does not independently re-derive this via its own string-heuristic, unlike the web app.
- Displays the current reminder slot's time, or an explicit "no active reminder" indication when reminders are disabled or the day is ineligible.
- Shows an explicit error state (note preserved, not cleared) if a save fails.

## Capabilities

### New Capabilities
- `android-quick-entry`: The default, one-screen quick-entry flow for logging an activity level (0-4) and free-text note against the currently active reminder slot.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: the quick-entry Compose screen and its view-model/save logic, under the Android project's `android/` module (see `add-android-ci-pipeline` for project setup).
- **Data layer**: this capability's task list includes defining the Room entity/DAO for movement activity entries (the CSV-compatible field set), since quick-entry is the first screen that needs to write one; other capabilities (`android-activity-history`, `android-day-week-evaluation`, `android-csv-import-export`) depend on that same entity/DAO rather than redefining it.
- **No shared runtime**: on-device only, no HTTP API, no server.
