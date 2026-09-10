## Purpose

Maps every requirement in the `android-csv-import-export` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-csv-import-export` (optional)

Not required for the app to be usable end-to-end (see tasks.md) — only for carrying data over from the web app or backing up/restoring locally.

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Movement activity data can be exported as CSV | 1 | Unit test round-tripping a known entry set into the expected CSV text (task 1.1) | |
| Hydration data is not part of the movement CSV export | 1 | Unit test asserting exported CSV contains no hydration columns/rows | |
| Importing a CSV file fully replaces existing movement activity data | 3 | Instrumented test against a real Room database: confirm-replaces-all, cancel-changes-nothing (task 1.4) | Needs a real DB transaction, not just a pure function |
| Import tolerates minor schema variation and reports what happened | 1 | Unit test importing the existing web app's `data/Bewegungsdaten.csv` schema, confirming zero skipped rows (task 1.5) | |
| Only files with a CSV extension can be selected for import | 1 | Unit test rejecting a non-`.csv` file before any confirmation step | |
