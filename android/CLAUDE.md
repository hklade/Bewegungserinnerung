# CLAUDE.md (android/)

## Project

This directory is the native Android counterpart to "Bewegungserinnerung" — a Kotlin + Jetpack Compose (Material 3) app reimplementing every user-facing capability of the root web app (`src/`/`server/`) fully on-device, with no server component. It is a separate, independent product sharing this repository and its OpenSpec planning artifacts, not a client of the web app's API. See `openspec/changes/add-android-app/` (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `test-plan.md`) for the full specification this app is built against — read that before making architectural changes here, since most non-obvious decisions are already recorded there with rationale (referenced below as D1–D12).

**This file applies only to `android/`.** The repo-root `CLAUDE.md` describes the unrelated web app (`npm`/Vite/Node) and does not apply to Kotlin/Gradle work in this directory.

## Commands
```bash
./gradlew assembleDebug        # build the debug APK
./gradlew testDebugUnitTest    # JVM unit tests + Compose UI tests (test/)
./gradlew connectedAndroidTest # instrumented tests on a connected emulator/device (androidTest/)
./gradlew lint                 # Android lint
```

Run a single JVM test class: `./gradlew testDebugUnitTest --tests "*.ReminderScheduleTest"`.

Open this `android/` folder directly in Android Studio — **not** the repository root. Android Studio locates the Gradle project via `settings.gradle.kts`, which lives here, not at the repo root; opening the repo root will fail to find it.

## Architecture

**Single-module Compose app, no server (D1):** everything runs in one process on-device. There is no HTTP API, no CORS, no separate frontend/backend split — that split exists in the web app only because a browser can't run reliable background timers or write arbitrary files; neither constraint applies here.

**Persistence — Room is the system of record (D2, D3):** movement entries, hydration entries, and the single settings row all live in a local Room database. CSV is import/export-only, never read from or written to as the live store (contrast with the web app, where CSV files under `data/` *are* the store). Settings are one Room row (not DataStore/SharedPreferences), because both the UI and the alarm-rescheduling logic must observe changes reactively via `Flow`-based DAOs.

**Scheduling — AlarmManager for exact firing, WorkManager for bookkeeping (D4):** `AlarmManager.setExactAndAllowWhileIdle` fires the notification at each computed reminder slot (the only primitive that reliably hits a specific minute under Doze). `WorkManager` handles the surrounding bookkeeping: recomputing the day's slot schedule, re-arming the next alarm after each fire, and running the backfill check (D6). A `BroadcastReceiver` on `ACTION_BOOT_COMPLETED` re-arms scheduling after a device reboot.

**One authoritative slot-status enum (D5) — the headline fix this app exists to make:** the web app computed "is this slot already answered" twice (a client string-heuristic and a separate server check), and the two could disagree. Here, exactly one function computes `Pending` / `Unanswered` / `Answered` / `AnsweredWithExtra` for a given slot, consumed by quick-entry (to classify a new save) and by history/evaluation screens (to classify past entries) — never re-derived independently. See `android-reminder-scheduling` for the full transition rules; don't reimplement this logic anywhere else.

**One backfill rule, evaluated once (D6):** the web app's two overlapping backfill mechanisms (on-read, on-write) are replaced by a single rule — a slot is backfilled once its time is >59 minutes past with no entry — evaluated from exactly one place inside the `WorkManager` chain, not as a side effect of any UI read or write. Reads stay pure; this is also why 4.3's idempotency test matters (see TDD note below).

**CSV compatibility (D7):** export/import keeps the web app's exact column set and delimiters (`id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at` for movement, `date,hydrationMl` for hydration) so files exported by the web app import cleanly here, and vice versa. Any Android-only field is additive (new trailing column, tolerant parser), never a breaking schema change.

**Reference device (D8):** the one-screen "fits without scrolling" requirement for quick-entry is validated against a Samsung Galaxy A36 profile (~412dp × 892dp, portrait, gesture nav, default font scale) — the actual device this app is developed and tested against. Five activity-level options lay out as a 2-row (3+2) grid, not 1×5 or a vertical list. A non-binding visual reference lives at `../openspec/changes/add-android-app/design/screen-mockups.html`.

**SDK levels (D9):** `minSdk = 33` (Android 13), `targetSdk = 36` (Android 16) — the reference device ships stable on API 36; API 37 was still in beta as of 2026-09. `minSdk = 33` avoids handling both the API 31 and API 33 exact-alarm permission variants for no product benefit.

**Export destination (D10):** CSV export writes to the public `Downloads` directory (via `MediaStore`/SAF, not app-private storage), plus a `Intent.ACTION_SEND` Share action.

## Test layout

- `app/src/test/` — JVM unit tests (JUnit, Room via `Room.inMemoryDatabaseBuilder` — runs fully on-JVM, no emulator needed) and Compose UI tests (`createComposeRule`). This is where most logic (slot computation, slot-status enum, backfill rule, CSV parsing) is tested.
- `app/src/androidTest/` — instrumented tests requiring a real Android runtime: Room migrations against real SQLite, WorkManager via `TestListenableWorkerBuilder`, notification/AlarmManager/boot-receiver behavior.
- See `../openspec/changes/add-android-app/test-plan.md` for the full per-requirement mapping of which of the 5 test levels (unit / Compose UI / instrumented-automatable / instrumented-device-only / manual) covers each of the 38 requirements across the 7 capability specs — check this before assuming something needs a device when it doesn't (or vice versa).

## Validation
After implementing any change, run:
```bash
./gradlew testDebugUnitTest lint
```
Fix all errors before returning results.

## CI

`.github/workflows/test.yml` (repo root) runs the Android test job (`android-test`) only when a push/PR touches `android/**` (D12, `android-ci-pipeline` spec) — a change confined to the web app's `src/`/`server/`/`shared/`/`tests/` never triggers it, and vice versa. See design.md D12 for why this is one path-conditional workflow rather than two separate workflow files.

## Notes

- **TDD is mandatory, red-green-refactor** (see the root CLAUDE.md's project-wide TDD mandate, and `tasks.md`'s "TDD-Arbeitsweise" preamble in this change). Four tasks carry extra rigor because design.md names them as where the web app's duplicated-logic bugs actually happened: slot computation (write all four spec scenarios as separate failing tests first), the slot-status enum (all four transitions as separate failing tests first), the backfill rule (the idempotency/no-duplicate-on-repeat assertion must be RED before the happy path is implemented, not added as an afterthought), and the countdown computation (same rigor for consistency, though not itself a named risk in design.md).
- **Don't reintroduce a client/server split.** There is intentionally no networking code, no API client, and no shared state with the web app's `server/` — the two products are fully independent (see proposal.md's "No shared runtime" impact note). A CSV file is the only thing that ever crosses between them, and only via explicit user-triggered export/import.
- **Don't special-case slot-status or backfill logic per screen.** If a screen seems to need its own "is this answered" check, it's almost certainly supposed to call the one function in `android-reminder-scheduling` instead — recreating that logic locally is exactly the mistake D5/D6 exist to prevent.
- **Scope discipline: do not touch code outside the current change.** Only edit files/lines relevant to the requested task — no drive-by refactors, unrelated cleanups, or "while I'm here" fixes in untouched code paths. Flag unrelated issues instead of fixing them inline.
- **Do not install new dependencies** (Gradle or otherwise) — check with the user first.
- **Do not touch the repo-root web app** (`src/`, `server/`, `shared/`, `tests/`, `package.json`) while working here; this app has no dependency on it and no change here should require editing it.
