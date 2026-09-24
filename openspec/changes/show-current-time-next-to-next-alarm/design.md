## Context

`QuickEntryScreen` renders the reminder indicator as a single `Text` (`"Nächster Alarm: $it"` or `"Keine aktive Erinnerung"`). `MainActivity` computes `currentSlotLabel` once in `onCreate`, using `SLOT_LABEL_FORMATTER` (`HH:mm`, `Europe/Vienna`), and already creates a `Clock.systemDefaultZone()` for the `QuickEntryViewModel`. The screen has no clock of its own and nothing on it updates over time. The current time has to tick while the screen is open, so it cannot be a value computed once and passed in like `currentSlotLabel`.

## Goals / Non-Goals

**Goals:**
- Show `Aktuelle Zeit: HH:mm` in the device's time zone, 24-hour format, in the same row as "Nächster Alarm" as the reminder indicator, updating automatically within one minute.
- Keep the time source injectable so Robolectric/Compose tests are deterministic.

**Non-Goals:**
- No seconds display, no locale-dependent format.
- No live recomputation of `currentSlotLabel` itself. It still comes from `onCreate`, which is existing behaviour and out of scope.
- No change to the web frontend. It has no "Nächster Alarm" label.

## Decisions

### D1: Same `Row`, indicator left, time right
**Decision:** Replace the single indicator `Text` with a `Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween)`. The existing indicator text goes on the left (`titleMedium`, unchanged strings). `Text("Aktuelle Zeit: HH:mm")` goes on the right, using `titleMedium` or a lighter style.
**Why:** "Neben" means side by side. A single row adds no vertical height, so the one-screen/no-scroll requirement is not at risk.
**Alternatives considered:** Appending the time to the same string (`"Nächster Alarm: 08:55 · 09:12"`). Rejected because it changes the existing indicator string that the current tests assert with `onNodeWithText("Nächster Alarm: 08:55")`. A second line below was also rejected, because it costs vertical space.

### D2: Injectable `Clock` parameter with a minute-aligned ticker in the composable
**Decision:** Add `clock: Clock = Clock.systemDefaultZone()` to `QuickEntryScreen`. A small composable helper (e.g. `rememberCurrentTime(clock)` built on `produceState`) emits `clock.instant()` right away. It then loops: `delay` until the next full minute, computed from `clock.instant()`, then emit again. The label is formatted with `ofPattern("HH:mm").withZone(clock.zone)`, i.e. in the zone of the injected clock. In production that is `Clock.systemDefaultZone()`, the device's time zone. `MainActivity` passes its existing `clock`.
**Why:** The screen owns a UI-only concern without extra ViewModel state. The default keeps existing call sites and tests compiling. Aligning to the minute avoids showing a stale minute for up to 59 s. Taking the zone from the injected `Clock` still passes an explicit `ZoneId` to the formatter, and tests can pin any zone via `Clock.fixed(instant, zone)`. This is a deliberate exception to the `android/CLAUDE.md` rule of formatting against `Europe/Vienna`: that rule protects persisted CSV date/time fields, and this value is display-only and never stored.
**Alternatives considered:** A `StateFlow` in `QuickEntryViewModel`. It is viable, but the ViewModel currently only holds entry state, and a ticker there needs a scope and dispatcher injection just for display. Hoisting the ticker into `MainActivity` was rejected because it leaves the update logic outside any test.

### D3: Reuse, don't share, the slot formatter
**Decision:** Define the `HH:mm` formatter (zone taken from the clock) locally in the quick-entry package rather than reusing `MainActivity`'s private `SLOT_LABEL_FORMATTER`, which is pinned to Europe/Vienna.
**Why:** Keeps the change inside the quick-entry files and avoids touching the visibility of unrelated code (scope discipline).

## Risks / Trade-offs

- [An infinite `delay` loop in composition can make Compose test `waitForIdle()` spin when `mainClock.autoAdvance` is on] → Mitigation: the loop only suspends in `delay`, which the test `mainClock` controls. The first task verifies that the existing `QuickEntryScreenTest` cases still finish. If any hang, set `composeRule.mainClock.autoAdvance = false` in the affected tests and advance explicitly. The live-update test advances `mainClock` explicitly and uses a mutable test `Clock`.
- [`Clock.fixed` never advances, so a ticker test with a fixed clock would still show the old minute] → Mitigation: the "time advances" test uses a small mutable `Clock` test double whose instant is moved forward together with `mainClock.advanceTimeBy(...)`.
- [The slot label ("Nächster Alarm") is still formatted in Europe/Vienna, while the current time uses the device zone; on a device outside Vienna's zone the two values are in different zones] → Temporary. Change `use-device-timezone-for-reminders` moves the slot label and all reminder computations to the device zone, so after that change both values use the same zone. Neither change depends on the other.
- [`Clock.systemDefaultZone()` captures the zone when the activity is created, so a time zone change while the screen stays open only shows after the activity is recreated] → Accepted for this change. No `ACTION_TIMEZONE_CHANGED` listener.
- [Existing naming mismatch: `currentSlotLabel` is the *current* slot but is labelled "Nächster Alarm"] → Not addressed here. It is flagged for a separate change.

## Open Questions

_None._ Assumptions made: the label text is "Aktuelle Zeit: HH:mm", the format is `HH:mm` without seconds, and the time is also shown when no reminder is active.
