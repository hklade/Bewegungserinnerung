## Context

Two runtimes currently duplicate reminder-scheduling logic:
- **Server** (`server/config.mjs` + `server/utils/time.mjs`, plain Node ESM `.mjs`, no build step, no bundler): `buildReminderSlots`, `buildReminderSlotsFromStart`, `formatMinutesToTime`, and (in `utils/time.mjs`) `normalizeTime`, `parseTimeToMinutes`, `isWeekend`.
- **Client** (`src/App.tsx`, TypeScript, bundled by Vite for the browser): its own `parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`, plus `getNextReminderTime`/`getNextReminderCountdown`/`getCurrentReminderSlot`, each re-deriving the weekdays-only weekend check inline via `now.getDay()`.

There is currently no shared package/module directory that both a `node --test`-run `.mjs` file and a Vite-bundled `.tsx` file import from — `server/` and `src/` are separate TypeScript/JS worlds with separate `tsconfig.json`/module resolution (`server/` has no `tsconfig.json` at all; it's plain Node ESM).

## Goals / Non-Goals

**Goals:**
- One authoritative implementation of: time-string parsing/formatting, slot-list computation from start/end times, and weekdays-only eligibility checking.
- Both `server/config.mjs` and `src/App.tsx` import and use that one implementation — no copy-paste, no re-derivation.
- No change to externally observable reminder behavior (see proposal's Impact) beyond the incidental parsing-strictness fix.

**Non-Goals:**
- Sharing the *entire* `server/utils/time.mjs` (Vienna-timezone-aware `Intl.DateTimeFormat` helpers like `getViennaIsoDate`/`getViennaTime`/`getViennaWeekday`) with the client — only the pure, timezone-independent scheduling math (time parsing/formatting, slot list, weekday eligibility) is in scope. The client already gets "now" from the browser's local `Date`, which is a separate concern from the server's Vienna-timezone normalization of stored data.
- Introducing a monorepo/workspaces build setup, a shared npm package, or a build step for `server/` — the solution must work with `server/`'s current no-bundler plain-ESM execution model.
- Changing the reminder popup UI/UX in `src/App.tsx` beyond swapping which function computes the underlying values.

## Decisions

**Create a new shared module at `shared/reminder-schedule.mjs`, written in plain JavaScript (ESM, no TypeScript-only syntax), placed outside both `server/` and `src/`.**
Plain `.mjs` (not `.ts`) is required because `server/` runs directly via `node` with no build/transpile step — a `.ts` file cannot be imported by `server/config.mjs` at runtime without adding a compilation step, which is out of scope (Non-Goals). Vite/TypeScript on the client side can import a plain `.js`/`.mjs` file directly (`allowJs`-independent, since we're not asking TS to type-check it, just to bundle it) — Vite handles that natively. Alternative considered: put it under `server/utils/` and have Vite reach into `server/` — rejected as confusing ownership (implies it's server-only); a top-level `shared/` directory makes the "used by both" intent explicit and matches how `CLAUDE.md` already frames the two runtimes as peers.

**Move only the pure scheduling functions into `shared/`: `normalizeTime`, `parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`, `buildReminderSlotsFromStart`, and a new `isWeekdayEligible(dateLike, weekdaysOnly)` helper consolidating the weekend-check duplicated 3x in `src/App.tsx`.**
`getViennaIsoDate`/`getViennaTime`/`getViennaWeekday` stay in `server/utils/time.mjs` since they're server-only (CSV timestamp normalization) and not part of the duplicated logic. The new `isWeekdayEligible` generalizes `server/utils/time.mjs`'s `isWeekend(dateIso)` (ISO-string-based) to accept a plain `Date` too, since the client works with `Date` objects (`now.getDay()`), not ISO strings — implemented as one function with input normalization, not two parallel implementations.

**`server/config.mjs`'s `buildReminderSlots`/`buildReminderSlotsFromStart` becomes a thin re-export (or direct pass-through) of the `shared/` versions; `server/utils/time.mjs` re-exports `normalizeTime`/`parseTimeToMinutes`/`formatMinutesToTime` from `shared/` too, to avoid breaking existing `import { normalizeTime } from '../utils/time.mjs'` call sites elsewhere in the server.**
Minimizes the diff in server call sites outside `config.mjs` itself (e.g. anything else importing from `utils/time.mjs`) — they keep working unchanged because the public import path doesn't move, only the implementation backing it. Alternative considered: update every server call site to import from `shared/` directly — rejected as unnecessary churn; the indirection cost of a re-export is negligible.

**`src/App.tsx` imports `shared/reminder-schedule.mjs` directly and deletes its own `parseTimeToMinutes`, `formatMinutesToTime`, `buildReminderSlots`, and the inline weekend checks in `getNextReminderTime`/`getNextReminderCountdown`/`getCurrentReminderSlot`, replacing them with calls to the shared `isWeekdayEligible`.**
`getNextReminderTime`, `getNextReminderCountdown`, and `getCurrentReminderSlot` themselves stay in `src/App.tsx` (they're client-specific — popup/countdown display concerns, not pure scheduling math) but now delegate their slot list and weekday-eligibility checks to `shared/`.

## Risks / Trade-offs

- [Risk] The client's current `parseTimeToMinutes` is looser than the shared (server-derived) `normalizeTime`-based version; switching could change behavior for a malformed/edge-case config value that previously parsed differently on the client than the server → Mitigation: this is called out explicitly in the proposal as an intentional bugfix side-effect; add/check a server+client parity test (task 4) to confirm both sides now agree exactly.
- [Risk] A plain `.mjs` file under `shared/` bypasses TypeScript type-checking for the client's usage of it → Mitigation: keep the module's public function signatures simple (strings, numbers, booleans, `Date`) and add a hand-written `.d.ts` alongside it if the lack of types proves error-prone in practice; not required for the initial extraction.
- [Trade-off] Introducing a third top-level source directory (`shared/`, alongside `server/` and `src/`) adds a small amount of project structure — acceptable given it directly reflects the "used by both runtimes" reality `CLAUDE.md` already documents as a known risk area.
