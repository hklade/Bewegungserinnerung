## 1. Single device-zone source (TDD)

- [ ] 1.1 Pin every existing test that relies on the Vienna zone without saying so to an explicit `ZoneId.of("Europe/Vienna")` (via the new `zone` parameter), keeping all assertions unchanged, and verify that `./gradlew testDebugUnitTest` is green before any behaviour change
- [ ] 1.2 Write failing tests for `currentSlotInstant` and the next-slot computation with `zone = America/New_York`: the 07:55 slot resolves to 07:55 New York time, and a Saturday in New York that is still Friday in Vienna counts as ineligible under "weekdays only"
- [ ] 1.3 Replace `ZONE` with `reminderZone()` in `ReminderZone.kt` (updating its KDoc), add the `zone: ZoneId = reminderZone()` parameter to `CurrentSlot.kt`, `ReminderSchedule.kt` and `Backfill.kt`, and remove `.withZone(ZONE)` from top-level formatters (design D1) until the tests from 1.2 pass
- [ ] 1.4 Write a failing test that backfill with `zone = America/New_York` writes `date`/`weekday`/`reminderTime` as New York wall-clock values, then make it pass

## 2. Callers and re-arming

- [ ] 2.1 Write failing tests, then implement: `QuickEntryViewModel` with `zone = America/New_York` stores New York `date`/`weekday`/`reminderTime`, its private `ZONE` is removed, and the `MainActivity` slot label and `ReminderNotifier` text are formatted in `reminderZone()` (design D2)
- [ ] 2.2 Write a failing test, then implement: `toActivityHistory`/the relative-date label with `zone = America/New_York` at 2026-09-11T02:00:00Z shows "Heute" for a 2026-09-10 entry
- [ ] 2.3 Add `TimeChangeReceiver` for `TIMEZONE_CHANGED`/`TIME_SET` to the manifest and code (design D3), and verify with a Robolectric test that receiving either broadcast calls the scheduler and replaces the pending alarm instead of adding a second one

## 3. Docs and verification

- [ ] 3.1 Remove the transition note from the zone rule in `android/CLAUDE.md`, so it only states the device-zone rule, now that the code matches it
- [ ] 3.2 Run `./gradlew testDebugUnitTest lint` in `android/` and fix all findings (`NewApi` for `java.time` at `minSdk = 33`)
- [ ] 3.3 Manual pass on an emulator: set the time zone to `America/New_York` and check that "Nächster Alarm", the notification time and the stored entry's `reminderTime` show New York times; switch the zone while the app is closed and check that the next alarm fires at the new local slot time
