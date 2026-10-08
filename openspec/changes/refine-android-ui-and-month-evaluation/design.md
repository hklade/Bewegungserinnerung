## Context

See proposal.md for motivation. Current state relevant to the approach:

- The level palette already exists, but only privately inside `ui/evaluation/ActivityEvaluationCard.kt` (`LEVEL_COLORS`, `levelColor()`). Quick entry uses plain `FilterChip`s; history has no colour at all.
- `ActivityHistoryEntry` drops `responseTime` when mapping from `MovementEntry`; `toActivityHistory()` sorts by `date ↓, reminderTime ↓, createdAt ↑`. `dayStats()` reuses `toActivityHistory()` (only for classification, order irrelevant).
- Backfilled unanswered rows have `responseTime = null`, `value = 0`, and `createdAt` = backfill time (not meaningful for ordering).
- `SettingsScreen` hosts the export-location `OpenDocumentTree` launcher; the hydration goal is a full-width `OutlinedTextField` with `supportingText`. The back button there is a `TextButton` holding a hand-drawn `BackArrow` vector (no icon library in the project); `WeekHeatmapScreen` uses a "←" text glyph instead.
- `AppNavigation` has three routes; the third (`letzte-aktive-tage`) shows `WeekHeatmapScreen`, fed by `weekHeatmap()` in `ActivityAggregation.kt`. `MainActivity` passes the reminder slots to it.
- Compose UI tests run on the JVM via Robolectric, so device-size qualifiers (`@Config(qualifiers = "w412dp-h892dp")`) are available for the fits-on-one-screen checks.
- The `android-day-week-evaluation` capability is still only in the open change `add-android-day-week-evaluation`; that change must be archived before this one so the MODIFIED/REMOVED deltas have a base spec.

## Goals / Non-Goals

**Goals:**
- One shared level palette used by quick entry, history, day card and month screen.
- Month evaluation computed by pure, unit-testable functions; Compose code only renders.
- No Room schema change, no migration, no new dependencies.

