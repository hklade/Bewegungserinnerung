## Purpose

Maps every requirement in the `android-hydration-tracking` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-hydration-tracking`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Daily hydration goal is configurable in liters | 1 | Unit test: default 2 L applies before any configuration; configured value is used | |
| Hydration intake is logged in fixed 250 ml increments | 1 | Unit test: +250/−250 ml, floor-at-zero disables decrement | |
| Hydration progress is shown against the daily goal | 2 | Compose UI test: progress indicator reflects amount/goal, updates immediately after logging | |
| Exceeding the daily goal is visually distinguished | 2 | Compose UI test: overflow indicator appears only when amount > goal | |
| A hydration log failure does not corrupt today's total | 1 | Unit test: simulated persist failure rolls back the optimistic value | |
