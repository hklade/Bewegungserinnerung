## Purpose

Maps every requirement in this change's 7 capability specs to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human. One row per requirement (not per scenario, which would be too fine-grained at 40+ rows and mostly redundant within a requirement; not per capability, which is too coarse — several capabilities span 3+ test levels).

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-quick-entry`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Quick-entry is the app's default screen | 2 | Compose UI test asserting the start destination from cold start / notification tap | |
| Quick-entry fits entirely on one screen without scrolling | 5 | Manual screenshot verification at the D8 reference size and a smaller profile (task 5.5) | Visual layout fit isn't meaningfully assertable by a headless test |
| The user selects one activity level from five options | 2 | Compose UI test: default selection = value 1, tap changes selection | |
| The user can enter a free-text note for the activity | 2 | Compose UI test: save with empty note uses default description; save with typed note preserves it verbatim | |
| Saving a quick-entry creates one activity entry classified by the current slot's status | 1 | Unit test on the save-classification function against each `SlotStatus` value | Depends on `android-reminder-scheduling`'s slot-status function (level 1) |
| The current reminder slot is visible on the quick-entry screen | 2 | Compose UI test: slot time shown when eligible, "no active reminder" shown otherwise | |

## `android-reminder-scheduling`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Hourly reminder slots are computed from a configurable start and end time | 1 | Unit test: default 10-slot window, end-before-start fallback, unparseable-time fallback, weekend exclusion (task 3.4, 4 separate RED tests) | |
| Reminders are eligible only on configured days | 1 | Unit test on weekday-eligibility function | |
| Reminders can be turned off entirely | 1 | Unit test: scheduling function returns no slots when disabled | |
| A reminder notification fires at each eligible slot time | 4 | Device/emulator test: schedule an alarm a few minutes out, confirm notification appears while backgrounded | Real timing behavior, not meaningfully unit-testable |
| Reminder notifications resume after device restart | 4 | Instrumented test simulating `ACTION_BOOT_COMPLETED`, or manual reboot verification (task 4.2) | |
| Reminder tone and vibration are configurable and independently testable | 1 | Unit test: "test tone" action does not write to any DAO (task 4.5) | |
| A live countdown to the next eligible reminder is shown in the app | 1 | Unit test: enabled/eligible, reminders-off, weekend-skip-to-next-weekday (task 4.6, RED-first per TDD note) | |
| Each reminder slot has exactly one authoritative answer status | 1 | Unit test covering all four `SlotStatus` transitions (task 3.5, RED-first per TDD note) | |
| Unanswered slots are backfilled by a single, deterministic rule | 1 | Unit test: slot >59 min late with no entry gets exactly one `Unanswered` record, idempotent on repeated runs (task 4.3, RED-first per TDD note) | |

## `android-hydration-tracking`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Daily hydration goal is configurable in liters | 1 | Unit test: default 2 L applies before any configuration; configured value is used | |
| Hydration intake is logged in fixed 250 ml increments | 1 | Unit test: +250/−250 ml, floor-at-zero disables decrement | |
| Hydration progress is shown against the daily goal | 2 | Compose UI test: progress indicator reflects amount/goal, updates immediately after logging | |
| Exceeding the daily goal is visually distinguished | 2 | Compose UI test: overflow indicator appears only when amount > goal | |
| A hydration log failure does not corrupt today's total | 1 | Unit test: simulated persist failure rolls back the optimistic value | |

## `android-day-week-evaluation`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| The user can select among the last 14 active days | 1 | Unit test: day picker excludes days without entries except today | |
| Per-day statistics summarize completed, additional, and missed reminders | 1 | Unit test reproducing the spec's mixed-outcome and average-delay-excludes-unanswered scenarios | |
| An hourly chart shows activity level over the selected day | 2 | Compose UI test: bars only for hours with entries; empty-state message on zero entries | |
| A 7-day heatmap shows activity by day and hour | 2 | Compose UI test: column count matches active-day count; empty cells visually distinct from data cells | |

## `android-activity-history`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Recent activity entries are listed with full detail | 2 | Compose UI test: row shows date/planned time/delay/value/description/type; no-delay shows explicit placeholder | |
| Unanswered slots are excluded from the primary activity list but included in counts elsewhere | 1 | Unit test on the list-filtering function plus the day/week counts function | |
| The list shows a limited number of entries by default, expandable on demand | 2 | Compose UI test: default 5 rows, expand/collapse actions | |

## `android-csv-import-export` (optional)

Not required for the app to be usable end-to-end (see tasks.md section 10) — only for carrying data over from the web app or backing up/restoring locally.

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Movement activity data can be exported as CSV | 1 | Unit test round-tripping a known entry set into the expected CSV text (task 10.1) | |
| Hydration data is not part of the movement CSV export | 1 | Unit test asserting exported CSV contains no hydration columns/rows | |
| Importing a CSV file fully replaces existing movement activity data | 3 | Instrumented test against a real Room database: confirm-replaces-all, cancel-changes-nothing (task 10.4) | Needs a real DB transaction, not just a pure function |
| Import tolerates minor schema variation and reports what happened | 1 | Unit test importing the existing web app's `data/Bewegungsdaten.csv` schema, confirming zero skipped rows (task 10.5) | |
| Only files with a CSV extension can be selected for import | 1 | Unit test rejecting a non-`.csv` file before any confirmation step | |

## `android-settings-configuration`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Settings are reachable from a dedicated screen, not the default screen | 2 | Compose UI test: settings not shown on cold start, one navigation action reaches it | |
| The reminder schedule is configurable | 3 | Instrumented test: toggle/window/weekdays-only changes take effect on the real alarm-scheduling path without app restart | Touches WorkManager/AlarmManager re-scheduling, not a pure function |
| The daily hydration goal is configurable in liters | 1 | Unit test: valid input saved and applied; invalid input falls back to 2 L default | |
| Notification tone/vibration is configurable with a test action | 2 | Compose UI test: "test" action disabled when tone is off | |
| The export location is configurable | 5 | Manual verification of the Android-native storage/document picker flow | Picker UX is not meaningfully assertable by an automated test |
| Settings changes are explicitly saved and confirmed | 1 | Unit/integration test: unsaved changes don't apply; save shows success; failed save shows error and preserves prior settings | |

## `android-ci-pipeline`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| CI runs the Android test job only when Android-relevant paths change | 4 | Real push/PR verification against GitHub Actions (task 2.3–2.4) | Path-filter behavior is a property of the CI platform itself, not unit-testable |
| The Android job runs the Gradle unit and Compose UI test suites | 3 | CI run of `./gradlew testDebugUnitTest`, observed to fail the workflow on a deliberately broken test | |
| Android test reports are published as CI artifacts | 4 | Real CI run verification that the Gradle HTML/JUnit XML artifacts are attached and downloadable | |
| Path-scoped triggers remain safe for future required-status-check use | 4 | Real CI run verification that the workflow always starts and unmatched jobs show as skipped, not pending | |
