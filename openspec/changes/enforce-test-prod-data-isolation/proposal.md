## Why

The server already supports switching between production and test config/data files via `NODE_ENV=test` (`server/config.mjs`), and Playwright's e2e config sets this correctly. However, the guarantee is implicit and scattered: `npm run dev` and `server.mjs` never explicitly set `NODE_ENV`, so "production data is used" is really "whatever `NODE_ENV` happens to be in the shell," and `tests/server/*.test.mjs` files set `NODE_ENV=test` manually/per-file rather than it being guaranteed by the `test:server` script itself. This is fragile: a developer with a stray `NODE_ENV=test` in their shell could unknowingly run the app against test data, and a future server test that forgets to set `NODE_ENV=test` would silently read/write real production CSVs. This change makes the separation explicit and enforced rather than incidental.

## What Changes

- `npm run dev`, `npm run build`, `npm run preview`, and `server.mjs`/`start.bat` (normal app startup) SHALL run with production config/data (`config/bewegungserinnerung.config.json`, `data/Bewegungsdaten.csv`, `data/Trinkdaten.csv`) unless the shell's ambient `NODE_ENV` is explicitly `test` — an absent, empty, or unrecognized `NODE_ENV` normalizes to production; `NODE_ENV=test` is treated as an explicit, recognized choice and is passed through unchanged (this is also what makes the explicit `npm run dev:test` script work). App startup no longer silently trusts an unrecognized inherited environment variable value for this decision, but a shell that has genuinely opted into `test` is still honored.
- `npm run test:server` SHALL set `NODE_ENV=test` for the whole test run at the script level (not rely on individual test files to set/restore it), guaranteeing every server unit test runs against `Test-`-prefixed files.
- `npm run test:e2e` / `test:e2e:plain` / `test:e2e:headed` continue to guarantee `NODE_ENV=test` (already the case via `playwright.config.ts`); this change adds an explicit safeguard/assertion so a future config change can't accidentally drop it silently.
- Add a startup safeguard (e.g. a check in `server/config.mjs` or `server/http.mjs`) that makes it visible/loud which environment (production vs. test) and which concrete file paths are in effect, so a misconfiguration is easy to notice rather than silently reading/writing the wrong CSV.
- Add an explicit `npm run dev:test` script so running the full app against test data locally is a deliberate, visible choice rather than something that depends on stray ambient shell state.
- Declare `@rollup/rollup-linux-x64-gnu` and `@rollup/rollup-win32-x64-gnu` as explicit `optionalDependencies` in `package.json`, so `npm install` pulls in the native Rollup binary for both platforms this repo is developed on (Windows host, Linux devcontainer) regardless of which one `npm install` was run from — otherwise a `node_modules` produced on one platform silently lacks the binary the other platform needs, which was blocking e2e verification of this very change inside the Linux devcontainer.
- **Root-cause fix discovered during verification**: `server/config.mjs`'s `resolveConfigPath()` fell back to the production export path whenever the config object it received had no `exportPath` field — regardless of `NODE_ENV`. Since `PUT /api/config` passes its request body straight into this function, any client (including a test's own cleanup code, e.g. `tests/main-page.e2e.spec.ts`'s `afterEach`) that PUTs a config payload without `exportPath` would silently redirect a correctly-`NODE_ENV=test`-started server into writing to the real `data/Bewegungsdaten.csv`. Fixed so the fallback is always the export path matching the active `NODE_ENV`, never unconditionally production. This bug predates this change and is orthogonal to the startup-time guards above, but it defeats the same guarantee this change exists to provide, so it's fixed as part of it rather than filed separately.

## Capabilities

### New Capabilities
- `server/environment-isolation`: guarantees around which config/data files (production vs. test) are used for a given way of running the app or its tests, independent of ambient environment state.
- `cross-platform-dev-tooling`: guarantees that `npm install` produces a working dev/build toolchain (Vite/Rollup) regardless of which of this repo's two development platforms it was run on.

### Modified Capabilities
(none — no previously-specified capability exists yet for this behavior; it has been implicit/undocumented until now)

## Impact

- Affected code: `server.mjs` (startup normalization), `server/http.mjs` (startup log), `package.json` scripts (`dev:test`, `test:server`) and `optionalDependencies` (cross-platform Rollup binaries), `scripts/dev-test-server.mjs` (new), `scripts/playwright-server.mjs` (e2e safeguard), `tests/server/*.test.mjs` (remove manual per-file `NODE_ENV` juggling once the script-level guarantee exists).
- No change to `playwright.config.ts`'s existing `NODE_ENV=test` wiring is required, only an added safeguard/assertion.
- Developer workflow: a shell with an unrecognized/empty `NODE_ENV` now deterministically gets production data on normal startup; a shell with `NODE_ENV=test` continues to get test data (unchanged from today), and `npm run dev:test` is the new explicit, discoverable way to opt into that for local exploratory testing without depending on ambient state.
