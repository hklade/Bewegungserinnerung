## Purpose

Maps every requirement in the `android-activity-history` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-activity-history`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Recent activity entries are listed with full detail | 2 | Compose UI test: row shows date/planned time/delay/value/description/type; no-delay shows explicit placeholder | |
| Unanswered slots are excluded from the primary activity list but included in counts elsewhere | 1 | Unit test on the list-filtering function plus the day/week counts function | |
| The list shows a limited number of entries by default, expandable on demand | 2 | Compose UI test: default 5 rows, expand/collapse actions | |
