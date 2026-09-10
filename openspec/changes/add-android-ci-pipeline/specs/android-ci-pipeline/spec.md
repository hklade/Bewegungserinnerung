## Purpose

Automatically runs the Android app's Gradle unit and Compose UI test suites in CI whenever `android/**` changes, without re-running the existing web app's test suite for Android-only changes and without the Android job running for web-only changes, mirroring the guarantee `ci-test-pipeline` already provides for the web app.

## ADDED Requirements

### Requirement: CI runs the Android test job only when Android-relevant paths change
The system SHALL run the Android Gradle test job when a push or pull request changes any file under `android/**`, and SHALL NOT run it when only web-relevant paths (`src/**`, `server/**`, `shared/**`, `tests/**`, root web tooling config) or `openspec/**` changed.

#### Scenario: Android-only change triggers the Android job
- **WHEN** a push or pull request changes only files under `android/**`
- **THEN** the Android Gradle test job runs
- **AND** the existing web test job(s) are skipped, not run and passed trivially

#### Scenario: Web-only change does not trigger the Android job
- **WHEN** a push or pull request changes only files under `src/**`, `server/**`, `shared/**`, or `tests/**`
- **THEN** the Android Gradle test job is skipped
- **AND** the web test job(s) run as before, unaffected by this change

#### Scenario: A change touching both areas runs both jobs
- **WHEN** a single push or pull request changes files under both `android/**` and a web-relevant path
- **THEN** both the web test job(s) and the Android Gradle test job run

#### Scenario: An `openspec/**`-only change triggers neither expensive job
- **WHEN** a push or pull request changes only files under `openspec/**`
- **THEN** neither the web test job(s) nor the Android Gradle test job run

### Requirement: The Android job runs the Gradle unit and Compose UI test suites
The system SHALL, when triggered, run the Android project's JVM unit tests and Compose UI tests via Gradle (e.g. `./gradlew testDebugUnitTest`) and report a failing status if any test fails.

#### Scenario: Android test failure fails the workflow
- **WHEN** any Gradle unit or Compose UI test fails
- **THEN** the overall CI workflow run is marked as failed

#### Scenario: Android test success does not block on unrelated web test outcomes
- **WHEN** the Android Gradle test job runs and passes, and no web-relevant paths changed
- **THEN** the workflow's overall status reflects only the jobs that actually ran (the skipped web job does not count as failed)

### Requirement: Android test reports are published as CI artifacts
The system SHALL upload the Gradle-generated HTML test report and JUnit XML results as downloadable CI artifacts whenever the Android test job runs, whether it passed or failed.

#### Scenario: Reports are attached after an Android job run
- **WHEN** the Android Gradle test job finishes executing (pass or fail)
- **THEN** the Gradle HTML test report and JUnit XML results are attached to the CI run as artifacts and can be retrieved without re-running the tests

### Requirement: Path-scoped triggers remain safe for future required-status-check use
The system SHALL implement the web and Android test jobs as conditionally-gated jobs within a single always-triggering workflow, not as separate workflow files each with their own path filter, so that a job can later be marked as a required status check without a path-filtered PR leaving it permanently pending.

#### Scenario: The workflow itself always starts
- **WHEN** any push or pull request occurs, regardless of which paths changed
- **THEN** the workflow run starts (its path-detection job always executes), even if every expensive job inside it is subsequently skipped

#### Scenario: A skipped job reports as skipped, not as stuck pending
- **WHEN** a job's path condition does not match the current push/PR's changed files
- **THEN** that job shows as skipped in the workflow run, not as failed or indefinitely pending
