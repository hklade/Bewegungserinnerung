## Why

The existing web app's settings (reminder window, weekdays-only, hydration goal, tone/vibration, export path) live in a server-side JSON config file edited via a browser form, including a free-text filesystem-path field for exports that has no Android equivalent. This change specifies a dedicated on-device settings screen for the standalone Android app, covering the same configuration surface with explicit save/confirm/error states and an Android-native export-location picker in place of the free-text path field.

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup must land first).
Consumed by: `add-android-reminder-scheduling` (reminder window/weekdays-only/tone settings), `add-android-hydration-tracking` (hydration goal), `add-android-csv-import-export` (export-location setting).

## What Changes

- A dedicated settings screen, reachable via one navigation action from quick-entry, is not shown on cold start (quick-entry remains the default screen).
- The reminder schedule (enabled, start time, end time, weekdays-only) is configurable, taking effect immediately without an app restart once saved.
- The daily hydration goal is configurable in liters, falling back to the 2 L default on invalid input.
- Notification tone/vibration is configurable, with a "test" action (disabled when tone is off) that plays the tone/vibration without side effects.
- The export location is configured via an Android-native storage/document picker, replacing the web app's free-text filesystem-path field.
- All settings changes require an explicit save action (no autosave-on-change) and show a clear success confirmation or error state; navigating away without saving leaves prior settings in effect.

## Capabilities

### New Capabilities
- `android-settings-configuration`: The settings screen covering reminder on/off, start/end time, weekdays-only, hydration goal, tone/vibration on/off with a test action, and export location.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: the settings Room entity/DAO (single settings row, seeded with defaults on first run) and the settings Compose screen, under `android/`.
- **Data layer**: this capability's task list includes defining the Room entity/DAO for the single settings row; `android-reminder-scheduling`, `android-hydration-tracking`, and `android-csv-import-export` read from that same row rather than redefining it.
- **No shared runtime**: on-device only, no HTTP API, no server.
