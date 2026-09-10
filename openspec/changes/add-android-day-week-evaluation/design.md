## Context

The existing web app's day/week evaluation views are computed server-side as part of the dashboard payload (today stats, current week, recent weeks, heatmap) and rendered by the browser. On Android there is no server; this design describes the same aggregated views computed from local Room queries, reading the single authoritative slot-status enum owned by `android-reminder-scheduling` rather than re-deriving answered/unanswered classification.

## Goals / Non-Goals

**Goals:**
- Day/week statistics and the heatmap are computed from on-device Room queries against the shared slot-status enum, not a separate classification.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions.
- No tablet-specific or landscape-optimized layout beyond what falls out naturally.

## Decisions

### D1: Native Kotlin + Jetpack Compose, single-module app
**Decision:** Build with Kotlin and Jetpack Compose (Material 3). The hourly bar chart and 7-day heatmap use Compose `Canvas` for custom drawing.
**Why:** Compose has first-class support for the custom drawing (`Canvas`) needed for the heatmap/bar-chart, which would require more boilerplate under Views + XML layouts.
**Alternatives considered:** Views + XML layouts (rejected: more boilerplate for the custom chart/heatmap drawing than Compose); a charting library (not precluded, but not required by this design — left as an implementation detail).

### D5: Single explicit "slot status" model replaces the dual additional-break heuristic
**Decision:** Per-day statistics (answered/primary count, additional count, unanswered count, average delay) and heatmap cell values are derived by reading the single authoritative slot-status enum (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`), owned by `android-reminder-scheduling`, rather than this capability computing its own classification.
**Why:** This directly resolves the "known weak point" of the web app: two independent computations of the same fact could disagree. Day/week evaluation only ever consumes the enum, never computes it.
**Alternatives considered:** Re-derive answered/unanswered status locally from raw entry timestamps (rejected: would duplicate the exact computation this design centralizes elsewhere).

## Risks / Trade-offs

- [Splitting one authoritative slot-status enum (D5) across quick-entry, history, and evaluation screens increases the cost of getting the enum's transition rules wrong, since all three consume the same computation] → Mitigation: the enum's transition rules are specified once in `android-reminder-scheduling` (the owning capability) and referenced, not re-derived, here.

## Open Questions

_None._
