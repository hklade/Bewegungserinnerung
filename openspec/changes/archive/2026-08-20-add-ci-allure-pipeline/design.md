## Context

The project has two test suites, both currently run manually:
- `npm run test:server` → Node's built-in test runner over `tests/server/*.test.mjs`.
- `npm run test:e2e` → `node scripts/test-e2e-with-allure.mjs`, which runs `npx playwright test` (Playwright's own `webServer` option starts the API+Vite via `scripts/playwright-server.mjs` with `NODE_ENV=test` already set, see `playwright.config.ts`) and then `npx allure generate allure-results --clean -o allure-report`.

No CI configuration exists yet (no `.github/workflows/`). The devcontainer image is `mcr.microsoft.com/devcontainers/typescript-node`; local Node is v24. Playwright is pinned via `@playwright/test` in `package.json`.

## Goals / Non-Goals

**Goals:**
- Run both existing suites unmodified via their existing npm scripts, on push and PR.
- Guarantee `NODE_ENV=test` for the whole job so production CSV/config files are never touched (relies on / reinforces [[enforce-test-prod-data-isolation]]).
- Publish the Allure HTML report as a retrievable CI artifact, including on failure.
- Fail the CI check when either suite fails.

**Non-Goals:**
- Publishing the Allure report to a persistent hosted dashboard (e.g. GitHub Pages) — out of scope for this change; artifact upload is sufficient.
- Test parallelization/sharding in CI — Playwright is intentionally serial (`workers: 1`) per project convention and this change does not revisit that.
- Changing or adding test cases — this only wires up existing suites.

## Decisions

**Single workflow file, two sequential jobs (or one job, two steps) rather than a matrix.**
The two suites are cheap and fast (Node test runner + serial Playwright); a matrix/parallel job setup would add complexity (multiple artifact uploads, more YAML) without a clear benefit at this scale. Alternative considered: separate workflows per suite — rejected because it splits the single "tests green" signal PR reviewers rely on into two checks for no benefit.

**Reuse `npm run test:e2e` (which already wraps Allure generation) instead of calling `playwright test` and `allure generate` separately in the workflow.**
Keeps the CI step as a thin wrapper and avoids the workflow drifting out of sync with `scripts/test-e2e-with-allure.mjs` if that script changes. Alternative: inline the Playwright + Allure commands directly in the workflow YAML — rejected, that duplicates logic that already lives in the npm script and would need to be kept in sync manually.

**Set `NODE_ENV=test` at the job/step level in the workflow**, in addition to whatever [[enforce-test-prod-data-isolation]] enforces at the script level, as defense in depth for CI specifically.
CI is the one environment where a mistake writing to `data/Bewegungsdaten.csv` would be silent (no human watching) and would corrupt the checked-in-adjacent production CSVs if the runner happened to share a filesystem with real data (it doesn't today, but the explicit env var costs nothing and documents intent in the workflow file itself).

**Upload `allure-report/` via `actions/upload-artifact`, run in an `if: always()` step.**
Ensures the report is available even when tests fail — the primary use case for wanting a report at all. Alternative considered: `peaceiris/actions-gh-pages` to publish a persistent Allure history site — deferred as a possible future enhancement (Non-Goals), since it requires additional repo permissions/setup (`gh-pages` branch, `GITHUB_TOKEN` write access) beyond what this change needs to deliver value.

**Playwright browser binaries installed via `npx playwright install --with-deps chromium`** (matching the single `chromium` project already configured in `playwright.config.ts`), not all browsers.
Faster CI, matches what's actually configured/used locally today.

## Risks / Trade-offs

- [Risk] CI runner environment differs from devcontainer (fonts, timezone, headless quirks) causing e2e flakiness that doesn't reproduce locally → Mitigation: pin the workflow's `TZ` to `Europe/Vienna` (matching `server/utils/time.mjs` assumptions) and use the same Node major version as `.devcontainer`.
- [Risk] Allure report upload silently fails to help if the job is cancelled/timed out before the `if: always()` step runs → Mitigation: keep `globalTimeout` (already 1 hour in `playwright.config.ts`) well under the workflow job's own timeout so Playwright self-terminates before GitHub Actions force-kills the job.
- [Trade-off] No persistent Allure history/trend across runs (only per-run artifacts) → acceptable for now per Non-Goals; can be revisited later if trend data becomes valuable.
