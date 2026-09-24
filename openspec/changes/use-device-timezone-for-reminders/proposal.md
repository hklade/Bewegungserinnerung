## Why

All reminder computations on Android are pinned to `Europe/Vienna` (`ReminderZone.ZONE`, plus a duplicate constant in `QuickEntryViewModel`). On a device in another time zone the reminders fire at Vienna wall-clock times: a `07:55` slot rings at 01:55 in New York, and "Nächster Alarm" shows a time that doesn't match the device clock. Reminders should follow the time the user actually lives by, which is the device's time zone.

## Dependencies

Depends on: `add-android-reminder-scheduling` (owns slot computation, alarms, notification text and backfill; archived into `openspec/specs/android-reminder-scheduling`), `add-android-activity-history` (owns the "Heute"/"Gestern" requirement modified here; that change must be archived first so its main spec exists).
Related: `show-current-time-next-to-next-alarm`. With this change, "Nächster Alarm" and "Aktuelle Zeit" use the same zone.
Consumed by: none.

## What Changes

- Reminder slots are computed at wall-clock times in the device's current time zone. The default `07:55`–`16:55` window rings at 07:55 local time wherever the device is.
- The notification text, the "Nächster Alarm" label, the countdown and weekday eligibility all use the device's time zone.
- New movement entries (quick-entry and backfill) store `date`, `weekday` and `reminderTime` as wall-clock values in the device's time zone at the moment they are written.
- When the device's time zone or clock changes, the next pending alarm is re-armed for the next slot in the new zone, without the user opening the app.
- "Heute"/"Gestern" in the activity history is based on the device's current calendar day instead of Europe/Vienna.
- **Unchanged:** Existing stored entries are not rewritten, and the CSV schema stays as it is.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `android-reminder-scheduling`: adds a requirement that all slot times, alarms, displayed slot times and stored slot fields use the device's current time zone, and that a zone or clock change re-arms the next alarm.
- `android-activity-history`: the "Heute"/"Gestern" requirement is based on the device's time zone instead of Europe/Vienna.

## Impact

- **Changed code** (under `android/app/src/main/kotlin/com/bewegungserinnerung/app/`):
  - `reminder/ReminderZone.kt`: the fixed constant becomes a device-zone lookup.
  - Callers in `reminder/`: `CurrentSlot.kt`, `ReminderSchedule.kt`, `Backfill.kt`, `ReminderNotifier.kt`.
  - `ui/quickentry/QuickEntryViewModel.kt`: its own `ZONE` constant is removed.
  - `ui/history/ActivityHistoryEntry.kt`.
  - `SLOT_LABEL_FORMATTER` in `MainActivity.kt`.
  - A new receiver for `ACTION_TIMEZONE_CHANGED` / `ACTION_TIME_CHANGED` in `AndroidManifest.xml`.
- **Tests:** Existing tests that rely on Vienna implicitly now pass the zone explicitly. New tests cover a non-Vienna zone and re-arming after a zone change.
- **Docs:** `android/CLAUDE.md` (zone rule) and the KDoc in `ReminderZone.kt`.
- **Data interchange:** CSV export writes the stored strings unchanged. The web app/server keeps interpreting them as Europe/Vienna, so entries created outside Vienna's zone show local times in the web app. This is accepted, see design.md.
- **Not affected:** the web frontend (`src/`), `server/` and `shared/`. They stay on Europe/Vienna.
