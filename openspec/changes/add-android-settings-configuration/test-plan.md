## Purpose

Maps every requirement in the `android-settings-configuration` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-settings-configuration`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| Settings are reachable from a dedicated screen, not the default screen | 2 | Compose UI test: settings not shown on cold start, one navigation action reaches it | |
| The reminder schedule is configurable | 3 | Instrumented test: toggle/window/weekdays-only changes take effect on the real alarm-scheduling path without app restart | Touches WorkManager/AlarmManager re-scheduling, not a pure function |
| The daily hydration goal is configurable in liters | 1 | Unit test: valid input saved and applied; invalid input falls back to 2 L default | |
| Notification tone/vibration is configurable with a test action | 2 | Compose UI test: "test" action disabled when tone is off | |
| The export location is configurable | 5 | Manual verification of the Android-native storage/document picker flow | Picker UX is not meaningfully assertable by an automated test |
| Settings changes are explicitly saved and confirmed | 1 | Unit/integration test: unsaved changes don't apply; save shows success; failed save shows error and preserves prior settings | |
