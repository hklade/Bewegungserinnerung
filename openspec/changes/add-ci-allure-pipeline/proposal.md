## Why

Tests currently only run locally on demand (`npm run test:server`, `npm run test:e2e`). There is no automated verification on push/PR, so regressions can land unnoticed, and Allure reports are only ever generated on a developer's machine. A GitHub Actions workflow that runs the existing test suites and publishes the Allure report on every push/PR closes that gap.

## What Changes

- Add a GitHub Actions workflow that, on push and pull request, installs dependencies and runs both test suites: `npm run test:server` (Node test runner) and the Playwright e2e suite.
- The e2e run in CI must produce Allure results (`allure-results/`) and generate an Allure HTML report (`allure-report/`), reusing the existing `npm run test:e2e` / `scripts/test-e2e-with-allure.mjs` pipeline rather than inventing a parallel one.
- Publish the generated Allure report as a workflow artifact (or equivalent CI-accessible output) so it can be downloaded/viewed after each run.
- The CI job must run with `NODE_ENV=test` for both test suites so it only ever touches `Test-`-prefixed config/data files, never `data/Bewegungsdaten.csv` / `data/Trinkdaten.csv` ([[enforce-test-prod-data-isolation]] hardens this guarantee at the source; this workflow must not regress it by, e.g., invoking scripts without `NODE_ENV=test`).
- The workflow must fail (non-zero exit / red check) when either test suite fails, so CI accurately gates the branch/PR.

## Capabilities

### New Capabilities
- `ci/test-pipeline`: automated CI execution of the server and e2e test suites on push/PR, with Allure report generation and publication as a build artifact.

### Modified Capabilities
(none — no existing specs are being changed; this only adds new CI automation)

## Impact

- New file(s): a GitHub Actions workflow under `.github/workflows/` (e.g. `.github/workflows/test.yml`).
- No changes to application code (`src/`, `server/`) are required; the workflow reuses existing npm scripts (`test:server`, `test:e2e`).
- Affects developer/reviewer experience (PR checks, downloadable Allure report) and repo CI configuration only.
- Depends on the test suite already being runnable headlessly in a CI container (Playwright browser install, Node version matching local dev).
