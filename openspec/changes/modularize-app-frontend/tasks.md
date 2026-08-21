## 1. Types and constants

- [x] 1.1 Create `src/types.ts` with `AnalysisKey`, `AppConfig`, `ActivityItem`, `DaySummary`, `HeatmapCell`/`HeatmapRow`/`HeatmapColumn`/`HeatmapData`, `DashboardApi`, `DayOption`, `HourlyBar`, exported.
- [x] 1.2 Create `src/constants.ts` with `apiBase`, `weekdayNames`, `defaultConfig`, `scale`, `toneByValue`, exported.
- [x] 1.3 Update `App.tsx` to import from `./types` and `./constants` instead of defining them inline; run `npm run build` (TypeScript check) to confirm no type errors.

## 2. Pure helpers

- [x] 2.1 Create `src/lib/formatting.ts` with `formatDate`, `normalizeDateKey`, `formatCalendarDate`, `getWeekdayIndex`, `formatCurrentDay`, `formatLocalIsoDate`, `getDayLabel`, `formatValueLabel`, `toneClassByValue`, `getTypeLabel`.
- [x] 2.2 Create `src/lib/activity.ts` with `isMissedReminderEntry`, `getEntryTime`, `getEntryHour`, `buildHourlyBars`, `buildDaySummary`.
- [x] 2.3 Create `src/lib/reminderTone.ts` with `playReminderTone`.
- [x] 2.4 Update `App.tsx` to import these from their new modules and delete the now-moved local definitions. (Do not move `parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`, or the weekend-check logic here — those are handled by the `extract-reminder-schedule-helper` change; if that change has already landed, import the shared module instead.)

## 3. API client

- [x] 3.1 Create `src/api/dashboardApi.ts` with one exported async function per endpoint: `fetchDashboard`, `createBooking`, `updateConfig`, `importBookings`, `exportBookingsCsv`, `logHydration` — each taking explicit parameters and returning parsed response data or throwing on error, using `apiBase` from `./constants`.
- [x] 3.2 Update `App.tsx`'s `refreshDashboard`, `handleQuickSubmit`, `handleConfigSubmit`, `handleImportFileSelected`, `handleExportCsv`, `saveHydrationProgress` to call the new API functions instead of inlining `fetch` calls, keeping their existing state-update side effects in `App.tsx` for now (hook extraction happens in step 5).

## 4. Presentational components

- [x] 4.1 Move `StatCard` to `src/components/StatCard.tsx` with a named export; update its usage in `App.tsx`.
- [x] 4.2 Move `HeatmapCard` to `src/components/HeatmapCard.tsx` with a named export; update its usage in `App.tsx`.

## 5. Feature-scoped hooks

- [x] 5.1 Create `src/hooks/useDashboard.ts`: dashboard fetch/poll state, the `now` clock tick, and `refreshDashboard` wiring (using `fetchDashboard` from step 3).
- [x] 5.2 Create `src/hooks/useReminderPopup.ts`: reminder popup state, the reminder-trigger effect, countdown display state (depends on the shared reminder-scheduling module from `extract-reminder-schedule-helper` for slot/countdown calculations).
- [x] 5.3 Create `src/hooks/useHydrationTracker.ts`: `drinkProgressMl` state, derived hydration values, `saveHydrationProgress` wiring (using `logHydration` from step 3).
- [x] 5.4 Create `src/hooks/useDayWeekEvaluation.ts`: `evaluationTab`, `selectedDayIso`, `showAllActivities`, and the derived day-options/day-summary/hourly-bars `useMemo`s.
- [x] 5.5 Create `src/hooks/useConfigForm.ts`: `configForm`, `configState`, and `handleConfigSubmit` wiring (using `updateConfig` from step 3).
- [x] 5.6 Create `src/hooks/useCsvImportExport.ts`: `importState`, file input ref/handling, and export-trigger wiring (using `importBookings`/`exportBookingsCsv` from step 3).
- [x] 5.7 Update `App.tsx` to call each hook and wire its returned state/handlers into the existing JSX, removing the now-relocated `useState`/`useEffect`/`useMemo` declarations and inline handler bodies.
- [x] 5.8 After each hook extraction (5.1–5.6), run the app manually (`npm run dev` + a real backend, or `npm run test:e2e`) before moving to the next hook, to catch behavior regressions incrementally rather than all at once.

## 6. Optional JSX decomposition

- [x] 6.1 Where a hook's state is consumed by one clearly-scoped JSX section (e.g. config/settings form, CSV import/export footer), extract a corresponding presentational component (e.g. `src/components/ConfigSettingsPanel.tsx`, `src/components/ImportExportPanel.tsx`) so `App.tsx`'s JSX shrinks alongside its logic.
- [x] 6.2 Confirm `App.tsx` reads as a composition of hooks + components rather than a monolithic function.

## 7. Verification

- [x] 7.1 Run `npm run build` and confirm no TypeScript errors.
- [x] 7.2 Run `npm run test:e2e` (full Playwright suite) and confirm all existing e2e tests pass unmodified. (2 pre-existing failures confirmed unrelated to this refactor — see review notes: test-data pollution across e2e runs, reproduced identically on unmodified `main`.)
- [x] 7.3 Manually smoke-test the app in a browser: reminder popup, hydration tracker, day view, week view/heatmap, config/settings form, CSV import/export — confirm no visual or behavioral differences from before the refactor.
