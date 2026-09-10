## Context

The existing web app splits reminder-slot logic between client (`src/App.tsx` countdown/popup) and server (`server/config.mjs`/`service.mjs` backfill), a split that exists only because a browser cannot run background timers reliably. This design describes a single, on-device reminder-scheduling mechanism with no server, folding the previously-duplicated logic into one place.

Two behavioral rough edges in the web app inform this design and are explicitly *not* carried over as implemented:
1. "Zusatzbewegung" (additional-break) detection was computed twice (client string-heuristic + server `existingForSlot` check), sometimes disagreeing.
2. Missed-reminder backfill existed as two overlapping mechanisms (`unanswered` entries written as a side-effect of every dashboard read; `planned_break_response value:0` entries written as a side-effect of every booking write).

## Goals / Non-Goals

**Goals:**
- One deterministic, testable module owns: reminder slot computation, "is this slot already answered" status, and missed-slot backfill — no duplication between UI and background scheduling.
- Reminders keep firing across Doze/App Standby and process death, without requiring the app to be foregrounded or excluded from battery optimization by the user beforehand (exact-alarm fallback aside — see Risks).

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions.

## Decisions

### D4: WorkManager for periodic scheduling + backfill; AlarmManager (`setExactAndAllowWhileIdle`) for the precise on-the-hour notification trigger
**Decision:** Use `AlarmManager` with exact, idle-tolerant alarms to fire notifications at each computed reminder slot (since these must land at a specific minute, which `WorkManager`'s periodic work cannot guarantee), and use `WorkManager` (a periodic + expedited one-off work chain) for recomputing the day's slot schedule, re-arming the next alarm after each fire, and running the unified backfill check. A `BroadcastReceiver` for `ACTION_BOOT_COMPLETED` re-arms the schedule after device reboot.
**Why:** Exact single-shot alarms are the only Android primitive that reliably fires notifications at a specific clock time even under Doze, provided the app requests the `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` permission appropriate to the target API level. `WorkManager` alone cannot guarantee minute-precision firing, so it's used for the surrounding bookkeeping instead.
**Alternatives considered:** `WorkManager` periodic work only (rejected: cannot guarantee firing at :55 past the hour, drifts under Doze); a persistent foreground service (rejected: unnecessary battery/UX cost, and Android increasingly restricts long-running foreground services without a matching justification).

### D5: Single explicit "slot status" model replaces the dual additional-break heuristic
**Decision:** The data layer computes, for each reminder slot on a given day, one authoritative status: `Pending` (slot time not yet reached), `Unanswered` (slot time passed, no entry logged), `Answered` (exactly one entry logged for the slot), or `AnsweredWithExtra` (an entry exists for the slot and the user logs an additional entry afterward while that slot is still the "current" one). This is the owning capability for the enum; `android-quick-entry` and `android-activity-history` consume it without re-deriving it.
**Why:** This directly resolves the "known weak point" called out in the proposal: two independent computations of the same fact could disagree in the web app. On Android there's one process and one data layer, so it's an explicit enum, computed once.
**Alternatives considered:** Keep a heuristic based on notification-shown state (rejected: fragile to process death, and no better than just querying whether an entry exists for the slot).

### D6: Single backfill rule, evaluated on one schedule, not on every read/write
**Decision:** Missed-slot backfill (creating an `Unanswered`-status record for a slot once it's too late to answer) runs as one step inside the same background job that re-arms the next alarm (D4), not as a side effect of the UI reading the dashboard or writing a new entry. A slot is backfilled once its time is more than 59 minutes in the past and it still has no entry; this mirrors the timing threshold the web app used, kept for behavioral continuity, but evaluated from exactly one place.
**Why:** The web app's two overlapping mechanisms existed because reads and writes were separate HTTP calls with no shared in-process moment to do it once. On Android, the background job is that shared moment. Reads (UI queries) become pure/idempotent again.
**Alternatives considered:** Backfill lazily on every UI query, matching the web app's read-side behavior (rejected: reintroduces a read with a write side-effect, which is the exact awkwardness the proposal calls out as a simplification target).

### D9: `minSdk` 33, `compileSdk`/`targetSdk` 37
**Decision:** Set `minSdk = 33` (Android 13) and `compileSdk`/`targetSdk = 37` (Android 17).
**Why:** `minSdk = 33` is chosen over 31 because the exact-alarm permission model (D4) changed behavior between API 31 and 33, and 33 is the more conservative/current baseline for that API's runtime-permission semantics — the app has no other functional need to support API 31/32 specifically. `compileSdk`/`targetSdk = 37` is set at the project level (see `add-android-ci-pipeline`); it is noted here because it directly affects which exact-alarm permission variant this capability's alarm-scheduling code must handle.
**Alternatives considered:** `minSdk = 31` (rejected: would require handling both the API 31 and API 33 exact-alarm permission variants for no product benefit).

## Risks / Trade-offs

- [Exact alarms require a runtime-granted permission on Android 12+ (`SCHEDULE_EXACT_ALARM`), which the user can revoke, and some OEM battery-optimization layers (e.g. certain Samsung/Xiaomi builds) throttle alarms despite the OS-level API guarantee] → Mitigation: request the permission with a clear rationale screen, detect if it's been revoked (`canScheduleExactAlarms()`), and surface an in-app warning banner/notification if reminders can't fire reliably, rather than failing silently. OEM-specific battery-optimization workarounds are out of scope for the spec itself but should be documented as a known limitation.
- [Doze mode can still delay `setExactAndAllowWhileIdle` alarms by a few minutes in rare cases despite the "AllowWhileIdle" contract] → Mitigation: the unified backfill rule (D6) tolerates this by using a time-window check (59+ minutes late) rather than assuming exact-minute firing, so a late-firing alarm doesn't produce an incorrectly-early "missed" classification.
- [Splitting one authoritative slot-status enum (D5) across quick-entry, history, and evaluation screens increases the cost of getting the enum's transition rules wrong, since all three consume the same computation] → Mitigation: the enum's transition rules are specified once here (the owning capability) and referenced, not re-derived, by the other capability specs.

## Open Questions

_None._
