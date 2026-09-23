## Context

The existing web app (see `openspec/project.md`) is a React/Vite frontend plus a plain-Node HTTP server, with its own CI workflow (`ci-test-pipeline`, `.github/workflows/test.yml`). This design describes the foundational Android project scaffold — the Gradle project itself, its core dependencies, and a path-conditional extension of the same CI workflow — that every other `add-android-*` capability builds on top of, without disturbing the existing web CI guarantee.

## Tech Stack

- **Language**: Kotlin 2.3.21 (JVM target 17), single Gradle module under `android/` (AGP 9.4.0).
- **UI**: Jetpack Compose (Material 3), BOM `2026.08.00`, `androidx-navigation-compose` 2.9.5 for in-app navigation.
- **Persistence**: Room 2.8.2 (`room-runtime`/`room-ktx`, KSP-generated DAOs) — the system of record for movement entries, hydration entries, and the settings row; no DataStore/SharedPreferences (see D2/D3).
- **Background work**: WorkManager 2.11.0 for periodic bookkeeping/backfill; platform `AlarmManager` (no library dependency) for exact on-the-hour notification firing (see D4).
- **Build config**: `minSdk = 33`, `compileSdk`/`targetSdk = 37` (see D9); `android/gradle/libs.versions.toml` is the single source of truth for dependency versions — check it before assuming a version.
- **Testing**: JUnit 4.13.2 + `androidx-ui-test-junit4`/`createComposeRule` for JVM/Compose unit tests (`app/src/test/`, run via `./gradlew testDebugUnitTest`); `androidx-junit`/`espresso-core` for instrumented tests (`app/src/androidTest/`, run via `./gradlew connectedAndroidTest`).
- See `android/CLAUDE.md` for commands, architecture conventions, and cross-cutting rules that apply to all `add-android-*` changes.

## Goals / Non-Goals

**Goals:**
- A buildable Android project (Kotlin + Compose) exists under `android/`, independent of the root npm/Vite toolchain, before any capability-specific screen or scheduling code is written.
- CI runs Android tests only for Android-relevant changes, and web tests only for web-relevant changes, without either suite blocking on the other.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions.

## Decisions

