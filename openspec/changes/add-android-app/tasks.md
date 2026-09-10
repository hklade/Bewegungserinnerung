## TDD-Arbeitsweise

Jede Aufgabe unten, deren Verifikationsklausel einen Test nennt ("...and verify a/an ... test that..."), wird nach Red-Green-Refactor umgesetzt: der Test wird zuerst geschrieben und läuft rot (schlägt fehl, weil die Implementierung noch fehlt), erst danach entsteht die Implementierung bis der Test grün ist, danach folgt bei Bedarf Refactoring ohne den Test zu verändern. Dies folgt CLAUDE.md's Vorgabe "Implement new features with TDD" und dem bestehenden `tdd-feature-implementer`-Agentenmuster dieses Repos.

Für vier Aufgaben gilt diese Disziplin mit erhöhter Sorgfalt, weil design.md sie explizit als die Stellen benennt, an denen die alte Web-App durch zwei unabhängige, teils widersprüchliche Berechnungen Bugs hatte (D5, D6):

- **3.4** (Slot-Berechnung): jedes der vier Szenarien aus `android-reminder-scheduling` (Standard-10-Slot-Fenster, Ende-vor-Start-Fallback, nicht parsbare Zeit-Fallback, Wochenend-Ausschluss) wird als eigener, zuerst fehlschlagender Test geschrieben, nicht als ein kombinierter Test danach.
- **3.5** (Slot-Status-Enum): die vier Statusübergänge (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`) werden einzeln vor der Enum-Implementierung als rote Tests festgehalten.
- **4.3** (Backfill-Regel): die Idempotenz-Prüfung ("kein Duplikat bei wiederholten Läufen") wird explizit als zuerst-roter Test geschrieben, nicht erst nachträglich beim Refactoring ergänzt.
- **4.6** (Countdown-Berechnung): kein von design.md benanntes Risiko, aber dieselbe Form (reine Funktion mit klar aufzählbaren Randfällen: aktiv/berechtigt, Erinnerungen aus, Wochenend-Sprung zum nächsten Werktag) — dieselbe Sorgfalt wird hier aus Konsistenzgründen angewendet.

## 0. Entwicklungsumgebung einrichten (für Einsteiger, außerhalb des Devcontainers)

Diese Punkte sind keine Spec-Verifikationsschritte, sondern einmaliges Setup auf deinem eigenen Rechner (Windows oder wo auch immer du außerhalb des Devcontainers arbeitest), damit du die "verify manually"/"verify on emulator/device"-Klauseln aus den Tasks unten überhaupt selbst durchführen kannst. Claude Code im Devcontainer kann Gradle-Builds ausführen, aber **keinen Android-Emulator starten** (kein `/dev/kvm`, keine Virtualisierung im Container) — dafür brauchst du deine normale Arbeitsumgebung.

- [ ] 0.1 **IDE-Wahl**: Installiere [Android Studio](https://developer.android.com/studio) (die offizielle IDE für Android-Entwicklung, basiert auf IntelliJ) zusätzlich zu VSCode. VSCode kann zwar Kotlin-Dateien anzeigen/bearbeiten, hat aber keinen brauchbaren Android-Emulator, keinen Layout-Preview für Compose und keine integrierte Gradle-Sync-UI. Praktischer Ablauf: Code weiterhin mit Claude Code/VSCode bearbeiten lassen (wie bisher), aber zum **Bauen, Ausführen und Debuggen auf Emulator/Gerät** Android Studio öffnen. Wichtig: In Android Studio nicht den Repo-Root `Bewegungserinnerung/` öffnen, sondern gezielt den Unterordner `android/` (File → Open → `android/`-Ordner auswählen) — dort liegt `settings.gradle.kts`, das Android Studio als Projekt-Root braucht.
- [ ] 0.2 **Emulator einrichten**: Nach dem ersten Öffnen von `android/` in Android Studio: Tools → Device Manager → "Create Device" → ein Profil wählen, das dem Referenzgerät aus design.md D8 nahekommt (Samsung Galaxy A36 bzw. ersatzweise ein generisches "Phone"-Profil mit ~412dp × 892dp, Android 16/API 36 oder höher als System Image). Android Studio lädt dabei automatisch ein passendes System-Image herunter (mehrere GB, einmalig). Emulator danach über den grünen "Run"-Button (▶) in Android Studio starten — das startet automatisch sowohl den Emulator als auch die App darauf.
- [ ] 0.3 **Devcontainer vs. lokaler Emulator — kein Konflikt**: Du musst den Devcontainer **nicht** abschalten, um den Emulator zu nutzen. Der Devcontainer läuft isoliert (WSL2/Docker) und hat keinen Zugriff auf Hardware-Virtualisierung (KVM/Hyper-V), die ein Emulator braucht — deshalb funktioniert der Emulator dort grundsätzlich nicht, unabhängig davon ob der Container läuft oder nicht. Android Studio läuft direkt auf deinem Windows-Host (nicht im Container) und nutzt dort Windows' eigene Virtualisierung (Hyper-V/WHPX) für den Emulator — das ist ein komplett getrennter Prozess. Du kannst also Claude Code im Devcontainer weiterlaufen lassen und parallel in Android Studio auf dem Host den Emulator nutzen.
- [ ] 0.4 **Echtes Gerät statt Emulator (Alternative, oft einfacher/schneller)**: Falls du ein Android-Handy zur Hand hast: Auf dem Handy Einstellungen → "Über das Telefon" → 7× auf "Build-Nummer" tippen (aktiviert Entwickleroptionen) → Einstellungen → Entwickleroptionen → "USB-Debugging" aktivieren. Handy per USB-Kabel an den PC anschließen, im Popup auf dem Handy "USB-Debugging zulassen" bestätigen. Android Studio erkennt das Gerät dann automatisch in der Geräteauswahl neben dem Run-Button. Vorteil: kein Ressourcen-hungriger Emulator nötig, echtes Verhalten (Benachrichtigungen, Akkuoptimierung) direkt testbar — relevant z. B. für die Alarm/Doze-Tests in Abschnitt 4 und 11.
- [ ] 0.5 **Ersten Build/Run durchführen**: Nach 0.1–0.4: in Android Studio den grünen Run-Button drücken, Zielgerät (Emulator oder echtes Handy) auswählen. Das baut die App und installiert sie automatisch. Bei Erfolg siehst du den "Bewegungserinnerung"-Hello-Screen aus Task 1.1 — das ist die noch ausstehende manuelle Verifikation für 1.1 und 1.4.
- [ ] 0.6 **Wo du nichts tun musst**: Gradle-Kommandozeilen-Builds (`./gradlew assembleDebug`, Unit-Tests) laufen bereits erfolgreich im Devcontainer über Claude Code — dafür brauchst du Android Studio nicht. Android Studio ist ausschließlich für alles nötig, was einen laufenden Emulator/ein Gerät braucht (visuelle Prüfung, Klick-Interaktion, Berechtigungen, Benachrichtigungen, Reboot-Verhalten).

## 1. Project setup

- [x] 1.1 Create new Android project (Kotlin, Jetpack Compose/Material 3, single module) under a new top-level directory (e.g. `android/`) in this repo, and verify it builds and runs an empty "Hello" screen on an emulator/device — build verified (`./gradlew assembleDebug`); emulator/device run not verifiable in this devcontainer (no `/dev/kvm`, no connected device) and still needs manual confirmation
- [x] 1.1a Add the Android/Gradle block to the repo root `.gitignore` (`android/.gradle/`, `android/**/build/`, `android/local.properties`, `android/.idea/`, `android/captures/`, `android/*.hprof`, `*.apk`, `*.aab`, `*.jks`, `*.keystore`) and a `.gitattributes` entry (`android/gradlew text eol=lf`) before committing the new project, per design.md D11; verify `git status` shows none of the ignored build/IDE artifacts as untracked after a clean build
- [x] 1.2 Add Room, WorkManager, and Compose Navigation dependencies to the Gradle build, and verify a clean `./gradlew assembleDebug` succeeds
- [x] 1.3 Define the target `minSdk`/`compileSdk`/`targetSdk` values (resolving design.md's open question on exact-alarm permission behavior per API level), and document the choice in the project's README/module notes — `minSdk=33`, `compileSdk`/`targetSdk=37` (raised from planned 36, see design.md D9); documented in `android/README.md`
- [ ] 1.4 Set up the app's Compose theme (Material 3, portrait-first) and verify it renders on the reference device profile from design.md (411dp × 891dp emulator profile) — theme implemented; on-device/emulator rendering verification still outstanding (no emulator available in this devcontainer)

## 2. CI pipeline (`android-ci-pipeline`)

- [x] 2.1 Extend `.github/workflows/test.yml` with a `changes` job (`dorny/paths-filter`) computing `web`/`android` booleans from the PR/push diff, per design.md D12; gate the existing web test job(s) with `if: needs.changes.outputs.web == 'true'` without changing their internal steps
- [x] 2.2 Add a new `android-test` job gated with `if: needs.changes.outputs.android == 'true'` that runs `./gradlew testDebugUnitTest` (JVM unit tests + Compose UI tests) and uploads the Gradle HTML test report and JUnit XML results as CI artifacts, and verify a local dry run (or `act`) confirms the job's steps execute against the `android/` project created in section 1 — validated locally: `./gradlew testDebugUnitTest` runs successfully against `android/`, workflow YAML validated with `action-validator`
- [ ] 2.3 Verify, via a real push/PR, that a change touching only `android/**` skips the web job(s) and runs `android-test`, and that a change touching only `src/`/`server/`/`shared/`/`tests/**` skips `android-test` and runs the web job(s) unaffected, per `android-ci-pipeline`'s path-scoping scenarios
- [ ] 2.4 Verify a push/PR touching both `android/**` and a web-relevant path runs both jobs, and that an `openspec/**`-only change runs neither

## 3. Data layer (Room)

- [ ] 3.1 Define the Room entity and DAO for movement activity entries, matching the CSV-compatible field set from design.md (D7), and verify with a unit test that insert/query round-trips all fields
- [ ] 3.2 Define the Room entity and DAO for hydration log entries (timestamp + absolute daily ml amount), and verify with a unit test that querying "today's total" returns the latest entry for the day, not a sum
- [ ] 3.3 Define the Room entity/DAO for the single settings row (reminder window, weekdays-only, hydration goal, tone enabled, export location), seeded with defaults on first run, and verify a unit test confirms defaults are returned before any explicit save
- [ ] 3.4 Implement the shared reminder-slot computation module (hourly slots from start/end time, fallback rules, weekday eligibility) per `android-reminder-scheduling` requirements, and verify unit tests cover: default 10-slot window, end-before-start fallback, unparseable-time fallback, and weekend exclusion
- [ ] 3.5 Implement the single authoritative slot-status computation (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`) as one shared function consumed by all screens, and verify unit tests cover all four status transitions from `android-reminder-scheduling`'s "authoritative answer status" requirement

## 4. Reminder scheduling & notifications

- [ ] 4.1 Implement `AlarmManager`-based exact alarm scheduling for the next eligible reminder slot, and verify with an instrumented test (or manual device test) that a notification fires at the scheduled time while the app is backgrounded
- [ ] 4.2 Implement the `BroadcastReceiver` for `ACTION_BOOT_COMPLETED` that re-arms the next alarm after device restart, and verify manually (reboot emulator/device with reminders enabled, confirm next alarm is scheduled)
- [ ] 4.3 Implement the `WorkManager` periodic/chained job that re-arms the following alarm after each fire and runs the unified backfill check (per `android-reminder-scheduling`'s single-backfill-rule requirement), and verify a unit test confirms a slot >59 minutes past due with no entry gets exactly one `Unanswered` record, with no duplicate on repeated runs
- [ ] 4.4 Implement runtime request/detection of the exact-alarm permission (`SCHEDULE_EXACT_ALARM`/`canScheduleExactAlarms`) with an in-app warning if revoked, and verify manually by revoking the permission in system settings and confirming the warning appears
- [ ] 4.5 Implement tone/vibration playback on notification fire, gated by the tone-enabled setting, and a settings "test tone" action that plays it on demand without creating any entry or schedule change; verify manually and with a unit test that "test tone" does not write to any DAO
- [ ] 4.6 Implement the live countdown-to-next-reminder computation consumed by the UI, and verify unit tests cover: enabled/eligible day, reminders-off state, and weekend-skipping to next weekday

## 5. Quick-entry screen (default screen)

- [ ] 5.1 Build the quick-entry Compose screen as the app's start destination, reachable from cold start, launcher icon, and tapping a reminder notification; verify manually that all three entry points land on quick-entry
- [ ] 5.2 Implement the 5-option activity level selector (2-row grid per design.md D8) defaulting to value 1, and verify a Compose UI test confirms default selection and that tapping another option changes selection
- [ ] 5.3 Implement the free-text note field (optional, cleared after save) and the save action that creates an entry classified by the current slot's authoritative status (primary vs. additional), per `android-quick-entry`; verify a unit/integration test for both the "first save" and "second save for already-answered slot" scenarios
- [ ] 5.4 Implement the current-slot-time display (or "no active reminder" state) on the quick-entry screen, and verify manually for both the enabled/eligible and disabled/ineligible cases
- [ ] 5.5 Verify the full quick-entry screen fits without scrolling on the reference device profile (411dp × 891dp) and on a smaller reference (~360dp × 640dp), per `android-quick-entry`'s one-screen requirement — capture screenshots at both sizes as the verification artifact
- [ ] 5.6 Implement error handling for a failed save (error state shown, note field preserved, not cleared), and verify with a unit/integration test that simulates a storage failure

## 6. Hydration tracking

- [ ] 6.1 Build the hydration card/screen showing today's logged amount vs. configured goal with a proportional progress indicator, and verify manually against a few sample amounts/goals
- [ ] 6.2 Implement +250 ml / −250 ml actions with optimistic UI update, persistence, and rollback-on-failure, and verify unit tests for: normal increment/decrement, floor-at-zero disabling of decrement, and rollback on simulated failure
- [ ] 6.3 Implement the overflow indicator shown when logged amount exceeds the goal, and verify a Compose UI test confirms the overflow indicator appears only when amount > goal

## 7. Day/week evaluation

- [ ] 7.1 Implement the day picker limited to today plus the last 13 days with activity, and verify a unit test confirms days without any entries are excluded (except today)
- [ ] 7.2 Implement per-day stats (answered/primary count, additional count, unanswered count, average delay over answered slots only), and verify unit tests reproduce the three example scenarios in `android-day-week-evaluation`
- [ ] 7.3 Implement the hourly bar chart for the selected day (hours-with-entries only) plus its empty-state message, and verify manually with a day that has partial-hour coverage and a day with zero entries
- [ ] 7.4 Implement the 7-day × hourly-slot heatmap (active days only, average-value color intensity, visually distinct empty cells), and verify manually against a dataset with fewer than 7 active days and one with 7+

## 8. Activity history

- [ ] 8.1 Implement the activity history list showing date/planned time/delay/value/description/type per row, excluding `Unanswered`-status entries, and verify a unit test confirms unanswered slots are excluded from the list but present in day/week counts
- [ ] 8.2 Implement the default 5-row view with expand/collapse to a bounded maximum, and verify a Compose UI test covers expand and collapse actions

## 9. Settings screen

- [ ] 9.1 Build the settings screen reachable via one navigation action from quick-entry, and verify manually it is not shown on cold start
- [ ] 9.2 Implement reminder settings (enabled, start time, end time, weekdays-only) with explicit save and immediate effect on scheduling, and verify unit/integration tests for: toggle takes effect without restart, window change reschedules, weekdays-only change takes effect going forward
- [ ] 9.3 Implement the hydration goal input with validation/fallback-to-default, and verify a unit test covers valid input and invalid-input-falls-back-to-2L
- [ ] 9.4 Implement the tone/vibration toggle and its "test" action wiring to the module built in 4.5, and verify the test action is disabled when tone is off
- [ ] 9.5 Implement the export-location picker (Android-native storage/document picker, replacing the web app's free-text path field), and verify manually — this becomes the default destination for the export flow once 10.2 exists
- [ ] 9.6 Implement explicit save/confirmation/error states for the settings screen (no autosave-on-change), and verify a unit/integration test confirms navigating away without saving leaves prior settings in effect

## 10. CSV import/export (optional)

**Optional:** this capability (`android-csv-import-export`) is not required for the app to be usable end-to-end on-device — quick-entry, reminders, hydration, and evaluation all work fully without it. It exists only to carry historical data over from the existing web app or to back up/restore local data. Implement after sections 1–9 are done, or defer entirely to a follow-up if time is constrained.

- [ ] 10.1 Implement CSV export of movement activity entries using the compatible column set/delimiter from design.md (D7), excluding hydration data, and verify a unit test round-trips a known entry set into the expected CSV text
- [ ] 10.2 Wire export to the Android system share/save flow (SAF and/or Share intent), using the export-location setting from 9.5 as the default destination, and verify manually that the resulting file can be opened/shared
- [ ] 10.3 Implement the `.csv`-extension file-selection restriction for import, and verify a unit test rejects a non-CSV file before any confirmation step
- [ ] 10.4 Implement the destructive-import confirmation dialog (naming the file, warning of full replacement) and the full-replace import logic, and verify unit/integration tests for: confirm-replaces-all, cancel-changes-nothing
- [ ] 10.5 Implement tolerant CSV parsing (alternate column names, defaulted missing fields) and the post-import row-count/skipped-row report, and verify with a test importing a CSV exported by the existing web app (`data/Bewegungsdaten.csv` schema) and confirming zero skipped rows
- [ ] 10.6 Implement rejection of unreadable/unparseable files before any existing data is deleted, and verify a test confirms existing data is untouched after a failed import attempt

## 11. Cross-cutting verification

- [ ] 11.1 Run a full manual pass of all seven capability specs (`android-quick-entry`, `android-reminder-scheduling`, `android-hydration-tracking`, `android-day-week-evaluation`, `android-activity-history`, `android-csv-import-export`, `android-settings-configuration`) against a physical or emulated device, checking every scenario listed in each spec file
- [ ] 11.2 Verify reminders survive Doze mode using `adb shell dumpsys deviceidle` to force idle state, confirming notification delivery tolerance per `android-reminder-scheduling`
