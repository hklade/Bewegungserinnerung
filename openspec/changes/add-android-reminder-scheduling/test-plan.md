## Purpose

Maps every requirement in the `android-reminder-scheduling` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-reminder-scheduling`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Hourly reminder slots are computed from a configurable start and end time | 1 | Unit test: default 10-slot window, end-before-start fallback, unparseable-time fallback, weekend exclusion (task 1.1, 4 separate RED tests) | |
| Reminders are eligible only on configured days | 1 | Unit test on weekday-eligibility function | |
| Reminders can be turned off entirely | 1 | Unit test: scheduling function returns no slots when disabled | |
| A reminder notification fires at each eligible slot time | 4 | Device/emulator test: schedule an alarm a few minutes out, confirm notification appears while backgrounded | Real timing behavior, not meaningfully unit-testable |
| Reminder notifications resume after device restart | 4 | Instrumented test simulating `ACTION_BOOT_COMPLETED`, or manual reboot verification (task 2.2) | |
| Reminder tone and vibration are configurable and independently testable | 1 | Unit test: "test tone" action does not write to any DAO (task 2.5) | |
| A live countdown to the next eligible reminder is shown in the app | 1 | Unit test: enabled/eligible, reminders-off, weekend-skip-to-next-weekday (task 2.6, RED-first per TDD note) | |
| Each reminder slot has exactly one authoritative answer status | 1 | Unit test covering all four `SlotStatus` transitions (task 1.2, RED-first per TDD note) | |
| Unanswered slots are backfilled by a single, deterministic rule | 1 | Unit test: slot >59 min late with no entry gets exactly one `Unanswered` record, idempotent on repeated runs (task 2.3, RED-first per TDD note) | |
