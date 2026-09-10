## Context

The existing web app's quick-entry flow duplicates "is this slot already answered" logic between client (`src/App.tsx` string-matching on `reminderHeadline`) and server (`existingForSlot` check), sometimes disagreeing. On Android there is a single process, so quick-entry reads one authoritative status computed by the data layer (owned by `android-reminder-scheduling`) instead of re-deriving it.

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
- Quick-entry is reachable and fully usable within one screen, zero scrolling, on a baseline device profile (see D8).
- Saving an entry classifies it as primary vs. additional/extra using the single shared slot-status computation, never an independent heuristic.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions; German copy carries over as-is.
- No tablet-specific or landscape-optimized layout beyond what falls out naturally from a responsive one-screen design.

## Decisions

### D1: Native Kotlin + Jetpack Compose, single-module app
**Decision:** Build with Kotlin and Jetpack Compose (Material 3) rather than Java/Views, a cross-platform framework (Flutter/React Native/KMP-with-shared-UI), or a WebView wrapper around the existing React app.
**Why:** Compose is Google's current recommended UI toolkit and has first-class support for the adaptive layout work needed for the one-screen quick-entry constraint (`BoxWithConstraints`/`Scaffold` sizing). A WebView wrapper was rejected because it would inherit exactly the reliability problems (background timers, notification permissions, file access) the overall Android app exists to fix.
**Alternatives considered:** Flutter (rejected: second language/toolchain for a single-platform app); Views + XML layouts (rejected: more boilerplate for the one-screen adaptive layout than Compose); WebView wrapper (rejected: doesn't solve the background-reliability problem at all).

### D2: Room (SQLite) as system of record; CSV is import/export-only
**Decision:** Persist movement entries in a local Room database. CSV is never read from or written to as the live store.
**Why:** Room gives typed queries, migrations, and transactional writes for free, which matters once quick-entry writes can race with a background backfill job. This capability owns the movement entity/DAO definition (see Impact in proposal.md) since it's the first screen that needs to write one.
**Alternatives considered:** Keep CSV files as the live store on-device (rejected: no atomic multi-row updates, fragile concurrent-write handling with a background alarm receiver).

### D5: Single explicit "slot status" model replaces the dual additional-break heuristic
**Decision:** The data layer computes, for each reminder slot, one authoritative status: `Pending`, `Unanswered`, `Answered`, or `AnsweredWithExtra`. Quick-entry reads this status once (owned by `android-reminder-scheduling`) to decide whether the new entry it writes is the slot's primary answer or an additional/extra entry — there is no separate client-side string-matching step.
**Why:** This directly resolves the "known weak point" of the web app: two independent computations of the same fact could disagree. On Android there's one process and one data layer, so quick-entry only ever consumes the enum, never computes it.
**Alternatives considered:** Keep a heuristic based on notification-shown state (rejected: fragile to process death, no better than querying whether an entry exists for the slot).

### D8: Reference device profile for the "fits on one screen" constraint
**Decision:** The one-screen quick-entry requirement is validated against a baseline profile matching the Samsung Galaxy A36 (6.7", 1080x2340px, ~390ppi, ~412dp x 892dp at density bucket ~2.625, gesture navigation, default system font scale) in portrait, with the five activity-level options laid out as a 2-row chip/card grid (3+2 or similar) rather than a single row or a vertically stacked list, so the control panel's height stays bounded regardless of German label length. Smaller/older devices (< ~360dp x 640dp) may require the note field to shrink but must never require scrolling to reach the save action.
**Why:** "Fits on one screen" is untestable without a concrete reference size; picking one baseline gives design and QA a shared target. A 2-row grid keeps per-item touch targets at a reasonable minimum width even with longer German labels like "Leichte Aktivität".
**Alternatives considered:** Targeting only the smallest supported device (rejected: overly cramped layout for the common case); no reference device at all (rejected: makes the requirement unverifiable); a generic Pixel-class profile (rejected once the Galaxy A36 was known as the concrete target device).

Non-binding visual reference: [design/screen-mockups.html](design/screen-mockups.html) is an HTML mockup (open in a browser) of the quick-entry, settings, and month-evaluation screens at the D8 reference device size, styled after the existing web app's palette/typography. It illustrates layout and information density, not final Material 3 component choices.

## Risks / Trade-offs

- [Splitting one authoritative slot-status enum (D5) across quick-entry, history, and evaluation screens increases the cost of getting the enum's transition rules wrong, since all three consume the same computation] → Mitigation: the enum's transition rules are specified once in `android-reminder-scheduling` (the owning capability) and referenced, not re-derived, here.

## Open Questions

_None._
