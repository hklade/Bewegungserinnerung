## Context

The existing web app exports/imports movement activity data as CSV via browser download/file-input, with a server filesystem `exportPath`. On Android there is no server and no arbitrary filesystem access from a browser; this design describes the same CSV interchange format transported via Android's Storage Access Framework (SAF) and Share intents instead, while keeping the schema itself compatible so files remain portable between the two products.

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
- CSV files exported by the existing web app can be imported into the Android app without a manual conversion step.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync — CSV exchange is a manual, explicit action, not a live sync.
- No account system, no authentication — single implicit local user.

## Decisions

### D2: Room (SQLite) as system of record; CSV is import/export-only
**Decision:** CSV is never read from or written to as the live store — it exists solely as the format for the explicit export and import actions, which replace the entire Room movement-entry table on import.
**Why:** Room gives transactional writes for free, which matters for a full-replace import (all-or-nothing, not a partial merge). CSV as a system-of-record on a phone has no equivalent of a user editing the file directly (unlike the original desktop use case).
**Alternatives considered:** Keep CSV files as the live store on-device (rejected: no atomic multi-row updates, fragile concurrent-write handling); merge-on-import instead of replace (rejected by the source proposal's explicit "replace" semantics, carried over unchanged here).

### D7: CSV schema kept close to the web app's, with additive changes only
**Decision:** Export/import CSV keeps the movement schema's column set and semicolon convention (`id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at`), so files exported from the existing web app import cleanly into the Android app (and vice versa, informally). Where the Android data model needs a field the web schema doesn't have, it will be added as a new trailing column with a tolerant parser (unknown/missing columns default rather than reject), matching the web app's existing tolerant-parsing behavior.
**Why:** Explicit compatibility goal: "CSV files produced by the existing web app should remain importable." Reusing the schema avoids a translation layer and keeps the two products loosely interoperable via file exchange without coupling them.
**Alternatives considered:** A new, Android-native CSV schema (rejected: breaks the stated cross-app portability goal for no benefit).

### D10: Export writes to the public Downloads directory, plus a Share action
**Decision:** CSV export writes the file to the public `Downloads` directory (via `MediaStore`/SAF, not app-private storage) and additionally offers a "Share" action (`Intent.ACTION_SEND`) so the exported file can be sent directly to another app.
**Why:** Downloads is where users expect to find exported files on Android, consistent with how the web app's export already behaves, and the added Share action covers the common next step of sending the export elsewhere without a separate file-manager round trip.
**Alternatives considered:** App-private directory only (rejected: the user can't find or reuse the file without a share action); SAF document picker on every export (rejected: adds a chooser step to every export for no benefit over a fixed, predictable Downloads location plus Share).

## Risks / Trade-offs

- [Moving from CSV-as-store to Room-as-store means existing CSV files are not the live format anymore — a bug in the one-time import mapping could silently drop or misclassify historical rows] → Mitigation: the import step is required to report a row count and any skipped/defaulted rows before committing the replace, not just silently succeed.

## Open Questions

_None._
