## Purpose

Maps every requirement in the `android-ci-pipeline` capability spec to the test level that verifies it, so implementation and review can see at a glance what's automatable in CI (and at which level) versus what genuinely requires a physical device and a human.

## Test-level taxonomy

| Level | Name | Runs where | Notes |
|---|---|---|---|
| 1 | Unit (JVM) | JVM, no device/emulator | JUnit, plain Kotlin functions, Room DAOs via `Room.inMemoryDatabaseBuilder` (Room supports this fully on-JVM, no emulator needed) |
| 2 | Compose UI test | JVM or emulator, no real device needed | `createComposeRule`/`createAndroidComposeRule`, screen-level interaction assertions |
| 3 | Instrumented — automatable | CI emulator (e.g. `reactivecircus/android-emulator-runner`) | `androidTest`: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, AlarmManager behavior via emulator or Robolectric shadow |
| 4 | Instrumented — device-only | Real or emulated device, not headless-CI-automatable | Real notification delivery timing while backgrounded, boot-completed receiver (needs a real/emulated reboot), exact-alarm permission revocation flow |
| 5 | Manual | Physical device, human-in-the-loop | Doze/App Standby real-world delay tolerance, OEM battery-optimization behavior, visual one-screen-fit verification across device sizes |

## `android-ci-pipeline`

| Requirement | Level | Representative test location/name | Notes |
|---|---|---|---|
| CI runs the Android test job only when Android-relevant paths change | 4 | Real push/PR verification against GitHub Actions (task 2.3–2.4) | Path-filter behavior is a property of the CI platform itself, not unit-testable |
| The Android job runs the Gradle unit and Compose UI test suites | 3 | CI run of `./gradlew testDebugUnitTest`, observed to fail the workflow on a deliberately broken test | |
| Android test reports are published as CI artifacts | 4 | Real CI run verification that the Gradle HTML/JUnit XML artifacts are attached and downloadable | |
| Path-scoped triggers remain safe for future required-status-check use | 4 | Real CI run verification that the workflow always starts and unmatched jobs show as skipped, not pending | |
