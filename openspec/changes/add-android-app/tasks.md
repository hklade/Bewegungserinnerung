## 1. Project setup

- [ ] 1.1 Create new Android project (Kotlin, Jetpack Compose/Material 3, single module) under a new top-level directory (e.g. `android/`) in this repo, and verify it builds and runs an empty "Hello" screen on an emulator/device
- [ ] 1.2 Add Room, WorkManager, and Compose Navigation dependencies to the Gradle build, and verify a clean `./gradlew assembleDebug` succeeds
- [ ] 1.3 Define the target `minSdk`/`compileSdk`/`targetSdk` values (resolving design.md's open question on exact-alarm permission behavior per API level), and document the choice in the project's README/module notes
- [ ] 1.4 Set up the app's Compose theme (Material 3, portrait-first) and verify it renders on the reference device profile from design.md (411dp × 891dp emulator profile)

## 2. Data layer (Room)

- [ ] 2.1 Define the Room entity and DAO for movement activity entries, matching the CSV-compatible field set from design.md (D7), and verify with a unit test that insert/query round-trips all fields
- [ ] 2.2 Define the Room entity and DAO for hydration log entries (timestamp + absolute daily ml amount), and verify with a unit test that querying "today's total" returns the latest entry for the day, not a sum
- [ ] 2.3 Define the Room entity/DAO for the single settings row (reminder window, weekdays-only, hydration goal, tone enabled, export location), seeded with defaults on first run, and verify a unit test confirms defaults are returned before any explicit save
- [ ] 2.4 Implement the shared reminder-slot computation module (hourly slots from start/end time, fallback rules, weekday eligibility) per `android-reminder-scheduling` requirements, and verify unit tests cover: default 10-slot window, end-before-start fallback, unparseable-time fallback, and weekend exclusion
- [ ] 2.5 Implement the single authoritative slot-status computation (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`) as one shared function consumed by all screens, and verify unit tests cover all four status transitions from `android-reminder-scheduling`'s "authoritative answer status" requirement

## 3. Reminder scheduling & notifications

- [ ] 3.1 Implement `AlarmManager`-based exact alarm scheduling for the next eligible reminder slot, and verify with an instrumented test (or manual device test) that a notification fires at the scheduled time while the app is backgrounded
- [ ] 3.2 Implement the `BroadcastReceiver` for `ACTION_BOOT_COMPLETED` that re-arms the next alarm after device restart, and verify manually (reboot emulator/device with reminders enabled, confirm next alarm is scheduled)
- [ ] 3.3 Implement the `WorkManager` periodic/chained job that re-arms the following alarm after each fire and runs the unified backfill check (per `android-reminder-scheduling`'s single-backfill-rule requirement), and verify a unit test confirms a slot >59 minutes past due with no entry gets exactly one `Unanswered` record, with no duplicate on repeated runs
- [ ] 3.4 Implement runtime request/detection of the exact-alarm permission (`SCHEDULE_EXACT_ALARM`/`canScheduleExactAlarms`) with an in-app warning if revoked, and verify manually by revoking the permission in system settings and confirming the warning appears
- [ ] 3.5 Implement tone/vibration playback on notification fire, gated by the tone-enabled setting, and a settings "test tone" action that plays it on demand without creating any entry or schedule change; verify manually and with a unit test that "test tone" does not write to any DAO
- [ ] 3.6 Implement the live countdown-to-next-reminder computation consumed by the UI, and verify unit tests cover: enabled/eligible day, reminders-off state, and weekend-skipping to next weekday

## 4. Quick-entry screen (default screen)

- [ ] 4.1 Build the quick-entry Compose screen as the app's start destination, reachable from cold start, launcher icon, and tapping a reminder notification; verify manually that all three entry points land on quick-entry
- [ ] 4.2 Implement the 5-option activity level selector (2-row grid per design.md D8) defaulting to value 1, and verify a Compose UI test confirms default selection and that tapping another option changes selection
- [ ] 4.3 Implement the free-text note field (optional, cleared after save) and the save action that creates an entry classified by the current slot's authoritative status (primary vs. additional), per `android-quick-entry`; verify a unit/integration test for both the "first save" and "second save for already-answered slot" scenarios
- [ ] 4.4 Implement the current-slot-time display (or "no active reminder" state) on the quick-entry screen, and verify manually for both the enabled/eligible and disabled/ineligible cases
- [ ] 4.5 Verify the full quick-entry screen fits without scrolling on the reference device profile (411dp × 891dp) and on a smaller reference (~360dp × 640dp), per `android-quick-entry`'s one-screen requirement — capture screenshots at both sizes as the verification artifact
- [ ] 4.6 Implement error handling for a failed save (error state shown, note field preserved, not cleared), and verify with a unit/integration test that simulates a storage failure

## 5. Hydration tracking

- [ ] 5.1 Build the hydration card/screen showing today's logged amount vs. configured goal with a proportional progress indicator, and verify manually against a few sample amounts/goals
- [ ] 5.2 Implement +250 ml / −250 ml actions with optimistic UI update, persistence, and rollback-on-failure, and verify unit tests for: normal increment/decrement, floor-at-zero disabling of decrement, and rollback on simulated failure
- [ ] 5.3 Implement the overflow indicator shown when logged amount exceeds the goal, and verify a Compose UI test confirms the overflow indicator appears only when amount > goal

## 6. Day/week evaluation

- [ ] 6.1 Implement the day picker limited to today plus the last 13 days with activity, and verify a unit test confirms days without any entries are excluded (except today)
- [ ] 6.2 Implement per-day stats (answered/primary count, additional count, unanswered count, average delay over answered slots only), and verify unit tests reproduce the three example scenarios in `android-day-week-evaluation`
- [ ] 6.3 Implement the hourly bar chart for the selected day (hours-with-entries only) plus its empty-state message, and verify manually with a day that has partial-hour coverage and a day with zero entries
- [ ] 6.4 Implement the 7-day × hourly-slot heatmap (active days only, average-value color intensity, visually distinct empty cells), and verify manually against a dataset with fewer than 7 active days and one with 7+

## 7. Activity history

- [ ] 7.1 Implement the activity history list showing date/planned time/delay/value/description/type per row, excluding `Unanswered`-status entries, and verify a unit test confirms unanswered slots are excluded from the list but present in day/week counts
- [ ] 7.2 Implement the default 5-row view with expand/collapse to a bounded maximum, and verify a Compose UI test covers expand and collapse actions

## 8. CSV import/export

- [ ] 8.1 Implement CSV export of movement activity entries using the compatible column set/delimiter from design.md (D7), excluding hydration data, and verify a unit test round-trips a known entry set into the expected CSV text
- [ ] 8.2 Wire export to the Android system share/save flow (SAF and/or Share intent), and verify manually that the resulting file can be opened/shared
- [ ] 8.3 Implement the `.csv`-extension file-selection restriction for import, and verify a unit test rejects a non-CSV file before any confirmation step
- [ ] 8.4 Implement the destructive-import confirmation dialog (naming the file, warning of full replacement) and the full-replace import logic, and verify unit/integration tests for: confirm-replaces-all, cancel-changes-nothing
- [ ] 8.5 Implement tolerant CSV parsing (alternate column names, defaulted missing fields) and the post-import row-count/skipped-row report, and verify with a test importing a CSV exported by the existing web app (`data/Bewegungsdaten.csv` schema) and confirming zero skipped rows
- [ ] 8.6 Implement rejection of unreadable/unparseable files before any existing data is deleted, and verify a test confirms existing data is untouched after a failed import attempt

## 9. Settings screen

- [ ] 9.1 Build the settings screen reachable via one navigation action from quick-entry, and verify manually it is not shown on cold start
- [ ] 9.2 Implement reminder settings (enabled, start time, end time, weekdays-only) with explicit save and immediate effect on scheduling, and verify unit/integration tests for: toggle takes effect without restart, window change reschedules, weekdays-only change takes effect going forward
- [ ] 9.3 Implement the hydration goal input with validation/fallback-to-default, and verify a unit test covers valid input and invalid-input-falls-back-to-2L
- [ ] 9.4 Implement the tone/vibration toggle and its "test" action wiring to the module built in 3.5, and verify the test action is disabled when tone is off
- [ ] 9.5 Implement the export-location picker (Android-native storage/document picker, replacing the web app's free-text path field) and wire it as the default destination for the export flow from 8.2, and verify manually
- [ ] 9.6 Implement explicit save/confirmation/error states for the settings screen (no autosave-on-change), and verify a unit/integration test confirms navigating away without saving leaves prior settings in effect

## 10. Cross-cutting verification

- [ ] 10.1 Run a full manual pass of all seven capability specs (`android-quick-entry`, `android-reminder-scheduling`, `android-hydration-tracking`, `android-day-week-evaluation`, `android-activity-history`, `android-csv-import-export`, `android-settings-configuration`) against a physical or emulated device, checking every scenario listed in each spec file
- [ ] 10.2 Verify reminders survive Doze mode using `adb shell dumpsys deviceidle` to force idle state, confirming notification delivery tolerance per `android-reminder-scheduling`
- [ ] 10.3 Document, as a follow-up (not part of this change), the need for an Android CI pipeline (lint, unit tests, instrumented tests) analogous to the existing web app's `npm run test:server`/`npm run test:e2e`, per design.md's noted risk
