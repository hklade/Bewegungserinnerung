## Context

`src/App.tsx` (~1550 lines) currently contains, in one file: all type definitions, module-level constants, ~15 pure helper functions (including the reminder-scheduling ones covered separately by [[extract-reminder-schedule-helper]]), 6 inline API-calling `async function`s inside the component body, all `App` component state grouped by feature (reminder popup, hydration, day/week evaluation, config/settings, CSV import/export), one large JSX `return`, and two file-local presentational components (`StatCard`, `HeatmapCard`). There is no router, no state management library (Redux/Zustand/Context) — state is local `useState`/`useMemo`/`useEffect` in the single component. `src/main.tsx` is the only importer of `App`.

## Goals / Non-Goals

**Goals:**
- Break `src/App.tsx` into files organized by concern (types, API client, pure helpers, presentational components, feature-scoped hooks) so each is independently readable/reviewable.
- Preserve identical runtime behavior and UI — this is a structural refactor, verified by the existing e2e suite passing unmodified.
- Keep the change mechanically simple: move code, adjust imports/exports — avoid also redesigning state management or introducing new abstractions (e.g. Context, Redux) as part of this change.

**Non-Goals:**
- Introducing a router, global state library, or component library — out of scope, not needed to achieve the modularization goal.
- Changing how state is managed (e.g. moving to `useReducer`) beyond what's needed to relocate state into feature-scoped custom hooks — if a hook naturally simplifies with `useReducer` that's an acceptable side effect, but it isn't a goal.
- Performance optimization (memoization changes, etc.) — only move code, don't optimize it, unless a move mechanically requires wrapping in `useCallback`/`useMemo` to preserve existing referential-stability behavior.
- Coordinating file layout with a future component library or design system — not relevant to this prototype.

## Decisions

**Target file layout under `src/`:**
```
src/
  main.tsx                      (unchanged, imports App from ./App)
  App.tsx                       (thin composition root)
  styles.css                    (unchanged)
  types.ts                      (AppConfig, ActivityItem, DaySummary, heatmap types, DashboardApi, DayOption, HourlyBar, AnalysisKey)
  constants.ts                  (apiBase, weekdayNames, defaultConfig, scale, toneByValue)
  api/
    dashboardApi.ts             (fetchDashboard, createBooking, updateConfig, importBookings, exportBookingsCsv, logHydration — one function per endpoint)
  lib/
    formatting.ts                (formatDate, normalizeDateKey, formatCalendarDate, getWeekdayIndex, formatCurrentDay, formatLocalIsoDate, getDayLabel, formatValueLabel, toneClassByValue, getTypeLabel)
    activity.ts                 (isMissedReminderEntry, getEntryTime, getEntryHour, buildHourlyBars, buildDaySummary)
    reminderTone.ts             (playReminderTone — audio-only concern, distinct from reminder-scheduling math which lives in shared/reminder-schedule.mjs per the other change)
  components/
    StatCard.tsx
    HeatmapCard.tsx
  hooks/
    useDashboard.ts             (dashboard fetch/poll state + `now`/clock tick)
    useReminderPopup.ts         (reminder popup state, trigger effect, countdown display)
    useHydrationTracker.ts      (drinkProgressMl + derived values + saveHydrationProgress wiring)
    useDayWeekEvaluation.ts     (evaluationTab, selectedDayIso, showAllActivities, derived day options/summary/hourly bars)
    useConfigForm.ts            (configForm, configState, submit handling)
    useCsvImportExport.ts       (importState, file input handling, export trigger)
```
This mirrors the natural seams already identified in the current file (types/constants block, helper-function block, per-feature state groups, two extracted components) rather than inventing a new decomposition — lower risk, easier to review as a mechanical move.

**Exclude reminder-scheduling math from this change's `lib/`, deferring to [[extract-reminder-schedule-helper]]'s `shared/reminder-schedule.mjs`.**
Avoids the two refactors fighting over the same lines (`parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`, the weekend-check logic). `playReminderTone` (audio playback) is unrelated to scheduling math and stays in this change's `lib/reminderTone.ts`. Recommended sequencing: apply [[extract-reminder-schedule-helper]] first so this change's `useReminderPopup` hook is written directly against the final shared-module API, avoiding a second edit pass.

**API-calling functions become plain async functions in `api/dashboardApi.ts`, each taking explicit parameters and returning parsed data (or throwing on error), not React hooks.**
Keeps them trivially testable/reusable outside of React, and matches their current implementation style (already plain `async function`s, just relocated and detached from the component's closure over `apiBase`/state setters). The calling hook (e.g. `useDashboard`) is responsible for wiring results into state — separates "how to call the API" from "what to do with the response."

**Feature-scoped custom hooks (`useDashboard`, `useReminderPopup`, etc.) each own their slice of state and effects, and `App.tsx` composes them plus renders JSX, reading/passing their returned values.**
Alternative considered: split by JSX section into sub-components that each manage their own state locally (fully "container components") — rejected because several pieces of state are read/written across sections (e.g. `dashboard` data feeds both the day view and week view; `now`/countdown feeds both the header and the sidebar), so a hooks-based split avoids prop-drilling state through component boundaries that don't naturally own it.
**Where a hook's returned state is only consumed by one clearly-scoped JSX section (e.g. the config/settings form, the CSV import/export footer), pair it with a corresponding presentational component (e.g. `ConfigSettingsPanel`, `ImportExportPanel`) so `App.tsx`'s JSX also shrinks, not just its logic.** Exact component boundaries are an implementation-time judgment call within the task list below — the important constraint is behavior parity, not a specific file count.

## Risks / Trade-offs

- [Risk] Moving state across hook boundaries could accidentally change effect dependency arrays or closure captures, causing subtle behavior changes (stale state, extra re-renders, effects firing at the wrong time) → Mitigation: move code with minimal logic changes first (mechanical extraction), run the full e2e suite after each hook extraction (task list is structured to do this incrementally, not as one big-bang rewrite), and only address any resulting warnings/bugs as a fast-follow within the same change.
- [Risk] This change and [[extract-reminder-schedule-helper]] both touch `src/App.tsx` around the same lines (reminder scheduling functions) → Mitigation: sequence [[extract-reminder-schedule-helper]] first, as noted in Decisions.
- [Trade-off] More files/directories for a prototype-scale app adds some navigation overhead (jumping between files instead of scrolling one file) → acceptable; the current single-file size is already past the point where scrolling is easier than navigating, per the motivating Why.
