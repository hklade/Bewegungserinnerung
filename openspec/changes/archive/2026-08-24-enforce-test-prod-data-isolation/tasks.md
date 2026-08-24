## 1. Production startup hardening

- [x] 1.1 In `server.mjs`, normalize `process.env.NODE_ENV` at the top of the file before importing `server/config.mjs`: leave it as `test` if already `test`, otherwise force it to `production`.
- [x] 1.2 Add a startup log line in `server.mjs` (or `server/http.mjs`'s `startServer()`) printing the active environment and the resolved config/data file paths (`SERVER_PATHS`).
- [x] 1.3 Verify `node server.mjs` and `start.bat` use production files whenever the shell's `NODE_ENV` is absent or set to anything other than `test`, and correctly continue to use test files when the shell has `NODE_ENV=test` explicitly exported (see the corrected proposal/spec — a bare "always production" was inconsistent with the design decision and has been reconciled in favor of design.md's behavior).

## 2. Explicit test-mode dev script

- [x] 2.1 Add an `npm run dev:test` script that sets `NODE_ENV=test` for `vite --configLoader runner` (and starts/points at the test-mode API server), documented as the explicit way to run the full app against test data locally.
- [x] 2.2 Update `README.md` / `CLAUDE.md` if needed to mention `dev:test` as the supported way to explore against test data.

## 3. Server unit test isolation

- [x] 3.1 Change the `test:server` script in `package.json` to set `NODE_ENV=test` for the whole `node --test tests/server/*.test.mjs` invocation. (Already done prior to this change via `scripts/test-server.mjs`; verified it sets `NODE_ENV=test` for the whole run.)
- [x] 3.2 Remove the now-redundant manual `process.env.NODE_ENV = 'test'` set/restore logic in `tests/server/config-loader.test.mjs` (keep the assertions).
- [x] 3.3 Confirm `tests/server/server-smoke.test.mjs`'s explicit `env: { NODE_ENV: 'test' }` on its spawned subprocess is still correct/needed now that the parent process also has `NODE_ENV=test` (subprocess env inheritance may make the explicit override redundant, but verify before removing). Kept as-is: redundant but harmless, and it documents the requirement explicitly for a reader who doesn't know the parent process's env.

## 4. E2E safeguard

- [x] 4.1 Add an explicit runtime check (e.g. in `scripts/playwright-server.mjs` or the server's startup path when launched for e2e) that fails fast with a clear error if `NODE_ENV` is not `test` when the e2e web server boots.
- [x] 4.2 Confirm `playwright.config.ts`'s existing `NODE_ENV: "test"` wiring still passes with the new check in place.
- [x] 4.3 Set `playwright.config.ts`'s `webServer.reuseExistingServer` to `false` so a pre-existing (possibly misconfigured) server on the target port is never silently reused instead of going through the guarded startup script.

## 6. Cross-platform Rollup binary fix (unblocks e2e verification)

- [x] 6.1 Add `@rollup/rollup-linux-x64-gnu` and `@rollup/rollup-win32-x64-gnu` (pinned to the `rollup` version Vite resolves) as explicit `optionalDependencies` in `package.json`.
- [x] 6.2 Run `npm install` in the Linux devcontainer and confirm `npm run dev` / `npm run build` no longer fail with `Cannot find module @rollup/rollup-linux-x64-gnu`.

## 7. Root-cause fix: config exportPath fallback leaked to production path under NODE_ENV=test

- [x] 7.1 Fix `resolveConfigPath` in `server/config.mjs` so that when the config object passed to it has no `exportPath` (e.g. a `PUT /api/config` payload that omits the field, as `tests/main-page.e2e.spec.ts`'s `afterEach` does), the fallback is the export path matching the *active* `NODE_ENV` (test or production), not unconditionally the production path. This was a real, pre-existing bug — unrelated to any of the startup-time guards added in this change — discovered while verifying task 5.3: it let a test run's config PUT silently redirect the running server (still correctly started with `NODE_ENV=test`) to write bookings into the real `data/Bewegungsdaten.csv`.
- [x] 7.2 Add a regression test (`tests/server/config-loader.test.mjs`) covering `saveConfig` with `exportPath` omitted under `NODE_ENV=test`.

## 5. Verification

- [x] 5.1 Run `npm run dev`/`server.mjs` with an unrecognized or absent `NODE_ENV` and confirm production files are used; run with `NODE_ENV=test` pre-set and confirm test files are used (per corrected task 1.3).
- [x] 5.2 Run `npm run test:server` and confirm only `Test-`-prefixed files are touched (diff `data/` before/after).
- [x] 5.3 Run `npm run test:e2e:plain` and confirm only `Test-`-prefixed files are touched. (16/16 passed in an isolated run; confirmed no `Test-`-file writes leaked to the production CSVs once task 7.1's fix was in place. Note: unrelated concurrent activity from other Claude Code sessions in this same workspace was independently observed writing to the production CSV during verification — not caused by this change's code paths.)
- [x] 5.4 Run `npm run dev:test` and manually confirm it reads/writes test data files, not production ones.
