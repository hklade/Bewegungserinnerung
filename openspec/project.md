# Project Context

## Purpose

Bewegungserinnerung ("movement reminder") is a local React/Vite prototype for hourly movement/break reminders during work hours. It also includes a hydration tracker ("Trinkmanager"), day/week evaluation views, and CSV import/export of logged activity. The UI is entirely in German, as is the domain vocabulary used throughout the code and data (e.g. `Bewegungsdaten`, `Trinkdaten`, `weekday`, `Rückmeldung`).

## Tech Stack

- **Frontend**: React 19 + TypeScript, built with Vite 7 (`@vitejs/plugin-react`). No router, no component library — `src/App.tsx` is a single file containing all UI, state, and API-calling logic (~1550 lines). Entry point: `src/main.tsx`; styling in `src/styles.css`.
- **Backend**: Plain Node.js `http` server (no framework), listening on `127.0.0.1:3001`, started via `server.mjs` which wires up modules under `server/`.
- **Persistence**: CSV files under `data/` — no database. Movement entries and hydration entries each have their own CSV file and schema (semicolon-delimited for movement data, comma-delimited for hydration data — see below).
- **Testing**:
  - `node --test` (Node's built-in test runner) for server unit tests (`tests/server/*.test.mjs`).
  - Playwright for e2e tests (`tests/*.e2e.spec.ts`), configured for **serial execution** (`fullyParallel: false`, `workers: 1`) to avoid races over shared test CSV/config files.
  - Allure for e2e reporting (`allure-playwright`, `allure-commandline`), output gitignored under `allure-results/` / `allure-report/`.
- **Language/tooling**: TypeScript 5.8 (strict mode, `noEmit`, `moduleResolution: nodenext`, JSX via `react-jsx`). No ESLint or Prettier config present in the repo — no enforced lint/format tooling.
- **Spec workflow**: OpenSpec (`@fission-ai/openspec`, `spec-driven` schema) is set up under `openspec/` but `openspec/specs/` and `openspec/changes/` are currently empty — no capabilities have been formally spec'd yet.

## Project Conventions

### Code Style

- No linter or formatter is configured; match the existing style in the file you're editing.
- UI-facing strings, comments in domain logic, and CSV field values (e.g. weekday names, entry descriptions) are in **German**. Code identifiers are a mix of English (`storage.mjs`, `service.mjs`) and German-flavored domain terms (`Bewegungsdaten`, `Trinkdaten`, `hydrationMl`).
- Server modules use ES modules (`.mjs`) with `import`/`export`, no TypeScript on the backend.
- Frontend is a single large component file (`src/App.tsx`) rather than a decomposed component tree — new UI work generally extends this file rather than introducing a component library or router.

### Architecture Patterns

Two runtimes in one repo, deliberately kept simple (no framework, no DB):

- `src/` — React/TypeScript frontend. Talks to the API server via `/api/*`, proxied by Vite in dev (`vite.config.ts` proxies `/api` → `http://127.0.0.1:3001`).
- `server/` — layered plain-Node backend:
  - `http.mjs` — the only place routes are defined (`/api/config`, `/api/dashboard`, `/api/bookings`, `/api/bookings/import`, `/api/bookings/export`, etc.); handles JSON/text body parsing and CORS.
  - `service.mjs` — business logic: dashboard payload construction (today stats, current week, recent weeks, heatmap), automatic "missed reminder"/"unanswered" backfill entry generation, booking creation/import/replace.
  - `storage.mjs` — reads/writes/normalizes the CSV-backed entry storage; movement and hydration entries each have their own CSV file and schema.
  - `config.mjs` — loads/saves JSON config (reminder times, weekday-only flag, export path, hydration goal); computes reminder time slots from start/end times; resolves file paths; switches between default and `Test-`-prefixed config/data files based on `NODE_ENV=test`.
  - `utils/time.mjs` — timezone-aware (Europe/Vienna) date/time helpers.
  - `utils/parsing.mjs` — CSV/number/boolean parsing helpers shared across server modules.
- **Duplicated logic to watch**: reminder scheduling (deriving hourly slots from `reminderStartTime`/`reminderEndTime`, respecting `weekdaysOnly`) is implemented independently in both `server/config.mjs`/`service.mjs` (source of truth for server-side backfill generation) and `src/App.tsx` (client-side countdown/popup display). Changes to one must be mirrored in the other.
- **Data model**: CSV, not a database, by design (a prior DB was removed — see git history). Two CSV pairs per environment under `data/`:
  - Movement: `Bewegungsdaten.csv` / `Test-Bewegungsdaten.csv` — semicolon-delimited; columns: `id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at`.
  - Hydration: `Trinkdaten.csv` / `Test-Trinkdaten.csv` — comma-delimited; columns: `date,hydrationMl`.
  - The configured `exportPath` in `config/*.config.json` points at the movement CSV; the hydration path is derived separately in `config.mjs`.
- `NODE_ENV=test` is the switch that redirects both config and data files to their `Test-`-prefixed counterparts, keeping e2e/unit test runs from touching real data.

### Testing Strategy

- **Server unit tests**: `tests/server/*.test.mjs`, run via `npm run test:server` (Node's built-in test runner), test server modules directly (config loading, hydration timestamp logic, server smoke test). Run a single file with `node --test tests/server/<file>.test.mjs`.
- **E2E tests**: `tests/*.e2e.spec.ts`, run via `npm run test:e2e` (Playwright + Allure report), `npm run test:e2e:plain` (Playwright only), or `npm run test:e2e:headed`. Filter by title with `-g "test name"`. Helpers live in `tests/helpers/` (config fixtures, file helpers, logger, Playwright helper, global setup/teardown that starts/stops the API server against the `test` config) and `tests/page-objects/`.
- Playwright runs **serially** (`workers: 1`) — parallel e2e runs would race over the shared test CSV/config files, so don't try to parallelize without addressing that first.
- `tests/helpers/global-setup.ts` / `global-teardown.ts` start and stop the API server for e2e runs; `npm run dev` alone does **not** start the API server — the Vite dev server and `server.mjs` are separate processes that both need to run for manual/browser testing outside of Playwright.

### Git Workflow

- No enforced commit message convention or branching model is documented in the repo; `main` is the primary branch.

## Domain Context

- The app assumes an hourly reminder cadence between a configurable start and end time (`reminderStartTime` / `reminderEndTime`), optionally restricted to weekdays (`weekdaysOnly`).
- Movement entries capture whether a reminder was answered on time, late (`delay_minutes`), missed (`entry_type: unanswered`), or supplemented by an unplanned/"additional" break (`is_additional_break`). The server automatically backfills "missed"/"unanswered" entries for reminder slots that got no response.
- The hydration tracker ("Trinkmanager") logs drink events with a timestamp and volume in mL, evaluated against a configurable daily goal (`dailyDrinkLiters`).
- Day/week evaluation views aggregate these CSV-backed entries into stats, current-week and recent-weeks summaries, and a heatmap (built server-side in `service.mjs`, consumed by the frontend dashboard).

## Important Constraints

- **Cross-environment paths**: `vite.config.ts`'s `build.outDir` and the default `exportPath` in `config/bewegungserinnerung.config.json` point at Windows user-specific paths (`C:\Users\HeidiKlade\...`). This repo is developed across both a Windows host and a Linux devcontainer — check which environment you're in before assuming a path is wrong or "fixing" it.
- **No database**: persistence is intentionally CSV-file-based; don't reintroduce a database without an explicit decision to do so.
- **Keep reminder logic in sync**: any change to reminder time-slot computation or weekday handling must be applied to both `server/config.mjs`/`service.mjs` and `src/App.tsx`.
- **Test isolation**: server and e2e tests must run with `NODE_ENV=test` so they hit `Test-`-prefixed config/data files, not the real `data/Bewegungsdaten.csv` / `data/Trinkdaten.csv`.

## External Dependencies

- No external/third-party services or APIs — the app is fully local (frontend, API server, and CSV storage all run on the local machine).
- Notable dependencies: `react`/`react-dom` 19, `vite` 7, `@playwright/test`, `allure-playwright`/`allure-commandline`, `csv-parse`, `dotenv`, `@anthropic-ai/claude-code` (dev tooling, not runtime app logic).
