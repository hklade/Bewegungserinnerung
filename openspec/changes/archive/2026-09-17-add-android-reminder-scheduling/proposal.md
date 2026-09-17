## Why

Hourly movement/hydration nudges only work if they reach the person away from their desk, survive OS-level background/Doze restrictions, and fire as a real system notification with sound/vibration — none of which the existing web app's client-side countdown + server-side backfill split reliably provides. This change specifies a single, deterministic on-device scheduling and backfill mechanism for the standalone Android app: hourly reminder slots computed from a configurable time window, weekday-only eligibility, native notifications, a live countdown, and one authoritative "slot answered" status that replaces the web app's two independent (and sometimes disagreeing) computations.

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup, including the Room/WorkManager/Compose Navigation dependencies, must land first).
Consumed by: `add-android-quick-entry` (reads the authoritative slot-status to classify a save), `add-android-activity-history` (classifies list rows and excludes `Unanswered` entries), `add-android-day-week-evaluation` (per-day/heatmap stats derive from slot status).

## What Changes

- Reminder scheduling moves from a client-side countdown + server-side backfill split to a single on-device scheduling and backfill model (`AlarmManager` for the precise on-the-hour trigger, `WorkManager` for re-arming/backfill bookkeeping), replacing the browser popup/Web Audio chime with native Android notifications (sound + vibration).
- Hourly reminder slots are computed from a configurable start/end time (default window `07:55`-`16:55`, 10 slots), with a bounded fallback window when the end time precedes the start time, and a built-in default window when either time is unparseable.
- Reminders are eligible only on configured days (weekdays-only setting), can be turned off entirely, and resume from the next eligible slot when re-enabled.
- Notifications fire while backgrounded and tolerate Doze/idle state (a few minutes' delay), resume after device restart via a boot-completed receiver, and carry a configurable tone/vibration with an on-demand "test tone" action that has no side effects.
- A live countdown to the next eligible reminder is shown while the app is open.
- The dual, string-heuristic "Zusatzbewegung" (additional-break) detection in the web app is replaced by one explicit "slot status" enum (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`) computed once by the on-device data layer and consumed by every other screen, never re-derived independently.
- The two overlapping "missed reminder" backfill mechanisms in the web app are unified into one deterministic backfill rule (59+ minutes late, no entry) evaluated on a single background schedule, never as a side effect of a UI read.

## Capabilities

### New Capabilities
- `android-reminder-scheduling`: On-device hourly reminder scheduling between configurable start/end times, weekday-only eligibility, native notifications with sound/vibration, countdown display, the authoritative slot-status enum, and the unified missed/unanswered backfill rule.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: the shared slot-computation and slot-status modules, `AlarmManager`/`WorkManager`/`BroadcastReceiver` scheduling code, and notification/tone playback, under `android/`.
- **Risk surface**: exact-alarm permission revocation and OEM battery-optimization throttling are known risks (see design.md Risks); mitigated with an in-app warning banner and a time-window-tolerant backfill check rather than exact-minute assumptions.
- **No shared runtime**: on-device only, no HTTP API, no server.
