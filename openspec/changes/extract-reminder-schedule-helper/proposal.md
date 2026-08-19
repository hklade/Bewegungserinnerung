## Why

Reminder-slot scheduling logic (deriving hourly reminder times from a start/end time, applying the weekdays-only rule, computing the current/next slot and countdown) is implemented independently on both the server (`server/config.mjs`, `server/utils/time.mjs`) and the client (`src/App.tsx`). The two implementations already show real divergence — the client's `parseTimeToMinutes` skips the server's `normalizeTime` validation, and the client's `buildReminderSlots` inlines its fallback slot array instead of delegating like the server's `buildReminderSlotsFromStart` does — and three separate client functions each re-derive the same weekend-check inline rather than sharing one helper. `CLAUDE.md` already flags this duplication as something that "must be kept in sync." Extracting a single shared scheduling helper removes the risk of the two sides silently drifting apart.

## What Changes

- Introduce a single, framework-agnostic reminder-scheduling module containing the slot-computation and weekday-eligibility logic currently duplicated across `server/config.mjs`/`server/utils/time.mjs` and `src/App.tsx` (`parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`/`buildReminderSlotsFromStart`, and the weekend/weekdays-only eligibility check currently repeated inline in `getNextReminderTime`, `getNextReminderCountdown`, and `getCurrentReminderSlot`).
- `server/config.mjs` SHALL use this module for `buildReminderSlots` instead of its own inline implementation.
- `src/App.tsx` SHALL use the same module (via a shared import, not a copy) for slot computation, current/next-slot lookup, and countdown calculation, instead of its own duplicated functions.
- Both sides SHALL apply the weekdays-only eligibility rule via the same single function, instead of three separate inline re-derivations on the client and none shared with the server's `isWeekend`.
- No user-visible behavior is intended to change — this is a refactor. Where the client's current logic silently diverges from the server's more careful `normalizeTime`-based parsing, the shared module's (server-derived, more correct) behavior wins; this is a bugfix side-effect of deduplication, not a new feature.

## Capabilities

### New Capabilities
(none — this is a refactor of existing internal behavior; no new externally observable capability is introduced)

### Modified Capabilities
(none — the externally observable reminder-scheduling behavior, i.e. which times are shown/used as reminder slots and how weekdays-only is applied, is not intended to change; `skip_specs: true` is set on this change since there is no spec-level behavior delta)

## Impact

- Affected code: `server/config.mjs`, `server/utils/time.mjs`, `src/App.tsx`.
- New shared module location and how it's consumed from both a Node ESM server module and a Vite/TypeScript/React client bundle needs a build-compatible location (see design.md) — this is the main technical risk of the change, not the scheduling logic itself.
- Existing server tests (`tests/server/*.test.mjs`) and e2e tests (`tests/*.e2e.spec.ts`) covering reminder timing/popups must continue to pass unmodified, since behavior is not intended to change (aside from the parsing-strictness bugfix noted above).
