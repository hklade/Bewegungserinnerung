## Why

"Bewegungserinnerung" only exists today as a local React/Vite web prototype. This change lays the foundation for a standalone native Android app — the new Gradle project itself, plus path-conditional CI — so that every other Android capability has a project to build against and an automated safety net from the start, without introducing regressions in the existing web app's own CI guarantee (`ci-test-pipeline`).

## Dependencies

Depends on: none — this is the foundational change every other `add-android-*` change depends on.
Consumed by: `add-android-quick-entry`, `add-android-reminder-scheduling`, `add-android-hydration-tracking`, `add-android-day-week-evaluation`, `add-android-activity-history`, `add-android-csv-import-export`, `add-android-settings-configuration` (all require the project scaffold and dependencies set up here before their own code can be added).

## What Changes

- **BREAKING** (new project, not a migration): introduce a new, independent Android application ("Bewegungserinnerung Android") project under a new top-level directory `android/` in this repo; this does not modify or replace the existing `src/`/`server/` web app, which continues to exist unchanged.
- New Kotlin + Jetpack Compose (Material 3), single-module Gradle project, with Room, WorkManager, and Compose Navigation dependencies added.
- `minSdk = 33`, `compileSdk`/`targetSdk = 37`, documented in the project's README/module notes.
- `.gitignore` gains an Android/Gradle block and a new `.gitattributes` pins `android/gradlew text eol=lf`, per design.md D11.
- A portrait-first Compose Material 3 theme is established for all screens to build on.
- `.github/workflows/test.yml` becomes one workflow with a cheap `changes` job (`dorny/paths-filter`) computing `web`/`android` booleans from the diff; the existing web test job(s) are gated on `web` without changing their internal steps, and a new `android-test` job (gated on `android`) runs `./gradlew testDebugUnitTest` and uploads the Gradle HTML/JUnit XML reports as CI artifacts.
- The client/server split is eliminated entirely for the Android product: there is no HTTP API, no separate server process — the app is single-user and fully on-device (established here as the project's foundational shape, elaborated by the other `add-android-*` changes).

## Capabilities

### New Capabilities
- `android-ci-pipeline`: Path-conditional GitHub Actions CI for the Android project (`android/**`), running Gradle unit/Compose UI tests without re-running the web app's suite for Android-only changes or vice versa.

### Modified Capabilities
_None._ This change does not alter any existing spec — `ci-test-pipeline`'s existing web-facing guarantees are preserved unchanged; `android-ci-pipeline` is an independent, additive capability that shares the same workflow file (see design.md D12) but does not alter `ci-test-pipeline`'s behavior for web-relevant changes.

## Impact

- **New code**: an entirely new Android project living in this repository under `android/` (see design.md D11 for the monorepo layout). No existing `src/`, `server/`, or `shared/` files are modified.
- **New build/tooling**: Gradle-based Android build, plus path-conditional CI (design.md D12) extending the existing `.github/workflows/test.yml` rather than introducing a separate pipeline.
- **Dependencies**: none of the existing npm dependencies are affected; the Android project brings its own dependency set (see design.md).
- **No shared runtime**: the Android app and the existing web app are two independent products; they do not talk to each other, share a server, or share a database.
