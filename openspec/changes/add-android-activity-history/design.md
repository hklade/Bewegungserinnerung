## Context

The existing web app's recent-activity list is rendered client-side from the server's dashboard payload. On Android there is no server; this design describes the same list computed from local Room queries, filtered using the single authoritative slot-status enum owned by `android-reminder-scheduling` rather than a separate classification.

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
