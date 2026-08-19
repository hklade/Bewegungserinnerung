## Context

`server/config.mjs` decides between production and test config/data purely by reading `process.env.NODE_ENV` at call time (`getConfigFilePath()`, `resolveHydrationExportPath()`). Nothing sets `NODE_ENV` for `npm run dev` / `npm run build` / `npm run preview` / `server.mjs` / `start.bat` — they inherit whatever the shell has. `tests/server/config-loader.test.mjs` sets `process.env.NODE_ENV = 'test'` manually inside the test and restores it in `t.after()`; `tests/server/server-smoke.test.mjs` passes `NODE_ENV: 'test'` via `spawnSync`'s `env` option for a subprocess. `playwright.config.ts` already sets `NODE_ENV: "test"` on its `webServer.env`, so e2e is currently safe as long as that file isn't edited carelessly.

## Goals / Non-Goals

**Goals:**
- Make production startup deterministic: always production data, no matter the shell's ambient `NODE_ENV`.
- Make `npm run test:server` deterministic at the script/harness level, not per-test-file.
- Add a visible safeguard (startup log) so a misconfigured environment is obvious rather than a silent wrong-file read/write.

**Non-Goals:**
- Introducing a full environment/config management library (e.g. `dotenv`-based multi-env system) — the existing prod/test binary switch is sufficient for this prototype; this change only hardens it.
- Changing the actual config/data file formats or locations.
- Removing the ability to ever run the app against test data locally (e.g. for manual exploratory testing) — see the new `dev:test` script decision below, which preserves that as an explicit opt-in.

## Decisions

**Have `server.mjs` (the production entry point) explicitly force `process.env.NODE_ENV` to a production value before importing `server/config.mjs`, rather than only fixing `package.json` scripts.**
`server.mjs` can be invoked directly (`node server.mjs`, as `start.bat` does) without going through any npm script, so the guarantee must live at the entry point itself, not only in `package.json`. Concretely: if `NODE_ENV` is not already one of a small explicit allow-list the app understands (`test`), normalize/force it to `production` at the very top of `server.mjs` before any other import runs. Alternative considered: reject startup entirely if `NODE_ENV=test` is set for `server.mjs` — rejected as too disruptive; the "explicit test-mode script" decision below covers the legitimate case of wanting to run the full app locally against test data.

**Add an explicit `npm run dev:test` (and analogous `build`/`preview` if needed later) that sets `NODE_ENV=test` for local exploratory runs against test data, instead of relying on ambient shell state.**
This preserves the legitimate workflow (manually poking at the app against test data) while making it an explicit, visible choice (`npm run dev:test` vs `npm run dev`) rather than implicit shell state. Cross-platform env var setting uses `cross-env`-style inline syntax already compatible with the project's Node/npm setup, or a tiny wrapper script — decide at implementation time based on what's simplest given no `cross-env` dependency currently exists.

**Fix `test:server` by wrapping the Node test runner invocation so `NODE_ENV=test` is guaranteed for the whole process tree, then simplify the individual test files to drop their manual set/restore dance.**
`node --test tests/server/*.test.mjs` inherits the parent shell's env; the fix is at the `package.json` script level (`NODE_ENV=test node --test ...`), which is simpler and more robust than trusting every current and future test file to set it correctly. `tests/server/config-loader.test.mjs`'s manual `process.env.NODE_ENV = 'test'` becomes redundant (though harmless) once this is guaranteed — clean it up so future readers don't think it's load-bearing. Alternative considered: leave per-file env juggling as the mechanism and just audit all files — rejected, it doesn't prevent a future new test file from forgetting to do the same.

**Startup visibility via a single log line, not a hard failure, for the "which environment am I in" safeguard.**
A log line (`[server] environment=production config=... exportPath=... hydrationExportPath=...`) is enough to make misconfiguration obvious in local dev and CI logs without adding a new failure mode that could break legitimate uses. A hard runtime assertion is added specifically for the e2e case (per the spec's "E2E run rejects a misconfigured environment" scenario) because there the correct value is always known in advance (`test`) and a silent wrong-environment e2e run is the exact failure this change exists to prevent.

## Risks / Trade-offs

- [Risk] Forcing `NODE_ENV` inside `server.mjs` could surprise a future deployment setup that legitimately sets `NODE_ENV=production` via its own mechanism and expects the app to just respect it → Mitigation: the normalization only *forces* a value when it's absent or not one of the recognized values (`test`); an explicit `NODE_ENV=production` continues to work as today.
- [Risk] Introducing `dev:test` adds a second dev entry point that could drift from `dev` over time (e.g. new flags added to one but not the other) → Mitigation: keep the two scripts as thin as possible, differing only in the `NODE_ENV` value, so there's minimal surface to drift.
- [Trade-off] Hard-failing the e2e run on misconfiguration adds a small amount of startup complexity to `scripts/playwright-server.mjs` (or wherever the check lives) → acceptable, this is exactly the safety net this change is meant to add for the highest-risk automated path.
