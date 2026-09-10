## Context

The existing web app's recent-activity list is rendered client-side from the server's dashboard payload. On Android there is no server; this design describes the same list computed from local Room queries, filtered using the single authoritative slot-status enum owned by `android-reminder-scheduling` rather than a separate classification.

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
- The activity list reads the same authoritative slot-status enum used elsewhere in the app to decide which entries to exclude (`Unanswered`), not an independent heuristic.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions.

## Decisions

### D5: Single explicit "slot status" model replaces the dual additional-break heuristic
**Decision:** The activity history list excludes entries with `Unanswered` status (computed once by the shared data layer owned by `android-reminder-scheduling`), while still counting them in the day/week statistics owned by `android-day-week-evaluation`. The list does not independently re-derive which entries count as "actually logged."
**Why:** This directly resolves the "known weak point" of the web app: two independent computations of the same fact could disagree. The list only ever consumes the enum, never computes it.
**Alternatives considered:** Filter based on presence/absence of a response timestamp locally (rejected: would duplicate the exact computation this design centralizes elsewhere).

## Risks / Trade-offs

- [Splitting one authoritative slot-status enum (D5) across quick-entry, history, and evaluation screens increases the cost of getting the enum's transition rules wrong, since all three consume the same computation] → Mitigation: the enum's transition rules are specified once in `android-reminder-scheduling` (the owning capability) and referenced, not re-derived, here.

## Open Questions

_None._
