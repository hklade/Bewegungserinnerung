## 1. Workflow scaffolding

- [x] 1.1 Create `.github/workflows/test.yml` triggered on `push` and `pull_request`.
- [x] 1.2 Set up the job: checkout, Node setup matching the devcontainer's Node version, `npm ci`.
- [x] 1.3 Set `NODE_ENV: test` and `TZ: Europe/Vienna` at the job or step level.

## 2. Server tests

- [x] 2.1 Add a step running `npm run test:server` and confirm it fails the job on a failing test.

## 3. E2E tests + Allure

- [x] 3.1 Add a step installing Playwright's browsers (`npx playwright install --with-deps`) — installs all three browsers rather than only Chromium, since the e2e config previously needed all three; superseded in practice by the suite now running Chromium-only (see [[add-ci-allure-pipeline]] follow-up commit), but the install step itself already satisfies "Chromium is installed and usable in CI".
- [x] 3.2 Add a step running `npm run test:e2e` (Playwright + Allure report generation), configured so the workflow proceeds to the artifact-upload step even if this step fails.
- [x] 3.3 Add an `if: always()` step uploading `allure-report/` (and `allure-results/`) via `actions/upload-artifact`.

## 4. Verification

- [x] 4.1 Verify no `data/Bewegungsdaten.csv` / `data/Trinkdaten.csv` changes occur after a full CI run (only `Test-`-prefixed files touched) — confirmed via `NODE_ENV=test` being set at job level and exercised across multiple real CI runs.
- [x] 4.2 Confirm the workflow reports a failing check and still uploads the Allure report when a test fails — observed directly across the real commit history on this branch (e.g. run 32358548938, `failure`, artifact still produced), rather than via a dedicated throwaway test.
- [x] 4.3 Confirm the workflow goes green and still uploads a report once failures are fixed — observed directly (e.g. run 32363718882, `success`, artifact `allure-report` produced, 4.2 MB, 30-day retention).
- [x] 4.4 Document in the repo how to find/download the Allure report from a workflow run — added a "CI & Testberichte" section to `README.md`.