### D1: Native Kotlin + Jetpack Compose, single-module app
**Decision:** Build with Kotlin and Jetpack Compose (Material 3) rather than Java/Views, a cross-platform framework (Flutter/React Native/KMP-with-shared-UI), or a WebView wrapper around the existing React app.
**Why:** Compose is Google's current recommended UI toolkit, has first-class support for the layout/animation work needed across the app's screens and for custom drawing (`Canvas`). A WebView wrapper was rejected because it would inherit exactly the reliability problems (background timers, notification permissions, file access) this change exists to fix. A cross-platform framework was rejected: this is a single-platform app with no near-term second-platform requirement, so the extra abstraction cost isn't justified.
**Alternatives considered:** Flutter (rejected: introduces a second language/toolchain for a single-platform app); Views + XML layouts (rejected: more boilerplate than Compose); WebView wrapper of existing app (rejected: doesn't solve the background-reliability problem that motivates the Android app at all).

### D9: `minSdk` 33, `compileSdk`/`targetSdk` 37
**Decision:** Set `minSdk = 33` (Android 13) and `compileSdk`/`targetSdk = 37` (Android 17).
**Why:** At implementation time, API 37 (platform revision 37.2) is available as a stable (non-beta) SDK platform, and the current Compose BOM (2026.08.00) requires compiling against API 37 or later — Compose UI artifacts in that BOM declare a minimum `compileSdk` of 37, so `compileSdk = 36` fails the build outright. This supersedes the original assumption (recorded when this design was drafted) that API 37 was still in beta; that assumption is no longer current, so `targetSdk` was raised alongside `compileSdk` to stay on a supported, matching pair rather than pinning `targetSdk` behind an available `compileSdk`. `minSdk = 33` is unchanged: chosen over 31 because the exact-alarm permission model (see `android-reminder-scheduling` design.md D4) changed behavior between API 31 and 33, and 33 is the more conservative/current baseline for that API's runtime-permission semantics.
**Alternatives considered:** `minSdk = 31` (rejected: would require handling both the API 31 and API 33 exact-alarm permission variants for no product benefit); pinning `compileSdk = 36` with an older Compose BOM (rejected: forgoes the current, actively-maintained Compose library set for no compatibility benefit); `compileSdk = 37` with `targetSdk` left at 36 (rejected: mismatched pair with no rationale).

### D11: Monorepo — `android/` as an independent Gradle project root alongside the existing web app
**Decision:** The Android app lives in this same repository, under a new top-level directory `android/` (standard Android Studio layout: `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/app/src/{main,test,androidTest}`), fully independent of the root `package.json`/`node_modules`/Vite toolchain. `.gitignore` gains an Android/Gradle block (`android/.gradle/`, `android/**/build/`, `android/local.properties`, `android/.idea/`, `android/captures/`, `android/*.hprof`, `*.apk`, `*.aab`, `*.jks`, `*.keystore`); a new `.gitattributes` pins `android/gradlew text eol=lf` so the Gradle wrapper script's Unix line endings survive contributors' Windows `core.autocrlf` settings (this repo is already developed across both platforms per `project.md`).
**Why:** The two products (web app, Android app) already share this repo's OpenSpec planning artifacts and domain conventions (German UI text, CSV schema, reminder-slot semantics); keeping the code together keeps that context in one place instead of splitting a still-solo-maintained prototype across repos. Gradle and npm/Vite are independent toolchains that don't need to interact — Android Studio opens `android/` directly as its Gradle project root, and the existing `eslint.config.js`/`tsconfig.json` are already scoped to `src/**`/`server/**`/`shared/**`/`*.mjs` and `["src", "shared"]` respectively, so neither picks up `android/` without any further exclusion.
**Alternatives considered:** A separate Android-only repository (rejected: splits the already-unified OpenSpec spec/design/tasks planning across two repos for a single-person prototype, and buys no real benefit); a shared root-level build orchestrator (e.g. a top-level Makefile driving both `npm` and `gradlew`) (rejected: adds a layer of indirection neither toolchain's own CI job needs, see D12).

### D12: Single path-conditional CI workflow instead of two separate ones
**Decision:** `.github/workflows/test.yml` becomes one workflow with a cheap first job (`changes`, using `dorny/paths-filter`) that computes whether the push/PR touched web-relevant paths (`src/**`, `server/**`, `shared/**`, `tests/**`, and root config like `package.json`/`tsconfig.json`/`vite.config.ts`) and/or `android/**`. The existing web test job(s) and a new Android job are each gated with `if: needs.changes.outputs.web == 'true'` / `if: needs.changes.outputs.android == 'true'`. `openspec/**`-only changes trigger neither expensive job.
**Why:** Two independent build/test toolchains (npm/Playwright vs. Gradle) should not re-run each other's suites on unrelated changes. A single workflow with internally gated jobs (rather than two separate workflow files each with their own `on.push.paths`) avoids a specific GitHub Actions failure mode: a status check that's configured as "required" in branch protection but belongs to a path-filtered workflow that never triggers for a given PR sits forever in a pending "Expected" state and blocks merge with no automatic resolution. `main` currently has no branch protection or required checks, but the single-workflow-with-conditional-jobs shape stays correct if that's added later: the workflow itself always runs (stable target for a future required check), while its individual jobs show as cleanly "skipped" — not "failed" or "stuck pending" — when their path condition doesn't match.
**Alternatives considered:** Two separate workflow files (`test.yml` for web, `android-test.yml` for Android), each with its own path filter (rejected: reintroduces the required-check trap described above, and requires keeping two independently-maintained path-filter lists in sync); no path filtering at all (rejected: wastes CI time on unrelated changes and was the reason this decision was requested in the first place).

## Risks / Trade-offs

- [Without CI coverage, regressions in the new Android code would have no automated safety net] → Mitigation: D12's path-conditional CI workflow (`android-ci-pipeline` spec) runs Gradle unit/Compose-UI tests on every `android/**` change, mirroring the existing web app's `ci-test-pipeline` guarantee; see test-plan.md for which specific requirements each test level covers.

## Open Questions

_None._
