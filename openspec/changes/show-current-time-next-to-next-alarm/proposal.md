## Why

The Android quick-entry screen shows "Nächster Alarm: HH:mm", but not the current time. To judge how far away the reminder is, or whether it has just passed, the user has to look at the system status bar. Showing the current time right next to the reminder indicator makes that comparison immediate.

## Dependencies

Depends on: `add-android-quick-entry` (owns the quick-entry screen and the reminder slot indicator; already archived into `openspec/specs/android-quick-entry`).
Consumed by: none.

## What Changes

- The quick-entry screen shows the current local time (`HH:mm`, in the device's time zone) in the same row as the "Nächster Alarm: HH:mm" indicator, labelled "Aktuelle Zeit: HH:mm".
- The time updates on its own while the screen is visible, at the next full minute at the latest, without user interaction or restarting the app.
- The current time is also shown when there is no active reminder (next to "Keine aktive Erinnerung").
- The existing "Nächster Alarm" / "Keine aktive Erinnerung" texts stay exactly as they are.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `android-quick-entry`: adds a requirement to show a live-updating current time next to the reminder slot indicator. Existing requirements are unchanged, including the one-screen/no-scroll layout.

## Impact

- **Changed code**: `android/app/src/main/kotlin/com/bewegungserinnerung/app/ui/quickentry/QuickEntryScreen.kt` (indicator row plus a new `clock: Clock` parameter), and passing the existing `Clock` through in `MainActivity.kt`.
- **Tests**: new Compose UI tests in `QuickEntryScreenTest.kt`. The existing tests keep passing unchanged, because the new parameter has a default.
- **Not affected**: the web frontend (`src/`), the server, persistence, and reminder scheduling. The web app has no "Nächster Alarm" label.
