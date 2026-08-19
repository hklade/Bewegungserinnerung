## 1. Production startup hardening

- [ ] 1.1 In `server.mjs`, normalize `process.env.NODE_ENV` at the top of the file before importing `server/config.mjs`: leave it as `test` if already `test`, otherwise force it to `production`.
- [ ] 1.2 Add a startup log line in `server.mjs` (or `server/http.mjs`'s `startServer()`) printing the active environment and the resolved config/data file paths (`SERVER_PATHS`).
- [ ] 1.3 Verify `node server.mjs` and `start.bat` use production files even when the shell has `NODE_ENV=test` exported beforehand.

## 2. Explicit test-mode dev script

- [ ] 2.1 Add an `npm run dev:test` script that sets `NODE_ENV=test` for `vite --configLoader runner` (and starts/points at the test-mode API server), documented as the explicit way to run the full app against test data locally.
- [ ] 2.2 Update `README.md` / `CLAUDE.md` if needed to mention `dev:test` as the supported way to explore against test data.

## 3. Server unit test isolation

- [ ] 3.1 Change the `test:server` script in `package.json` to set `NODE_ENV=test` for the whole `node --test tests/server/*.test.mjs` invocation.
- [ ] 3.2 Remove the now-redundant manual `process.env.NODE_ENV = 'test'` set/restore logic in `tests/server/config-loader.test.mjs` (keep the assertions).
- [ ] 3.3 Confirm `tests/server/server-smoke.test.mjs`'s explicit `env: { NODE_ENV: 'test' }` on its spawned subprocess is still correct/needed now that the parent process also has `NODE_ENV=test` (subprocess env inheritance may make the explicit override redundant, but verify before removing).

## 4. E2E safeguard

- [ ] 4.1 Add an explicit runtime check (e.g. in `scripts/playwright-server.mjs` or the server's startup path when launched for e2e) that fails fast with a clear error if `NODE_ENV` is not `test` when the e2e web server boots.
- [ ] 4.2 Confirm `playwright.config.ts`'s existing `NODE_ENV: "test"` wiring still passes with the new check in place.

## 5. Verification

- [ ] 5.1 Run `npm run dev` with `NODE_ENV=test` pre-set in the shell and confirm production files are used (per task 1.3).
- [ ] 5.2 Run `npm run test:server` and confirm only `Test-`-prefixed files are touched (diff `data/` before/after).
- [ ] 5.3 Run `npm run test:e2e:plain` and confirm only `Test-`-prefixed files are touched.
- [ ] 5.4 Run `npm run dev:test` and manually confirm it reads/writes test data files, not production ones.