**Non-Goals:**
- A gear/settings button in the Auswertung header (present in the mockup, not requested).
- The mockup's calendar-heatmap-per-day — the user's spec replaces it with the weekday × hour grid.
- Any trend analysis/statement (mockup's "Ø Aktivitätslevel steigt…" note) — explicitly deferred to a possible future feature.
- Restyling the rest of quick entry (countdown card, date line) to the mockup.
- Changing the CSV import/export change; it is only flagged (see proposal Impact).

## Decisions

### D1 — One level palette in `ui/theme/ActivityLevelColors.kt`
Move the palette out of `ActivityEvaluationCard` into a theme-level file exposing `levelColor(level: Int)` and `levelColorForAverage(avg: Double)` (nearest level = round half-up, clamped 0..4 — same rule the chart already uses). Light theme uses the mockup's darker tones (`#B14D43, #99661F, #E37D2D, #375FD7, #086142`); dark theme uses the lighter tones (`#CB6F65, #BF8B3F, #F4A24F, #5E84FF, #0F8660`) so coloured *text* in history keeps contrast on dark cards. Selection is via a `@Composable` accessor reading `isSystemInDarkTheme()`, with a non-composable variant taking `dark: Boolean` for unit tests.
*Alternative:* keep per-screen palettes — rejected, the spec requires the same colours everywhere and three copies would drift.

### D2 — Level buttons become mockup-style cards
Replace the `FilterChip`s with a `LevelCard` composable in a 3 + 2 grid (`Row`s with `Modifier.weight(1f)`; the second row gets an invisible spacer as third cell so cards keep equal width, like the mockup). Each card: `Surface` with the neutral panel colour (`surfaceContainer`), a ~30 dp rounded badge filled with `levelColor(level)` showing the value in white bold, the label (bold, `labelMedium`) and the description (`labelSmall`, muted, `maxLines = 1` with ellipsis). Selected card: 2 dp outline in `primary` at ~40 % alpha, `surfaceContainerHighest` background and a small tonal elevation — the "ring + lift" from the mockup. Each card is `selectable(role = Role.RadioButton)` so tests and TalkBack keep a selected state.
*Alternative:* coloured `FilterChip`s with a "✓" — rejected by the user in favour of the mockup look.

### D2a — Quick-entry vertical budget
Everything down to and including the Aktivitätsauswertung card must fit in 892 dp; only the history may fall below. The screen keeps a single `verticalScroll` column (history is just further down), so the budget is purely about heights. Today's layout wastes space: `padding(top = 48.dp)` plus `spacedBy(16.dp)` between seven items. Target budget (approximate):

| Element | Height |
|---|---|
| Status bar + top padding (48 → 8 dp) | ~32 dp |
| Slot indicator row with ⚙ | ~48 dp |
| Level cards, 2 rows (badge 30 dp, padding 6–8 dp, description single line) + 8 dp gap | ~150 dp |
| Note field (single line) | ~56 dp |
| Save button | ~44 dp |
| Trinkmanager card (title row + segmented bar, no overflow) | ~80 dp |
| Aktivitätsauswertung card (header, 4 stats, 48 dp chart + labels) | ~160 dp |
| Spacing, 6 × 10 dp (16 → 10 dp) | ~60 dp |
| **Total** | **~630 dp**, leaving ~200 dp reserve for system navigation bar, the exact-alarm warning, the overflow line or a save error |

The guard is a Robolectric test at `w412dp-h892dp` asserting the bottom of the evaluation card lies within the viewport (task 2.5). If it fails, shrink in this order: level-card description, spacing, chart height — never the save button or labels.

### D3 — Note sanitising lives in the ViewModel
`QuickEntryViewModel.updateNote()` replaces any `\r\n`, `\n`, `\r` with a single space before storing; the `OutlinedTextField` gets `singleLine = true` and `ImeAction.Done` (clears focus). Putting the rule in the ViewModel makes the paste case unit-testable without a UI test, and `singleLine` alone does not stop pasted newlines.

### D4 — History: carry `responseTime`, derive one display/sort time
Add `responseTime: String?` to `ActivityHistoryEntry` and a computed `actualTime = responseTime ?: reminderTime`. `firstLineText()` prints `actualTime` instead of `reminderTime` and colours the bold span with `levelColor(value)` (passed in as a `Color` so the function stays non-composable and testable). Sort becomes `date ↓, actualTime ↓, createdAt ↓`.
- `HH:mm` strings sort correctly lexicographically, so no parsing is needed.
- `date` is the slot date; a response logged after midnight for a late slot would sort under the slot's day. Reminder windows end in the afternoon, so this is accepted rather than handled.
- `createdAt ↓` as final tiebreak reverses the previous `↑`; this only matters for two entries logged in the same minute, where newest-first is consistent with the rest of the list.

### D5 — Day card: left-aligned bars and fourth stat
`HourlyChart` switches to `Arrangement.spacedBy(8.dp, Alignment.Start)`. A fourth `Stat` "Ø Min. Delay" reads the existing `DayStats.averageDelayMinutes`, rendered via a shared `formatAverageDelay(Double?)` (`Math.round` → half-up; `null` → "–") that the month overview reuses. Colour: `colorScheme.tertiary` (blue, as in the mockup).

### D6 — Hydration: a `SegmentedProgressBar` composable
A `Row` of `Box(Modifier.weight(1f).height(14.dp))` segments with `spacedBy(3.dp)` and fully rounded corners. Pure helper `hydrationSegments(amountMl, goalMl): Pair<total, filled>` implements the spec: `total = min(ceil(goal/250), 20)`; filled = `amount / 250` when uncapped, else `floor(amount / goal * total)`, both clamped to `total`. The overflow indicator keeps its current semantics and tag but uses the same composable (segments of the same count, `tertiary` colour). `HYDRATION_PROGRESS_TAG` moves to the row; each segment gets a `stateDescription` ("gefüllt"/"leer") so tests can count filled segments.

### D7 — Optionen: scoped typography and compact inputs
- Delete the "Export" card and its `OpenDocumentTree` launcher; `AppSettings.exportLocationUri` and its column stay untouched (no migration; the field is simply no longer edited).
- Wrap the screen body in `MaterialTheme(typography = compactTypography)` where `bodyLarge`/`bodyMedium` = 14 sp and the card-title style (`labelLarge`) = 16 sp. Scoping it to `SettingsScreen` keeps quick entry unaffected.
- Switches: a private `CompactSwitch` wraps the M3 `Switch` in `Modifier.scale(0.8f)` inside a `Box` of the scaled size (~42 × 26 dp). `scale` alone only shrinks the drawing, not the layout, so the wrapping size is what actually saves space. The whole row stays `toggleable`, so the touch target is the row, not the small switch. Time-window buttons keep their default size.
- Goal input: `BasicTextField` + `OutlinedTextFieldDefaults.DecorationBox` with reduced `contentPadding`, ~40 dp high, ~80 dp wide, in a `Row` with the label text — needed for the one-row layout; `OutlinedTextField` enforces a 56 dp minimum height, which is why it is not reused.
- Column spacing 16 → 10 dp and card padding 12 → 10 dp. The `verticalScroll` stays, so smaller devices still reach everything.

### D8 — Shared `BackButton` and screen header
Move `BackArrow` and the `TextButton` wrapper (21 dp icon, `contentDescription = "Zurück"`) into `ui/common/BackButton.kt`; Optionen and Auswertung both use it with the same outer padding (`statusBarsPadding()` + 16 dp). This is what makes "same size and position" hold by construction rather than by copy.

### D9 — Month aggregation as pure functions in `ui/evaluation/MonthEvaluation.kt`
- `monthOverview(entries, YearMonth): MonthOverview` — reuses `toActivityHistory()` classification exactly like `dayStats()`, filtered by `YearMonth.from(date)`.
- Heatmap: the existing `weekHeatmap()`/`WeekHeatmap`/`HeatmapCell` in `ActivityAggregation.kt` are adapted in place (not deleted) into `weekdayHourHeatmap(entries, YearMonth, fallbackHours: IntRange)` — logged (non-unanswered) entries only, keyed by `(DayOfWeek, slotHour)` instead of `(date, slot)`, where `slotHour` comes from `reminderTime` (consistent with the day chart). `HeatmapCell(averageValue, count)` stays, so the tap-to-inspect text keeps working. Cells with average `0.0` are stored as absent so rendering has a single "empty" path. Row range = min..max hour with data, else `fallbackHours` from the configured reminder slots.
- `weekTrend(entries, YearMonth): List<WeekTrendPoint(week: Int, average: Double?)>` — weeks via `WeekFields.ISO.weekOfWeekBasedYear()` for every date in the month (so weeks without data still appear), averages over entries inside the month only.
- Rendering: the existing heatmap rendering in `WeekHeatmapScreen` is extracted into a `TageImUeberblick` section composable and reused (plain `Row`/`Column`/`Box`, 7 columns × ~10 rows), with column headers switched to weekday abbreviations, row labels to "HH:00", and cell fill switched from primary-alpha to `levelColorForAverage()`. The Wochentrend bars mirror `HourlyChart`'s bar style. No `Canvas`.
- Weekday labels are a fixed list `Mo, Di, Mi, Do, Fr, Sa, So` (`Locale.GERMAN` short names include a trailing dot). All 7 columns are always shown, also with "Nur Werktage" — weekend entries can still exist (imported or logged manually).
- Header (as in the mockup): one `Row` — shared `BackButton` (D8), then a `Row(Modifier.weight(1f), SpaceBetween)` with a small ‹ arrow button, the title (`"MMMM yyyy"`, `Locale.GERMAN`, centred, `titleMedium` serif-free), and a › arrow button. Arrow buttons get `contentDescription` "Vorheriger Monat" / "Nächster Monat".
- Month state: `rememberSaveable` of the `YearMonth` (as string), `today` injectable for tests; › disabled when the month equals the current month.
- Wochentrend shows bar + value only; no generated trend sentence (the mockup's "Ø Aktivitätslevel steigt…" note is left for a possible later feature).

### D10 — Navigation: the heatmap screen grows into the Auswertung screen
The heatmap is kept and moved, not removed. `WeekHeatmapScreen.kt` is renamed to `MonthEvaluationScreen.kt` and extended: header per D9, then Monatsüberblick, the heatmap section ("Tage im Überblick", moved below the overview), then Wochentrend. `WeekHeatmapScreenTest.kt` is renamed and its heatmap tests are adapted to the weekday × hour layout rather than rewritten from scratch. Route `letzte-aktive-tage` → `auswertung`, `AppNavigation`'s `heatmap` slot → `evaluation`, the card's 📅 button `contentDescription` → "Auswertung öffnen". `hourlyActivity()` stays. `MainActivity` keeps passing the reminder slots (now for the heatmap's fallback hours).

## Risks / Trade-offs

- [Coloured history text may still be hard to read for some tone/theme pairs (e.g. ochre on light cards)] → D1's per-theme tones; checked visually on the emulator in both themes as part of the tasks.
- [Mockup-style level cards plus Trinkmanager and Aktivitätsauswertung could exceed one screen] → D2a budget with ~200 dp reserve; the no-scroll test fails loudly if exceeded. With the exact-alarm warning *and* a save error shown at once, the evaluation card may be pushed partly off-screen — accepted, as both are transient states.
- [The one-screen goal for Optionen depends on font scale and device] → the spec only guarantees it on the reference profile at default scale; the Robolectric qualifier test pins that, and scrolling remains as fallback.
- [Archive ordering: archiving this change before `add-android-day-week-evaluation` fails, because its deltas target a spec that does not exist yet] → listed as a dependency in proposal.md; tasks start with a check.
- [`add-android-csv-import-export` still specifies "configured destination is used by export"] → flagged in proposal; that change needs an update before it is implemented, outside this change's scope.
- [Changing the history sort reorders rows users are used to (extras now above their primary)] → intended by the request; covered by explicit scenarios.

## Migration Plan

No data migration. The `export_location_uri` column remains in the schema with whatever value it holds. Rollback is reverting the commit; no persisted format changes.
