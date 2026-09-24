## Context

`reminder/ReminderZone.kt` defines `internal val ZONE = ZoneId.of("Europe/Vienna")` as the single zone for slots, countdown, backfill and notification text. It is used in `CurrentSlot.kt`, `ReminderSchedule.kt`, `Backfill.kt`, `ReminderNotifier.kt` and `ui/history/ActivityHistoryEntry.kt`. Several files bake it into top-level `DateTimeFormatter` vals via `.withZone(ZONE)`. `QuickEntryViewModel.kt` has its own duplicate `private val ZONE = ZoneId.of("Europe/Vienna")` for the stored `date`/`weekday`/`reminderTime` fields, and `MainActivity.kt` has a third copy in `SLOT_LABEL_FORMATTER`. Alarms are armed through `ReminderScheduler.scheduleNextAlarm(context)`. Today `BootReceiver` re-arms only on `BOOT_COMPLETED`.

## Goals / Non-Goals

**Goals:**
- One source for the reminder zone, returning the device's *current* zone at the moment of each computation.
- Every slot computation, displayed slot time and newly stored slot field uses that zone.
- Re-arm the pending alarm when the time zone or clock changes.
- All zone-dependent pure functions stay testable with an explicit zone.

**Non-Goals:**
- No migration or reinterpretation of already stored entries.
- No change to the CSV schema or to the web app/server, which stay on Europe/Vienna.
- No user setting for a custom zone. The device zone is the only source.

## Decisions

### D1: `ZONE` constant becomes `reminderZone()`, and pure functions take a `zone` parameter
**Decision:** Replace `internal val ZONE` with `internal fun reminderZone(): ZoneId = ZoneId.systemDefault()` in `ReminderZone.kt` and keep it the single source. Zone-dependent functions (`currentSlotInstant`, the next-slot computation in `ReminderSchedule.kt`, the backfill computation, the relative-date label) gain a `zone: ZoneId = reminderZone()` parameter next to their existing `now: Instant` parameter. Top-level formatters drop `.withZone(ZONE)`. Callers format a `ZonedDateTime` obtained via `now.atZone(zone)` instead, or build the formatter per call with `.withZone(zone)`.
**Why:** A top-level `val` would freeze the zone at class-load time, so a zone change during the process lifetime would be ignored. Android updates `TimeZone.getDefault()` in the app process on `ACTION_TIMEZONE_CHANGED`, so reading `ZoneId.systemDefault()` per computation picks up the new zone. The explicit parameter keeps the `android/CLAUDE.md` rule "always pass an explicit `ZoneId`" and lets tests pin `Europe/Vienna` or `America/New_York` without touching JVM defaults.
**Alternatives considered:** Deriving the zone from an injected `Clock.zone` everywhere. Rejected, because the reminder functions take `Instant`, not `Clock`. Threading a `Clock` through the broadcast receivers and workers would be more churn for the same result. A `var` changed by the receiver was also rejected: it adds mutable global state that duplicates what the platform already tracks.

### D2: Remove the duplicate zones in `QuickEntryViewModel` and `MainActivity`
**Decision:** `QuickEntryViewModel` drops its private `ZONE`. It takes a constructor parameter `zone: ZoneId = reminderZone()` and formats `date`/`weekday`/`reminderTime` with it. `MainActivity` formats the slot label with `reminderZone()` instead of a Vienna-pinned `SLOT_LABEL_FORMATTER`.
**Why:** The duplicate constants are exactly the "two modules derive a slot's day/hour from an `Instant` with different zones" hazard that `android/CLAUDE.md` warns about. Once `ReminderZone` changes, they would silently disagree with it.

### D3: A dedicated receiver re-arms on time zone and clock changes
**Decision:** Add `TimeChangeReceiver` (in `reminder/`, `android:exported="true"`) with an intent filter for `android.intent.action.TIMEZONE_CHANGED` and `android.intent.action.TIME_SET`. In `onReceive` it calls `ReminderScheduler.scheduleNextAlarm(context)`, which must replace the pending alarm (same `PendingIntent` request code/flags). Implementation task 2.1 verifies this.
**Why:** `AlarmManager` stores absolute instants, so after a zone change the old alarm would fire at the old Vienna-based instant. Both broadcasts are on Android's implicit-broadcast exemption list, so a manifest receiver works at `targetSdk = 37`. A separate receiver avoids overloading `BootReceiver`, whose `android:permission="RECEIVE_BOOT_COMPLETED"` and single-action guard are boot-specific.
**Alternatives considered:** Adding both actions to `BootReceiver`. Viable, but it mixes two responsibilities, and its KDoc and guard would need rewording.

### D4: Stored entries keep their wall-clock strings, and CSV interchange is unchanged
**Decision:** Entries store the device-zone wall-clock `date`/`weekday`/`reminderTime` that applied when they were written. Nothing is rewritten on a zone change. CSV export writes these strings as-is.
**Why:** The CSV schema has no zone column. The stored strings are "what the user saw at that moment", which is also what "Heute"/"Gestern" and the day/week statistics group by.
**Trade-off:** The web app/server interprets imported strings as Europe/Vienna. For a device in Vienna's zone nothing changes. For entries created elsewhere, the web app shows the local times as if they were Vienna times. Accepted, because there is no live sync between the apps and the CSV is an interchange format, not a shared clock.

## Risks / Trade-offs

- [Existing unit/Robolectric tests may rely on `ZONE` being Vienna without saying so, and would now depend on the JVM/Robolectric default zone] → Mitigation: task 1.1 first pins such tests with an explicit `zone = ZoneId.of("Europe/Vienna")` argument, with unchanged assertions, so the suite is green before behaviour changes. No test relies on the JVM default zone.
- [A zone change on the same day can produce two entries with the same `date` + `reminderTime` (e.g. flying west repeats the 08:55 slot)] → Accepted. Slot status is keyed on the stored strings, so the second entry is classified as an extra entry (`AnsweredWithExtra`) rather than a new primary answer. That is harmless for a rare travel day.
- [DST transitions] → Behaviour is unchanged from today: `ZonedDateTime.of(date, time, zone)` already resolves gaps and overlaps. It now does so for the device zone instead of Vienna.
- [`show-current-time-next-to-next-alarm` accepted a Vienna/device-zone mismatch between "Nächster Alarm" and "Aktuelle Zeit"] → Resolved by this change, since both now use the device zone.

## Open Questions

_None._
