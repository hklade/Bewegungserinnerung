## Purpose

Maps every requirement in the `android-day-week-evaluation` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-day-week-evaluation`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| The user can select among the last 14 active days | 1 | Unit test: day picker excludes days without entries except today | |
| Per-day statistics summarize completed, additional, and missed reminders | 1 | Unit test reproducing the spec's mixed-outcome and average-delay-excludes-unanswered scenarios | |
| An hourly chart shows activity level over the selected day | 2 | Compose UI test: bars only for hours with entries; empty-state message on zero entries | |
| A 7-day heatmap shows activity by day and hour | 2 | Compose UI test: column count matches active-day count; empty cells visually distinct from data cells | |
