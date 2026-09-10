## Purpose

Maps every requirement in the `android-quick-entry` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

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
| Quick-entry fits entirely on one screen without scrolling | 5 | Manual screenshot verification at the D8 reference size and a smaller profile (task 2.5) | Visual layout fit isn't meaningfully assertable by a headless test |
| The user selects one activity level from five options | 2 | Compose UI test: default selection = value 1, tap changes selection | |
| The user can enter a free-text note for the activity | 2 | Compose UI test: save with empty note uses default description; save with typed note preserves it verbatim | |
| Saving a quick-entry creates one activity entry classified by the current slot's status | 1 | Unit test on the save-classification function against each `SlotStatus` value | Depends on `android-reminder-scheduling`'s slot-status function (level 1) |
| The current reminder slot is visible on the quick-entry screen | 2 | Compose UI test: slot time shown when eligible, "no active reminder" shown otherwise | |
