## Why

`src/App.tsx` is a single ~1550-line file containing all frontend type definitions, API-calling functions, pure formatting/aggregation helpers, all component state (spanning reminder popup, hydration tracker, day/week evaluation, config/settings, CSV import/export), and all JSX for every panel of the app, plus two presentational sub-components (`StatCard`, `HeatmapCard`). This makes the file hard to navigate, hard to review in diffs (unrelated features sit in the same file), and hard to test in isolation. Splitting it into focused modules makes each concern independently readable and changeable without touching unrelated code.

## What Changes

- Split `src/App.tsx` into multiple files/modules along its existing natural seams, with **no intended change in runtime behavior or UI** — this is a structural refactor:
  - Type/interface definitions (`AppConfig`, `ActivityItem`, `DaySummary`, heatmap types, `DashboardApi`, `DayOption`, `HourlyBar`) and shared constants (`apiBase`, `weekdayNames`, `defaultConfig`, `scale`, `toneByValue`) move to their own module(s).
  - Pure, hook-free helper functions (date/time formatting, value/entry formatting, `buildHourlyBars`, `buildDaySummary`, `getTypeLabel`, etc.) move to a helpers module, excluding the reminder-scheduling functions already being extracted into a shared module by [[extract-reminder-schedule-helper]] (this change should sequence after or coordinate with that one to avoid conflicting edits to the same lines).
  - The inline `async function` API-calling logic (dashboard fetch, booking create, config update, CSV import/export, hydration logging — all currently declared inside the `App` component body) moves to a dedicated API-client module exposing one function per endpoint.
  - `StatCard` and `HeatmapCard` (currently unexported, file-local components) move to their own component files with named exports.
  - The remaining state/effects/JSX in `App` are reorganized into smaller, feature-scoped pieces (e.g. reminder popup, hydration/Trinkmanager, day/week evaluation, config/settings, CSV import/export) — as custom hooks and/or sub-components — so `App` itself becomes a thin composition of these pieces rather than one monolithic function.
- No new features, no visual changes, no changed API contracts.

## Capabilities

### New Capabilities
(none — purely internal code organization; no new user-facing capability)

### Modified Capabilities
(none — no externally observable frontend behavior changes; `skip_specs: true` is set on this change since it is a pure refactor)

## Impact

- Affected code: `src/App.tsx` (split into multiple new files under `src/`), `src/main.tsx` (import path update if `App`'s location or export changes).
- Depends on / should be sequenced with [[extract-reminder-schedule-helper]], which also modifies reminder-scheduling code currently living inside `App.tsx` — doing that extraction first (or coordinating carefully) avoids merge/rebase conflicts across the two changes touching the same lines.
- Existing e2e tests (`tests/*.e2e.spec.ts`, `tests/page-objects/`) assert against rendered DOM/behavior, not file structure, so they should continue to pass unmodified and serve as the regression safety net for this refactor.
- No backend (`server/`) changes.
