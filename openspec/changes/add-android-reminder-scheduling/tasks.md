## TDD-Arbeitsweise

Jede Aufgabe unten, deren Verifikationsklausel einen Test nennt ("...and verify a/an ... test that..."), wird nach Red-Green-Refactor umgesetzt: der Test wird zuerst geschrieben und läuft rot (schlägt fehl, weil die Implementierung noch fehlt), erst danach entsteht die Implementierung bis der Test grün ist, danach folgt bei Bedarf Refactoring ohne den Test zu verändern. Dies folgt CLAUDE.md's Vorgabe "Implement new features with TDD" und dem bestehenden `tdd-feature-implementer`-Agentenmuster dieses Repos.

Für vier Aufgaben gilt diese Disziplin mit erhöhter Sorgfalt, weil design.md sie explizit als die Stellen benennt, an denen die alte Web-App durch zwei unabhängige, teils widersprüchliche Berechnungen Bugs hatte (D5, D6):

- **1.1** (Slot-Berechnung): jedes der vier Szenarien aus `android-reminder-scheduling` (Standard-10-Slot-Fenster, Ende-vor-Start-Fallback, nicht parsbare Zeit-Fallback, Wochenend-Ausschluss) wird als eigener, zuerst fehlschlagender Test geschrieben, nicht als ein kombinierter Test danach.
- **1.2** (Slot-Status-Enum): die vier Statusübergänge (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`) werden einzeln vor der Enum-Implementierung als rote Tests festgehalten.
- **2.3** (Backfill-Regel): die Idempotenz-Prüfung ("kein Duplikat bei wiederholten Läufen") wird explizit als zuerst-roter Test geschrieben, nicht erst nachträglich beim Refactoring ergänzt.
- **2.6** (Countdown-Berechnung): kein von design.md benanntes Risiko, aber dieselbe Form (reine Funktion mit klar aufzählbaren Randfällen: aktiv/berechtigt, Erinnerungen aus, Wochenend-Sprung zum nächsten Werktag) — dieselbe Sorgfalt wird hier aus Konsistenzgründen angewendet.

## 1. Data layer (Room)

- [x] 1.1 Implement the shared reminder-slot computation module (hourly slots from start/end time, fallback rules, weekday eligibility) per `android-reminder-scheduling` requirements, and verify unit tests cover: default 10-slot window, end-before-start fallback, unparseable-time fallback, and weekend exclusion — `ReminderSchedule.kt` (`buildReminderSlots`, `isWeekdayEligible`), verified by `ReminderScheduleTest`. Implemented ahead of schedule as a minimal prerequisite for `add-android-quick-entry`'s save-classification (task 2.3 there); alarm/notification/backfill scheduling (section 2 below) is not implemented.
- [x] 1.2 Implement the single authoritative slot-status computation (`Pending`/`Unanswered`/`Answered`/`AnsweredWithExtra`) as one shared function consumed by all screens, and verify unit tests cover all four status transitions from `android-reminder-scheduling`'s "authoritative answer status" requirement — depends on the movement entity/DAO from `add-android-quick-entry` (task 1.1 there); `SlotStatus.kt` (`computeSlotStatus`), verified by `SlotStatusTest`. Same note as 1.1: implemented as a prerequisite for `add-android-quick-entry`.

## 2. Reminder scheduling & notifications

- [ ] 2.1 Implement `AlarmManager`-based exact alarm scheduling for the next eligible reminder slot, and verify with an instrumented test (or manual device test) that a notification fires at the scheduled time while the app is backgrounded
- [ ] 2.2 Implement the `BroadcastReceiver` for `ACTION_BOOT_COMPLETED` that re-arms the next alarm after device restart, and verify manually (reboot emulator/device with reminders enabled, confirm next alarm is scheduled)
- [ ] 2.3 Implement the `WorkManager` periodic/chained job that re-arms the following alarm after each fire and runs the unified backfill check (per `android-reminder-scheduling`'s single-backfill-rule requirement), and verify a unit test confirms a slot >59 minutes past due with no entry gets exactly one `Unanswered` record, with no duplicate on repeated runs
- [ ] 2.4 Implement runtime request/detection of the exact-alarm permission (`SCHEDULE_EXACT_ALARM`/`canScheduleExactAlarms`) with an in-app warning if revoked, and verify manually by revoking the permission in system settings and confirming the warning appears
- [ ] 2.5 Implement tone/vibration playback on notification fire, gated by the tone-enabled setting, and a settings "test tone" action that plays it on demand without creating any entry or schedule change; verify manually and with a unit test that "test tone" does not write to any DAO — the settings UI trigger for this action is wired up in `add-android-settings-configuration` (task 9.4 there)
- [ ] 2.6 Implement the live countdown-to-next-reminder computation consumed by the UI, and verify unit tests cover: enabled/eligible day, reminders-off state, and weekend-skipping to next weekday

## 3. Cross-cutting verification

- [ ] 3.1 Run a full manual pass of the `android-reminder-scheduling` capability spec against a physical or emulated device, checking every scenario listed in the spec file
- [ ] 3.2 Verify reminders survive Doze mode using `adb shell dumpsys deviceidle` to force idle state, confirming notification delivery tolerance per `android-reminder-scheduling`
