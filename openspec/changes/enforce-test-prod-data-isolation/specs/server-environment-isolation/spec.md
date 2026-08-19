## Purpose

Guarantees that every way of running the application or its tests deterministically uses either production or test config/data files, never leaving that choice to an ambient, easily-forgotten environment variable.

## ADDED Requirements

### Requirement: Application startup always uses production data
Starting the application for normal use (`npm run dev`, `npm run build` + `npm run preview`, or running `server.mjs` directly, including via `start.bat`) SHALL use the production config file (`config/bewegungserinnerung.config.json`) and production data files (`data/Bewegungsdaten.csv`, `data/Trinkdaten.csv`), regardless of any `NODE_ENV` value already present in the invoking shell.

#### Scenario: Dev server ignores ambient NODE_ENV=test
- **WHEN** a developer runs `npm run dev` in a shell that already has `NODE_ENV=test` exported
- **THEN** the running server reads and writes `config/bewegungserinnerung.config.json`, `data/Bewegungsdaten.csv`, and `data/Trinkdaten.csv`

#### Scenario: Normal startup with no NODE_ENV set
- **WHEN** a developer runs `server.mjs` (directly or via `start.bat`) in a shell with no `NODE_ENV` set at all
- **THEN** the running server uses the production config and data files

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

#### Scenario: Production data untouched by e2e tests
- **WHEN** any e2e npm script completes, whether tests pass or fail
- **THEN** `data/Bewegungsdaten.csv` and `data/Trinkdaten.csv` have not been created or modified

### Requirement: Active environment is visible at startup
Whenever the server starts (production or test mode), it SHALL make the active environment and the concrete config/data file paths in effect visible (e.g. via a startup log line), so a misconfiguration is easy to notice.

#### Scenario: Startup log identifies environment and file paths
- **WHEN** the server process starts, in either production or test mode
- **THEN** it logs which environment is active and the resolved config file path and data file paths being used
