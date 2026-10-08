## 0. Preconditions

- [ ] 0.1 Confirm `add-android-day-week-evaluation` is implemented and archived (`openspec/specs/android-day-week-evaluation/spec.md` exists); otherwise stop — this change's deltas need that base spec
- [ ] 0.2 Run `./gradlew testDebugUnitTest` in `android/` to record a green baseline

## 1. Shared building blocks

- [ ] 1.1 Write unit tests for `levelColor(level, dark)` and `levelColorForAverage(avg, dark)`: five distinct colours per theme, mockup hex values, nearest-level rounding (3.33→3, 3.5→4, 3.6→4), clamping below 0 / above 4
- [ ] 1.2 Implement `ui/theme/ActivityLevelColors.kt` (D1) and switch `ActivityEvaluationCard` to it, deleting its private `LEVEL_COLORS`/`levelColor`
- [ ] 1.3 Move `BackArrow` + back `TextButton` into `ui/common/BackButton.kt` (D8) and use it in `SettingsScreen`; existing settings tests stay green
- [ ] 1.4 Write tests for `formatAverageDelay(Double?)` (`null`→"–", 7.5→"8", 4.4→"4") and implement it (D5)

## 2. Schnelleingabe

- [ ] 2.1 Extend `ActivityLevelSelectorTest`: five cards each show value badge (in its level colour), label and description; exactly one card is selected (outline ring + stronger background), selection switches exclusively
- [ ] 2.2 Implement `LevelCard` grid (3 + 2 with spacer) per D2/D2a, replacing the `FilterChip`s
- [ ] 2.3 Add `QuickEntryViewModelTest` cases: `updateNote("Treppe\ngegangen")` → "Treppe gegangen"; `\r\n` and `\r` likewise; a plain note is unchanged
- [ ] 2.4 Implement newline sanitising in `updateNote()` and set `singleLine = true` + `ImeAction.Done` on the note field (D3); add a `QuickEntryScreenTest` case that pressing Enter leaves the note single-line
- [ ] 2.5 Extend the quick-entry no-scroll test (`@Config(qualifiers = "w412dp-h892dp")`): slot indicator, level cards, note, save button, Trinkmanager card and the full Aktivitätsauswertung card are displayed without scrolling; history rows may be off-screen and become visible after scrolling
- [ ] 2.6 Apply the D2a layout budget in `QuickEntryScreen` (top padding 48 → 8 dp, spacing 16 → 10 dp, card sizing) until 2.5 passes

## 3. Letzte Aktivität

- [ ] 3.1 Add `ActivityHistoryTest` cases from the spec: actual time shown (09:00 slot logged 09:17 → "09:17"), unanswered row shows slot time, sort by actual time ↓ (extra 09:40 above primary 09:05; 08:00-slot extra at 09:30 above 09:10; unanswered 10:00 between 10:20 and 09:45), same-minute tie → newer `createdAt` first
- [ ] 3.2 Add a test that the bold span of `firstLineText()` carries the passed level colour and the date/time span does not
- [ ] 3.3 Implement D4: `responseTime`/`actualTime` on `ActivityHistoryEntry`, new sort order, coloured bold span; pass `levelColor(entry.value)` from `ActivityHistoryRow`
- [ ] 3.4 Confirm `DayStatsTest` is unaffected by the new order

## 4. Aktivitätsauswertung (day card)

- [ ] 4.1 Extend `ActivityEvaluationCardTest`: a fourth stat "Ø Min. Delay" (3, 4, 8 min → "5"; no answered entries → "–"); the first hour bar's left edge equals the chart area's left edge
- [ ] 4.2 Implement D5 (left-aligned `HourlyChart`, fourth `Stat`)

## 5. Trinkmanager

