## 1. Current time on the quick-entry screen (TDD)

- [ ] 1.1 Write failing Compose UI tests in `QuickEntryScreenTest.kt`: (a) with an active slot "08:55" and `Clock.fixed(2026-09-10T07:12:00Z, Europe/Vienna)`, both "Nächster Alarm: 08:55" and "Aktuelle Zeit: 09:12" are displayed; (b) with `currentSlotLabel = null`, both "Keine aktive Erinnerung" and "Aktuelle Zeit: HH:mm" are displayed; (c) the same instant with `Clock.fixed(..., America/New_York)` shows "Aktuelle Zeit: 03:12"; (d) with a mutable test `Clock` at 09:12:30 local time, advancing the test clock and `composeRule.mainClock` past 09:13:00 shows "Aktuelle Zeit: 09:13"
- [ ] 1.2 Add the `clock: Clock = Clock.systemDefaultZone()` parameter and the minute-aligned `rememberCurrentTime` ticker to `QuickEntryScreen`, formatting with `HH:mm` in the clock's zone (`withZone(clock.zone)`), and render the indicator and time side by side in a `Row` (design D1–D3) until the tests from 1.1 pass
- [ ] 1.3 Verify that the four existing `QuickEntryScreenTest` cases still pass unchanged and do not hang on the ticker loop; if they hang, apply the `mainClock.autoAdvance = false` mitigation from design.md

## 2. Wiring

- [ ] 2.1 Pass the existing `clock` from `MainActivity` into `QuickEntryScreen`, and verify that `./gradlew testDebugUnitTest lint` passes in `android/` (lint catches `NewApi` issues with `java.time` at `minSdk = 33`)

## 3. Cross-cutting verification

- [ ] 3.1 Manual pass on an emulator or device: the time shows next to "Nächster Alarm" and next to "Keine aktive Erinnerung", advances at the minute boundary while the screen stays open, and all quick-entry controls stay visible without scrolling in portrait at default font scale
