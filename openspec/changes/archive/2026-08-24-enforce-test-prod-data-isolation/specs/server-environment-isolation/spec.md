## Purpose

Guarantees that every way of running the application or its tests deterministically uses either production or test config/data files, never leaving that choice to an ambient, easily-forgotten environment variable.

## ADDED Requirements

### Requirement: Application startup defaults to production data unless test mode is explicitly requested
Starting the application for normal use (`npm run dev`, `npm run build` + `npm run preview`, or running `server.mjs` directly, including via `start.bat`) SHALL use the production config file (`config/bewegungserinnerung.config.json`) and production data files (`data/Bewegungsdaten.csv`, `data/Trinkdaten.csv`) whenever the invoking shell's `NODE_ENV` is absent, empty, or any value other than `test`. An invoking shell with `NODE_ENV=test` already set SHALL continue to use the test config and data files — that value is treated as an explicit, recognized choice, not ambient noise to be overridden.

#### Scenario: Normal startup with no NODE_ENV set
- **WHEN** a developer runs `server.mjs` (directly or via `start.bat`) in a shell with no `NODE_ENV` set at all
- **THEN** the running server uses the production config and data files

#### Scenario: Normal startup with an unrecognized NODE_ENV value
- **WHEN** a developer runs `npm run dev` in a shell that has `NODE_ENV` set to a value other than `test` (e.g. a typo, or a leftover value from an unrelated tool)
- **THEN** the running server uses the production config and data files

#### Scenario: Normal startup honors an explicit NODE_ENV=test
- **WHEN** a developer runs `server.mjs` in a shell that already has `NODE_ENV=test` exported
- **THEN** the running server reads and writes `config/test-bewegungserinnerung.config.json`, `data/Test-Bewegungsdaten.csv`, and `data/Test-Trinkdaten.csv`

### Requirement: An explicit script exists for local exploratory testing against test data
`npm run dev:test` SHALL start both the API server and the Vite dev server with `NODE_ENV=test`, so a developer can deliberately explore the full app against test data without relying on ambient shell state.

#### Scenario: dev:test uses test data
- **WHEN** a developer runs `npm run dev:test`
- **THEN** the running API server reads and writes `config/test-bewegungserinnerung.config.json`, `data/Test-Bewegungsdaten.csv`, and `data/Test-Trinkdaten.csv`

### Requirement: Server unit test run always uses test data
Running the server unit test suite via `npm run test:server` SHALL use the test config file (`config/test-bewegungserinnerung.config.json`) and test data files (`data/Test-Bewegungsdaten.csv`, `data/Test-Trinkdaten.csv`) for every test in the run, without depending on individual test files to set or restore `NODE_ENV` themselves.

#### Scenario: test:server guarantees test environment at the script level
- **WHEN** `npm run test:server` is executed
- **THEN** every test file in `tests/server/*.test.mjs` runs with the test environment active
- **AND** no individual test file is required to set `process.env.NODE_ENV` itself for this guarantee to hold

#### Scenario: Production data untouched by server unit tests
- **WHEN** `npm run test:server` completes, whether tests pass or fail
- **THEN** `data/Bewegungsdaten.csv` and `data/Trinkdaten.csv` have not been created or modified

### Requirement: E2E test run always uses test data
Running any of the e2e npm scripts (`test:e2e`, `test:e2e:plain`, `test:e2e:headed`, `test:e2e:dev`) SHALL use the test config and test data files for the entire run, and this guarantee SHALL be verifiable independent of `playwright.config.ts`'s current wiring (e.g. via an explicit runtime check), so a future edit to the Playwright config cannot silently drop it.

#### Scenario: E2E run rejects a misconfigured environment
- **WHEN** an e2e test run starts and the API server process would not have `NODE_ENV=test` set
- **THEN** the test run fails fast with a clear error rather than proceeding to read or write production data files

#### Scenario: E2E run never silently reuses a pre-existing server
- **WHEN** an e2e test run starts and a server process (in any environment) already answers on the configured webServer port
- **THEN** Playwright starts a fresh server through the guarded startup script rather than reusing the pre-existing process as-is, so the `NODE_ENV=test` guard is always exercised

#### Scenario: Production data untouched by e2e tests
- **WHEN** any e2e npm script completes, whether tests pass or fail
- **THEN** `data/Bewegungsdaten.csv` and `data/Trinkdaten.csv` have not been created or modified

### Requirement: The active export path is always environment-consistent, even when a config update omits it
Saving configuration via `PUT /api/config` (or any other path that ends up calling `saveConfig`/`resolveConfigPath`) with a payload that omits `exportPath` SHALL resolve to the export path matching the currently active `NODE_ENV`, never unconditionally to the production path.

#### Scenario: Config update without exportPath stays on the test path under NODE_ENV=test
- **WHEN** the server is running with `NODE_ENV=test` and a client sends `PUT /api/config` with a payload that has no `exportPath` field
- **THEN** the server's `exportPath` remains `data/Test-Bewegungsdaten.csv`, not `data/Bewegungsdaten.csv`

### Requirement: Active environment is visible at startup
Whenever the server starts (production or test mode), it SHALL make the active environment and the concrete config/data file paths in effect visible (e.g. via a startup log line), so a misconfiguration is easy to notice.

#### Scenario: Startup log identifies environment and file paths
- **WHEN** the server process starts, in either production or test mode
- **THEN** it logs which environment is active and the resolved config file path and data file paths being used
