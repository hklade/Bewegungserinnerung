## 1. Create the shared module

- [x] 1.1 Create `shared/reminder-schedule.mjs` with `normalizeTime`, `parseTimeToMinutes`, `formatMinutesToTime` (moved from `server/utils/time.mjs`, unchanged behavior).
- [x] 1.2 Add `buildReminderSlotsFromStart` and `buildReminderSlots` to `shared/reminder-schedule.mjs` (moved from `server/config.mjs`, unchanged behavior).
- [x] 1.3 Add a new `isWeekdayEligible(dateLike, weekdaysOnly)` function to `shared/reminder-schedule.mjs`, accepting either a `Date` or an ISO date string, consolidating the weekend-check logic from `server/utils/time.mjs`'s `isWeekend` and `src/App.tsx`'s inline `now.getDay()` checks.

## 2. Update the server to consume the shared module

- [x] 2.1 In `server/utils/time.mjs`, replace the local `normalizeTime`/`parseTimeToMinutes`/`formatMinutesToTime` bodies with re-exports from `shared/reminder-schedule.mjs`, keeping the existing export names/paths for other server call sites.
- [x] 2.2 In `server/config.mjs`, replace the local `buildReminderSlots`/`buildReminderSlotsFromStart`/`formatMinutesToTime` implementations with imports from `shared/reminder-schedule.mjs`.
- [x] 2.3 Replace `server/utils/time.mjs`'s `isWeekend(dateIso)` with a thin wrapper around the new shared `isWeekdayEligible`, preserving its existing signature/behavior for existing callers.
- [x] 2.4 Run `npm run test:server` and confirm all existing server tests still pass unmodified.

## 3. Update the client to consume the shared module

- [x] 3.1 In `src/App.tsx`, import `parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`, and `isWeekdayEligible` from `shared/reminder-schedule.mjs`, and delete the corresponding local function definitions (lines ~231–272 per current file).
- [x] 3.2 Update `getNextReminderTime`, `getNextReminderCountdown`, and `getCurrentReminderSlot` to call the shared `isWeekdayEligible` instead of their inline `now.getDay() === 0 || now.getDay() === 6` checks.
- [x] 3.3 Confirm Vite can resolve and bundle the `shared/` import from `src/App.tsx` in dev (`npm run dev`) and in a production build (`npm run build`).

## 4. Verification

- [x] 4.1 Add or extend a server unit test asserting `buildReminderSlots`/`parseTimeToMinutes`/`isWeekdayEligible` produce identical results whether imported via `server/config.mjs`/`server/utils/time.mjs` or directly from `shared/reminder-schedule.mjs`.
- [x] 4.2 Manually or via e2e test, verify the reminder popup countdown and current-slot detection in the running app behave the same as before the refactor (same next-reminder time, same weekdays-only skipping on a weekend).
- [x] 4.3 Run the full `npm run test:server` and `npm run test:e2e` suites and confirm no regressions.
- [x] 4.4 Update `CLAUDE.md`'s note about reminder-scheduling logic being "duplicated in two places and must be kept in sync" to reflect the new shared-module architecture.
