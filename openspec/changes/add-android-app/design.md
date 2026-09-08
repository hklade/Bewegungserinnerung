## Context

The existing web app (see `openspec/project.md`) splits responsibility across a React/Vite frontend, a plain-Node HTTP server, and CSV files as the system of record, with reminder-slot logic duplicated between client (`src/App.tsx` countdown/popup) and server (`server/config.mjs`/`service.mjs` backfill). That split exists only because a browser cannot run background timers reliably or write arbitrary files — constraints that do not apply on Android. This design describes a single-process, on-device Android app with no server, and folds the previously-duplicated reminder logic into one place.

Two behavioral rough edges in the web app inform this design and are explicitly *not* carried over as implemented (see proposal.md "What Changes"):
1. "Zusatzbewegung" (additional-break) detection was computed twice (client string-heuristic + server `existingForSlot` check), sometimes disagreeing.
2. Missed-reminder backfill existed as two overlapping mechanisms (`unanswered` entries written as a side-effect of every dashboard read; `planned_break_response value:0` entries written as a side-effect of every booking write).

## Goals / Non-Goals

**Goals:**
- One deterministic, testable module owns: reminder slot computation, "is this slot already answered" status, and missed-slot backfill — no duplication between UI and background scheduling.
- Quick-entry is reachable and fully usable within one screen, zero scrolling, on a baseline device profile (See Decisions - Reference device profile).
- Reminders keep firing across Doze/App Standby and process death, without requiring the app to be foregrounded or excluded from battery optimization by the user beforehand (exact-alarm fallback aside — see Risks).
- CSV files exported by the existing web app can be imported into the Android app without a manual conversion step.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync. Each is a fully independent, single-user, on-device product.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions; German copy carries over as-is where it still applies.
- No CI/build pipeline setup for the Android project in this change (tracked as a follow-up task item only, not specified here).
- No tablet-specific or landscape-optimized layout beyond what falls out naturally from a responsive one-screen design.

## Decisions

