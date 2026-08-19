## Purpose

Automatically runs the project's server and end-to-end test suites in CI on every push and pull request, and publishes an Allure report of the results so failures and test history are visible without running tests locally.

## ADDED Requirements

### Requirement: CI runs on push and pull request
The system SHALL run an automated CI workflow whenever commits are pushed to the repository or a pull request is opened or updated.

#### Scenario: Push triggers CI
- **WHEN** a commit is pushed to any branch with an open workflow trigger (e.g. `main` or a PR source branch)
- **THEN** the CI workflow starts automatically without manual intervention

#### Scenario: Pull request triggers CI
- **WHEN** a pull request is opened or synchronized (new commits pushed to it)
- **THEN** the CI workflow runs against the PR's head commit and reports a check status on the PR

### Requirement: CI executes both existing test suites
The CI workflow SHALL run the server unit test suite and the Playwright end-to-end test suite using the project's existing npm scripts, without introducing a separate/duplicate test runner configuration.

#### Scenario: Server tests run in CI
- **WHEN** the CI workflow executes
- **THEN** it runs the equivalent of `npm run test:server` and reports its pass/fail result

#### Scenario: E2E tests run in CI
- **WHEN** the CI workflow executes
- **THEN** it runs the equivalent of the project's Playwright e2e suite and reports its pass/fail result

### Requirement: CI test runs never touch production data
The CI workflow SHALL execute all test suites with the environment configured so that only test-designated config and data files are read or written, never the production config or data files.

#### Scenario: CI environment forces test data
- **WHEN** the CI workflow runs the server or e2e test suites
- **THEN** the process environment is configured (e.g. `NODE_ENV=test`) such that only `Test-`-prefixed data files and the test config file are created, read, or modified
- **AND** `data/Bewegungsdaten.csv` and `data/Trinkdaten.csv` are not created or modified by the CI run

### Requirement: CI publishes an Allure report of e2e results
The CI workflow SHALL generate an Allure report from the e2e test run and make it available as a downloadable/viewable artifact of the CI run.

#### Scenario: Allure report generated after e2e run
- **WHEN** the e2e test suite finishes executing (whether it passed or failed)
- **THEN** an Allure report is generated from the resulting `allure-results/`

#### Scenario: Allure report accessible after CI run
- **WHEN** a CI workflow run completes
- **THEN** the generated Allure report is attached to the run (e.g. as a CI build artifact) and can be retrieved by a reviewer without re-running the tests

### Requirement: CI fails the build on test failure
The CI workflow SHALL report a failing status whenever either the server test suite or the e2e test suite fails.

#### Scenario: Server test failure fails the workflow
- **WHEN** any server unit test fails
- **THEN** the overall CI workflow run is marked as failed

#### Scenario: E2E test failure fails the workflow
- **WHEN** any Playwright e2e test fails
- **THEN** the overall CI workflow run is marked as failed, even though the Allure report step still runs and publishes results for the failed run
