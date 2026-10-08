## Why

The Android app's screens have grown functionally complete but visually inconsistent with the agreed mockup (see the "Schnelleingabe · Optionen · Monatsauswertung" mockup artifact): activity levels are plain chips with no colour coding, the history shows the planned slot time instead of when the user actually logged, the Optionen screen needs scrolling, and the "Letzte aktive Tage" heatmap is a 7-day snapshot that answers "how was this month?" poorly. This change aligns the screens with the mockup and replaces the heatmap with a month evaluation.

## Dependencies

Depends on: `add-android-day-week-evaluation` — it must be archived first, because this change modifies and removes requirements of the `android-day-week-evaluation` capability that change introduces.
Affects: `add-android-csv-import-export` (still open) — it currently consumes the export-location setting, which this change removes; that change must fall back to the system save dialog / Downloads instead (see Impact).

## What Changes

**Schnelleingabe (quick entry)**
- The five activity-level options become cards as in the mockup (3-column grid): a number badge in the level's fixed colour (0 red, 1 ochre, 2 orange, 3 blue, 4 green — the tones the evaluation bar chart already uses), the label and the short description; the selected card gets an outline ring.
- The note field is single-line: Enter/line breaks cannot be entered, and pasted line breaks are replaced by spaces.
- On the reference device the input area, the Trinkmanager and the Aktivitätsauswertung must all be visible without scrolling; only the history ("Letzte Aktivität") may continue below the visible area.

**Letzte Aktivität (history)**
- Each row shows the actual time the entry was logged instead of the planned slot time (unanswered slots, which have no logged time, keep showing the slot time).
- The bold activity text is drawn in the colour of the entry's activity level.
- Rows are sorted by actual time, newest first.

**Aktivitätsauswertung (day card)**
- The hourly bar chart starts at the left edge instead of being centred.
- A fourth statistic "Ø Min. Delay" is shown next to Beantwortet / Extra / Verpasst.

**Trinkmanager**
- The progress bar becomes a taller, segmented bar: one segment per 250 ml of the goal, with a small gap between segments.

**Optionen** (goal: fits on one screen on the reference device)
- **BREAKING (settings):** the "Export" card and the export-location setting are removed.
- The hydration goal is a single row ("Tagesziel in Litern, Standard 2 Liter" + compact input); the supporting line below the input is removed.
- Body text uses the size the card headings use today; card headings become 2 sp larger.
- The on/off switches are made smaller (about 80 %).

**Auswertung (replaces "Letzte aktive Tage")**
- **BREAKING (evaluation):** the 7-day × slot heatmap screen is replaced by a month evaluation screen. Its header row holds the back button and the month switcher "‹ September 2026 ›" (as in the mockup); below it are three sections:
  - **Monatsüberblick:** Beantwortet, Extra, Verpasst, Ø Min. Delay for the month.
  - **Tage im Überblick:** a grid with weekday abbreviations as columns and full hours (07:00, 08:00, …) as rows; each cell shows the month's average activity level for that weekday/hour in the level colour; cells with no data or an average of 0 stay empty.
  - **Wochentrend:** one entry per calendar week ("KW 37") touching the month, showing that week's average activity level as a bar in the level colour plus the value (e.g. "2,4"). No textual trend statement — a real trend analysis may follow as a separate feature.
- The back button has the same size and position as on the Optionen screen.

## Capabilities

### New Capabilities
- `android-month-evaluation`: Month evaluation screen — header with month navigation (‹ month ›), Monatsüberblick statistics, weekday × hour "Tage im Überblick" grid, and "Wochentrend" per calendar week.

### Modified Capabilities
- `android-quick-entry`: activity-level options become mockup-style cards with colour-coded number badges; the note field is single-line; the one-screen requirement now also covers the Trinkmanager and Aktivitätsauswertung cards (history may scroll).
- `android-activity-history`: rows show the actual logged time, the bold activity text is level-coloured, and rows are sorted by actual time descending.
- `android-hydration-tracking`: the progress display is a taller, segmented bar (one segment per 250 ml).
- `android-settings-configuration`: export-location setting removed; hydration goal on one row without a supporting line; Optionen fits on one screen with adjusted typography and smaller switches.
- `android-day-week-evaluation`: the hourly chart is left-aligned; Ø Min. Delay is displayed; the 7-day heatmap requirement is removed in favour of `android-month-evaluation`.

## Impact

- **Android UI code** (`android/app/src/main/kotlin/.../ui/`): `quickentry/` (level selector, note field), `history/` (row text, sort), `evaluation/` (day card, heatmap screen replaced by month screen + aggregation), `hydration/HydrationCard`, `settings/SettingsScreen`, `AppNavigation`/`MainActivity` wiring.
- **Shared UI helpers:** the level colour palette and the Optionen back button are extracted so quick entry, history, evaluation and both secondary screens use the same ones.
- **Data:** no schema change and no Room migration. The `export_location_uri` column stays in the settings table but is no longer read or written by the UI.
- **Open change `add-android-csv-import-export`:** its "configured destination" behaviour no longer has a setting to read; it must be updated to use the system save dialog / Downloads before it is implemented.
- **Web app / server:** not affected.