### D1: Native Kotlin + Jetpack Compose, single-module app
**Decision:** Build with Kotlin and Jetpack Compose (Material 3) rather than Java/Views, a cross-platform framework (Flutter/React Native/KMP-with-shared-UI), or a WebView wrapper around the existing React app.
**Why:** Compose is Google's current recommended UI toolkit, has first-class support for the layout/animation work needed for the one-screen quick-entry constraint (adaptive `BoxWithConstraints`/`Scaffold` sizing) and for the heatmap/bar-chart custom drawing (`Canvas`). A WebView wrapper was rejected because it would inherit exactly the reliability problems (background timers, notification permissions, file access) this change exists to fix. A cross-platform framework was rejected: this is a single-platform app with no near-term second-platform requirement, so the extra abstraction cost isn't justified.
**Alternatives considered:** Flutter (rejected: introduces a second language/toolchain for a single-platform app); Views + XML layouts (rejected: more boilerplate for the custom chart/heatmap drawing and one-screen adaptive layout than Compose); WebView wrapper of existing app (rejected: doesn't solve the background-reliability problem that motivates this change at all).

### D2: Room (SQLite) as system of record; CSV is import/export-only
**Decision:** Persist movement entries, hydration entries, and settings in a local Room database. CSV is never read from or written to as the live store — it exists solely as the format for the explicit export and import actions.
**Why:** Room gives typed queries, migrations, and transactional writes for free, which matters once backfill logic and quick-entry writes can race (e.g., app opened right as a scheduled backfill runs). CSV as a system-of-record on a phone has no equivalent of a user editing the file directly (unlike the original desktop use case where the exported CSV could be hand-edited), so keeping it as the live store on Android buys nothing and loses transactional safety.
**Alternatives considered:** Keep CSV files as the live store on-device (rejected: no atomic multi-row updates, no query support, fragile concurrent-write handling with a background alarm receiver); DataStore/Proto for entries (rejected: DataStore fits key-value/small settings, not a growing, queryable log of dated entries — used here only for lightweight settings, see D3).

### D3: Settings storage split — Room for domain settings row, DataStore only if needed for simple flags
**Decision:** Store the single settings/config row (reminder window, weekdays-only, hydration goal, tone/vibration flags, export location) as one row in Room alongside the entry tables, not in SharedPreferences/DataStore.
**Why:** Settings changes must be observed reactively by both the UI and the alarm-rescheduling logic (changing the reminder window must reschedule alarms); Room's `Flow`-based DAOs give that for free and keep a single persistence technology in the app rather than two.
**Alternatives considered:** Jetpack DataStore (rejected: would require a second persistence mechanism and a second migration story for one settings row; no benefit over a Room table here).

### D4: WorkManager for periodic scheduling + backfill; AlarmManager (`setExactAndAllowWhileIdle`) for the precise on-the-hour notification trigger
**Decision:** Use `AlarmManager` with exact, idle-tolerant alarms to fire notifications at each computed reminder slot (since these must land at a specific minute, which `WorkManager`'s periodic work cannot guarantee), and use `WorkManager` (a periodic + expedited one-off work chain) for recomputing the day's slot schedule, re-arming the next alarm after each fire, and running the unified backfill check. A `BroadcastReceiver` for `ACTION_BOOT_COMPLETED` re-arms the schedule after device reboot.
**Why:** Exact single-shot alarms are the only Android primitive that reliably fires notifications at a specific clock time even under Doze, provided the app requests the `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` permission appropriate to the target API level. `WorkManager` alone cannot guarantee minute-precision firing (its periodic work has a minimum 15-minute flex window and no guaranteed exact time), so it's used for the surrounding bookkeeping instead, not the notification trigger itself.
**Alternatives considered:** `WorkManager` periodic work only (rejected: cannot guarantee firing at :55 past the hour, drifts under Doze); a persistent foreground service (rejected: unnecessary battery/UX cost, and Android increasingly restricts long-running foreground services without a matching foreground-service type justification).

### D5: Single explicit "slot status" model replaces the dual additional-break heuristic
**Decision:** The data layer computes, for each reminder slot on a given day, one authoritative status: `Pending` (slot time not yet reached), `Unanswered` (slot time passed, no entry logged), `Answered` (exactly one entry logged for the slot), or `AnsweredWithExtra` (an entry exists for the slot and the user logs an additional entry afterward while that slot is still the "current" one). Quick-entry reads this status once to decide whether the new entry it writes is the slot's primary answer or an additional/extra entry — there is no separate client-side string-matching step and no separate server-side re-check, because there is only one process.
**Why:** This directly resolves the "known weak point" called out in the proposal: two independent computations of the same fact could disagree in the web app. On Android there's one process and one data layer, so it's an explicit enum, computed once, consumed by both the quick-entry screen (to label the save action) and the history/evaluation screens (to classify past entries) — see `android-quick-entry` and `android-activity-history` specs.
**Alternatives considered:** Keep a heuristic based on notification-shown state (rejected: fragile to process death, and no better than just querying whether an entry exists for the slot).

### D6: Single backfill rule, evaluated on one schedule, not on every read/write
**Decision:** Missed-slot backfill (creating an `Unanswered`-status record for a slot once it's too late to answer) runs as one step inside the same background job that re-arms the next alarm (D4), not as a side effect of the UI reading the dashboard or writing a new entry. A slot is backfilled once its time is more than 59 minutes in the past and it still has no entry; this mirrors the timing threshold the web app used, kept for behavioral continuity, but evaluated from exactly one place.
**Why:** The web app's two overlapping mechanisms (backfill-on-read and backfill-on-write) existed because reads and writes were separate HTTP calls with no shared in-process moment to do it once. On Android, the background job is that shared moment. Reads (UI queries) become pure/idempotent again — querying today's stats never itself mutates data, which also simplifies testing.
**Alternatives considered:** Backfill lazily on every UI query, matching the web app's read-side behavior (rejected: reintroduces a read with a write side-effect, which is the exact awkwardness the proposal calls out as a simplification target).

### D7: CSV schema kept close to the web app's, with additive changes only
**Decision:** Export/import CSV keeps the movement schema's column set and semicolon convention (`id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at`) and the hydration schema's `date,hydrationMl` convention, so files exported from the existing web app import cleanly into the Android app (and vice versa, informally). Where the Android data model needs a field the web schema doesn't have (none currently anticipated beyond what D5's status enum derives at read time, which is not persisted), it will be added as a new trailing column with a tolerant parser (unknown/missing columns default rather than reject), matching the web app's existing tolerant-parsing behavior.
**Why:** Explicit compatibility goal from the proposal ("CSV files produced by the existing web app should remain importable"). Reusing the schema avoids a translation layer and keeps the two products loosely interoperable via file exchange without coupling them.
**Alternatives considered:** A new, Android-native CSV schema (rejected: breaks the stated cross-app portability goal for no benefit).

### D8: Reference device profile for the "fits on one screen" constraint
**Decision:** The one-screen quick-entry requirement is validated against a baseline profile of a 5.8"-6.1" phone at 411dp × 891dp (Pixel-class `xxhdpi`, gesture navigation, default system font scale) in portrait, with the five activity-level options laid out as a 2-row chip/card grid (3+2 or similar) rather than a single row or a vertically stacked list, so the control panel's height stays bounded regardless of German label length. Larger devices get more breathing room for free; smaller/older devices (< ~360dp × 640dp) may require the note field to shrink but must never require scrolling to reach the save action.
**Why:** "Fits on one screen" is untestable without a concrete reference size; picking one baseline gives design and QA a shared target. A 2-row grid (rather than 1×5) keeps per-item touch targets at a reasonable minimum width even with longer German labels like "Leichte Aktivität".
**Alternatives considered:** Targeting only the smallest supported device (rejected: overly cramped layout for the common case); no reference device at all (rejected: makes the requirement unverifiable).

## Risks / Trade-offs

- [Exact alarms require a runtime-granted permission on Android 12+ (`SCHEDULE_EXACT_ALARM`), which the user can revoke, and some OEM battery-optimization layers (e.g. certain Samsung/Xiaomi builds) throttle alarms despite the OS-level API guarantee] → Mitigation: request the permission with a clear rationale screen, detect if it's been revoked (`canScheduleExactAlarms()`), and surface an in-app warning banner/notification if reminders can't fire reliably, rather than failing silently. OEM-specific battery-optimization workarounds are out of scope for the spec itself but should be documented as a known limitation.
- [Doze mode can still delay `setExactAndAllowWhileIdle` alarms by a few minutes in rare cases despite the "AllowWhileIdle" contract] → Mitigation: the unified backfill rule (D6) tolerates this by using a time-window check (59+ minutes late) rather than assuming exact-minute firing, so a late-firing alarm doesn't produce an incorrectly-early "missed" classification.
- [Moving from CSV-as-store to Room-as-store means existing CSV files are not the live format anymore — a bug in the one-time import mapping could silently drop or misclassify historical rows] → Mitigation: `android-csv-import-export` spec requires the import step to report a row count and any skipped/defaulted rows before committing the replace, not just silently succeed.
- [Splitting one authoritative slot-status enum (D5) across quick-entry, history, and evaluation screens increases the cost of getting the enum's transition rules wrong, since all three consume the same computation] → Mitigation: the enum's transition rules are specified once in `android-reminder-scheduling` (the owning capability) and referenced, not re-derived, by the other capability specs.
- [No CI/build pipeline is specified in this change, so regressions in the new Android code have no automated safety net until that follow-up work happens] → Mitigation: tracked explicitly as a task in tasks.md so it isn't forgotten, even though it's out of scope for this design.

## Open Questions

- Exact minimum supported Android API level (`minSdk`) — affects which exact-alarm permission model applies (API 31 vs. 33 behavior differs). Does not change any spec-level behavior in this change and can be settled during project setup.
- Whether the export/import location should default to a fixed app-private directory with a "share" action, or prompt via SAF's document picker on every export — both satisfy the `android-csv-import-export` spec's observable behavior; the choice is a UX default, not a behavior contract, and can be settled during implementation.
