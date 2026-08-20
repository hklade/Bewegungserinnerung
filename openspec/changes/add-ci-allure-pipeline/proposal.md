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
- Affects developer/reviewer experience (PR checks, downloadable Allure report) and repo CI configuration only.
- Depends on the test suite already being runnable headlessly in a CI container (Playwright browser install, Node version matching local dev).

### Deviation found during implementation

Contrary to the original assumption above ("No changes to application code are required"), implementing this change surfaced and required fixing two pre-existing bugs, without which the CI job could not run at all:

- `config/test-bewegungserinnerung.config.json` had a corrupted `exportPath` (pointing at the production CSV, then at a devcontainer-only absolute path) — fixed to a relative path consistent with the production config.
- `server/config.mjs`'s `resolveConfigPath()` took `exportPath` from the config file verbatim, with no resolution against a base directory. A relative path only worked by accident, depending on the process's current working directory at startup. It now resolves relative paths against `config/`; absolute paths (including the Windows production path) are left unchanged. **This also changes behavior for real users**, not just tests: a relative path typed into the config form in the UI is now resolved against `config/` instead of being stored/used verbatim.
- `test:server` did not guarantee `NODE_ENV=test` at the script level (relied on ambient environment), overlapping with task 3.1 of [[enforce-test-prod-data-isolation]]; fixed here via a new `scripts/test-server.mjs` wrapper since the CI job depends on it.

See `server/config.mjs`'s `resolveConfigPath()` comment for the resolution rule.

Also surfaced while stabilizing the e2e suite in CI (beyond the "no code changes" assumption, but necessary for the CI job to go green rather than just start):

- `playwright.config.ts`'s `webServer.command` and `scripts/playwright-server.mjs` resolved paths relative to the process's current working directory rather than their own file location, which broke when Playwright's `--config` pointed at a file outside the repo root.
- A `test.step()` call from module scope (before any test ran) crashed the whole suite; a template-literal typo silently produced a literal placeholder string instead of an interpolated time value; and the root cause of issue #1 (`data/Test-Bewegungsdaten.csv` serving as both a static e2e fixture and the writable test-runtime database) made `csv import replaces existing rows` non-deterministic. All fixed — see the commit history on this branch for details. The e2e suite currently runs Chromium-only (Firefox/Webkit commented out, not removed) to keep CI runtime down, which is a smaller scope than `design.md`'s original "chromium-only browser install" decision anticipated but arrives at the same result.

## Final status

All tasks in `tasks.md` are complete and verified against real CI runs on `feature/add-ci-allure-pipeline` (PR #2). The workflow is green, publishes the Allure report artifact on every run (pass or fail), and `README.md` documents how to retrieve it.
