## 1. Workflow scaffolding

- [ ] 1.1 Create `.github/workflows/test.yml` triggered on `push` and `pull_request`.
- [ ] 1.2 Set up the job: checkout, Node setup matching the devcontainer's Node version, `npm ci`.
- [ ] 1.3 Set `NODE_ENV: test` and `TZ: Europe/Vienna` at the job or step level.

## 2. Server tests

- [ ] 2.1 Add a step running `npm run test:server` and confirm it fails the job on a failing test.

## 3. E2E tests + Allure

- [ ] 3.1 Add a step installing Playwright's Chromium browser (`npx playwright install --with-deps chromium`).
- [ ] 3.2 Add a step running `npm run test:e2e` (Playwright + Allure report generation), configured so the workflow proceeds to the artifact-upload step even if this step fails.
- [ ] 3.3 Add an `if: always()` step uploading `allure-report/` (and `allure-results/`) via `actions/upload-artifact`.

## 4. Verification

- [ ] 4.1 Verify no `data/Bewegungsdaten.csv` / `data/Trinkdaten.csv` changes occur after a full CI run (only `Test-`-prefixed files touched).
- [ ] 4.2 Push a throwaway branch/PR with a deliberately failing test to confirm the workflow reports a failing check and still uploads the Allure report.
- [ ] 4.3 Revert the deliberate failure and confirm the workflow goes green and still uploads a report.
- [ ] 4.4 Document in the repo (e.g. README badge or short note) how to find/download the Allure report from a workflow run.