- [ ] 5.1 Write tests for `hydrationSegments(amountMl, goalMl)`: 2000/500 → 8 total, 2 filled; 2100 → 9 total; 8000/2000 → 20 total, 5 filled; amount above goal → filled = total; 0 → 0 filled
- [ ] 5.2 Implement `SegmentedProgressBar` + `hydrationSegments` and use them for progress and overflow in `HydrationCard` (D6)
- [ ] 5.3 Update `HydrationCardTest` to count filled segments via `stateDescription`; overflow indicator tests stay green

## 6. Optionen

- [ ] 6.1 Update `SettingsScreenTest`: no "Export"/"Speicherort"/"Ordner wählen" texts; goal label "Tagesziel in Litern, Standard 2 Liter" and input on one row; no "Standard 2 Liter" supporting line; body text 14 sp and card titles 16 sp; switches smaller than the default switch and still toggling via the row
- [ ] 6.2 Add a Robolectric test with `@Config(qualifiers = "w412dp-h892dp")` asserting every card and "Speichern" are displayed without scrolling
- [ ] 6.3 Implement D7: remove Export card + launcher, scoped compact typography, `CompactSwitch`, one-row goal input, tighter spacing
- [ ] 6.4 Verify `SettingsViewModelTest`/`SettingsSaveFailureTest` still pass (the `exportLocationUri` field is untouched in the data layer)

## 7. Auswertung (month evaluation)

- [ ] 7.1 Write `MonthEvaluationTest` for `monthOverview`: counts only the given month, Ø delay half-up over answered entries only, "–"/`null` with only unanswered slots
- [ ] 7.2 Adapt the existing `weekHeatmap` tests in `ActivityAggregationTest` to `weekdayHourHeatmap`: Di/09:00 with 3,3,4 → level 3, count 3; only zeros → empty; unanswered slots ignored; only entries of the given month; row range from data (07–16), fallback to reminder-window hours for an empty month
- [ ] 7.3 Write tests for `weekTrend`: month starting mid-week includes that KW with in-month entries only; 3.6 → level-4 colour and label "3,6"; week without entries → `average == null`; ISO week numbers at a year boundary (e.g. Dec 2026 / Jan 2027)
- [ ] 7.4 Implement `monthOverview`/`weekTrend` in `ui/evaluation/MonthEvaluation.kt` and adapt `weekHeatmap()` → `weekdayHourHeatmap()` in `ActivityAggregation.kt` (D9)
- [ ] 7.5 Rename `WeekHeatmapScreenTest` → `MonthEvaluationScreenTest` and adapt/extend it: header row order (back, ‹, title, ›); section order Monatsüberblick → Tage im Überblick → Wochentrend; opens on current month with German title; ‹ goes to previous month and › back again, updating title and sections; › disabled on current month; empty month state; heatmap shows weekday columns and "HH:00" rows with level colours; tapping a filled cell shows count and Ø value; Wochentrend has no trend sentence; back action uses the shared `BackButton` and calls `onBack`
- [ ] 7.6 Rename `WeekHeatmapScreen` → `MonthEvaluationScreen` and extend it per D9/D10 (header, Monatsüberblick on top, existing heatmap moved below it as "Tage im Überblick", Wochentrend bars with value)

## 8. Navigation and cleanup

- [ ] 8.1 Update `AppNavigationTest` for the `auswertung` route and the renamed slot
- [ ] 8.2 Implement D10: route/slot rename, `MainActivity` wiring to `MonthEvaluationScreen`, card button "Auswertung öffnen"
- [ ] 8.3 Fix any remaining references to the old names (`WeekHeatmapScreen`, `weekHeatmap`, "Letzte aktive Tage")

## 9. Verification

- [ ] 9.1 Run `./gradlew testDebugUnitTest lint` in `android/` — all green
- [ ] 9.2 Run the app on an emulator at 412 × 892 dp in light and dark theme: check level colours and history text contrast, segmented hydration bar, Optionen without scrolling, Auswertung layout against the mockup
- [ ] 9.3 Run `openspec validate refine-android-ui-and-month-evaluation --strict`
