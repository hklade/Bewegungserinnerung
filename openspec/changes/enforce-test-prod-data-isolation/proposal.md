## Why

The server already supports switching between production and test config/data files via `NODE_ENV=test` (`server/config.mjs`), and Playwright's e2e config sets this correctly. However, the guarantee is implicit and scattered: `npm run dev` and `server.mjs` never explicitly set `NODE_ENV`, so "production data is used" is really "whatever `NODE_ENV` happens to be in the shell," and `tests/server/*.test.mjs` files set `NODE_ENV=test` manually/per-file rather than it being guaranteed by the `test:server` script itself. This is fragile: a developer with a stray `NODE_ENV=test` in their shell could unknowingly run the app against test data, and a future server test that forgets to set `NODE_ENV=test` would silently read/write real production CSVs. This change makes the separation explicit and enforced rather than incidental.

## What Changes

- `npm run dev`, `npm run build`, `npm run preview`, and `server.mjs`/`start.bat` (normal app startup) SHALL run with production config/data (`config/bewegungserinnerung.config.json`, `data/Bewegungsdaten.csv`, `data/Trinkdaten.csv`) regardless of any ambient `NODE_ENV` the shell happens to have — i.e. app startup no longer silently trusts an inherited environment variable for this decision.
- `npm run test:server` SHALL set `NODE_ENV=test` for the whole test run at the script level (not rely on individual test files to set/restore it), guaranteeing every server unit test runs against `Test-`-prefixed files.
- `npm run test:e2e` / `test:e2e:plain` / `test:e2e:headed` continue to guarantee `NODE_ENV=test` (already the case via `playwright.config.ts`); this change adds an explicit safeguard/assertion so a future config change can't accidentally drop it silently.
- Add a startup safeguard (e.g. a check in `server/config.mjs` or `server/http.mjs`) that makes it visible/loud which environment (production vs. test) and which concrete file paths are in effect, so a misconfiguration is easy to notice rather than silently reading/writing the wrong CSV.
- **BREAKING**: if any developer currently relies on setting `NODE_ENV=test` in their shell to make `npm run dev` use test data, that will stop working — production startup will always use production files. Test-mode local development must go through an explicit test-mode script instead (e.g. a new `npm run dev:test`), if that workflow is needed.

## Capabilities

### New Capabilities
- `server/environment-isolation`: guarantees around which config/data files (production vs. test) are used for a given way of running the app or its tests, independent of ambient environment state.

### Modified Capabilities
(none — no previously-specified capability exists yet for this behavior; it has been implicit/undocumented until now)

## Impact

- Affected code: `server/config.mjs` (env resolution), `server.mjs` (startup), `package.json` scripts (`dev`, `build`, `preview`, `test:server`), `start.bat`, `tests/server/*.test.mjs` (remove manual per-file `NODE_ENV` juggling once the script-level guarantee exists).
- No change to `playwright.config.ts`'s existing `NODE_ENV=test` wiring is required, only an added safeguard/assertion.
- Developer workflow: anyone who was implicitly depending on ambient `NODE_ENV=test` for local dev against test data needs a new explicit path (see BREAKING note).
