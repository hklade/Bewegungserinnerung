## Purpose

Gives the user a month-level view of their logged activity — month totals, the heatmap of typical activity per weekday and hour, and the average per calendar week — so longer-term patterns are visible beyond a single day.

## ADDED Requirements

### Requirement: The month evaluation is a separate screen with month navigation
The system SHALL provide an "Auswertung" screen — the former "Letzte aktive Tage" heatmap screen, extended — reachable with one action from the quick-entry screen's activity evaluation card, that shows one calendar month at a time. Below the header it SHALL show, from top to bottom: the "Monatsüberblick", the heatmap "Tage im Überblick" (moved down below the Monatsüberblick and adapted as specified in [[android-day-week-evaluation]]), and the "Wochentrend". The screen SHALL open on the current month (Europe/Vienna). Its header SHALL be a single row containing, from left to right: the back action, a "previous month" arrow (‹), the month title in German (e.g. "September 2026") centred between the arrows, and a "next month" arrow (›). The arrows SHALL step one calendar month back or forward. Stepping past the current month SHALL NOT be possible.

#### Scenario: Sections appear in order
- **WHEN** the Auswertung screen is displayed
- **THEN** the sections appear top to bottom as Monatsüberblick, Tage im Überblick, Wochentrend

#### Scenario: Header shows back action, arrows and month title in one row
- **WHEN** the Auswertung screen is displayed
- **THEN** the back action, the ‹ arrow, the month title and the › arrow appear in one row in that order, with the title centred between the arrows

#### Scenario: Navigating to the next month
- **WHEN** the screen shows a past month and the user triggers the › arrow
- **THEN** the title and all sections update to the following calendar month

#### Scenario: Screen opens on the current month
- **WHEN** the user opens the Auswertung screen
- **THEN** the screen shows the current calendar month, titled with the German month name and year

#### Scenario: Navigating to the previous month
- **WHEN** the user triggers the ‹ arrow
- **THEN** the title and all three sections update to show the previous calendar month's data

#### Scenario: Future months are not reachable
- **WHEN** the screen shows the current month
- **THEN** the › arrow is disabled

#### Scenario: Month without entries
- **WHEN** the shown month has no movement entries at all
- **THEN** the Monatsüberblick shows zero counts and "–" for the delay, the Tage im Überblick heatmap shows only empty cells, and the Wochentrend shows no bars

### Requirement: The back button matches the Optionen screen
The Auswertung screen SHALL show a back action at the top-left with the same icon, size and position as the back action on the Optionen screen, and it SHALL return to the quick-entry screen.

#### Scenario: Back returns to quick entry
- **WHEN** the user triggers the back action on the Auswertung screen
- **THEN** the quick-entry screen is shown

#### Scenario: Back action looks the same as on Optionen
- **WHEN** the Auswertung screen and the Optionen screen are compared
- **THEN** their back actions use the same arrow icon, the same icon size, and the same position relative to the screen edge and title

### Requirement: Monatsüberblick summarizes the month's reminder outcomes
The system SHALL show a "Monatsüberblick" section with four values for the shown month: "Beantwortet" (count of primary answers), "Extra" (count of additional/extra entries), "Verpasst" (count of unanswered slots), and "Ø Min. Delay" (average response delay in whole minutes over answered entries, rounded half-up). Classification of each entry SHALL use the same entry types as the per-day statistics in [[android-day-week-evaluation]]. When the month has no answered entry with a delay, "Ø Min. Delay" SHALL show "–".

#### Scenario: Counts cover only the shown month
- **WHEN** entries exist in the shown month and in adjacent months
- **THEN** Beantwortet, Extra and Verpasst count only entries whose date lies in the shown month

#### Scenario: Average delay excludes unanswered slots
- **WHEN** the month has answered entries with delays 5 and 10 minutes and unanswered slots
- **THEN** "Ø Min. Delay" shows 8 (7.5 rounded half-up), unaffected by the unanswered slots

#### Scenario: No answered entries
- **WHEN** the month has only unanswered slots
- **THEN** "Ø Min. Delay" shows "–"

### Requirement: Wochentrend shows the average activity per calendar week
The system SHALL show a "Wochentrend" section with one entry per ISO-8601 calendar week that contains at least one day of the shown month, in chronological order, each labelled "KW <number>". Each entry SHALL show the average activity value of the logged (non-unanswered) entries of that week that fall inside the shown month, as a bar whose height is proportional to the average (0–4) and whose colour is the colour of the activity level nearest to the average, together with the average as a number with one decimal (German formatting, e.g. "2,4"). A week without logged entries in the shown month SHALL show its label but no bar and no number. The section SHALL NOT contain any textual trend statement or comparison with other months.

#### Scenario: Weeks crossing the month boundary
- **WHEN** the shown month starts on a Wednesday
- **THEN** the first Wochentrend entry is that week's KW, and its average includes only the entries from the Wednesday onward

#### Scenario: Bar colour and value follow the average
- **WHEN** a week's logged entries in the month average 3.6
- **THEN** that week's bar is drawn in the colour of level 4 and labelled "3,6"

#### Scenario: Week without entries
- **WHEN** a calendar week of the month has no logged entries
- **THEN** its "KW" label is shown without a bar or value
