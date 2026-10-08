## MODIFIED Requirements

### Requirement: Per-day statistics summarize completed, additional, and missed reminders
For the selected day, the system SHALL display: the count of answered reminder slots (broken down into primary/planned answers and additional/extra entries), the count of unanswered (missed) reminder slots, and the average response delay in minutes across answered slots. The four values SHALL be shown side by side, labelled "Beantwortet", "Extra", "Verpasst" and "Ø Min. Delay"; the average delay SHALL be shown in whole minutes (rounded half-up), or as "–" when the day has no answered entry with a delay.

#### Scenario: Stats reflect a day with a mix of outcomes
- **WHEN** the selected day has some slots answered, some answered with an extra entry, and some unanswered
- **THEN** the displayed stats show the correct count of primary answers, the correct count of additional entries, and the correct count of unanswered slots, matching [[android-reminder-scheduling]]'s slot status for that day

#### Scenario: Average delay is computed only over answered slots
- **WHEN** the selected day has both answered and unanswered slots
- **THEN** the displayed average response delay is computed only from the answered slots' response times, excluding unanswered slots

#### Scenario: Average delay is shown next to the counts
- **WHEN** the selected day has answered entries with delays 3, 4 and 8 minutes
- **THEN** a fourth value labelled "Ø Min. Delay" shows 5

#### Scenario: Day without answered entries
- **WHEN** the selected day has no answered entries
- **THEN** "Ø Min. Delay" shows "–"

### Requirement: An hourly chart shows activity level over the selected day
The system SHALL display a chronological chart of the selected day's activity levels by hour, showing only the hours that have at least one logged entry, with each hour's value derived from its entries. The bars SHALL be laid out starting at the left edge of the chart area, in hour order, rather than centred.

#### Scenario: Chart shows only hours with entries
- **WHEN** the selected day has entries in some hours but not others
- **THEN** the chart displays bars only for the hours that have entries

#### Scenario: Empty day shows an explicit empty state
- **WHEN** the selected day has no logged entries at all
- **THEN** the system displays an explicit message indicating no entries exist for that day, instead of an empty chart

#### Scenario: Bars start at the left
- **WHEN** the selected day has entries in only two hours
- **THEN** the first bar is aligned with the left edge of the chart area and the second bar follows immediately to its right, leaving any free space on the right

## RENAMED Requirements

- FROM: `### Requirement: A 7-day heatmap shows activity by day and hour`
- TO: `### Requirement: The heatmap "Tage im Überblick" shows average activity by weekday and hour`

## MODIFIED Requirements

### Requirement: The heatmap "Tage im Überblick" shows average activity by weekday and hour
The heatmap SHALL be kept, but moved down on the Auswertung screen (see [[android-month-evaluation]]) to sit below the "Monatsüberblick", titled "Tage im Überblick", and adapted as follows. It SHALL cover the month shown on that screen (instead of the 7 most recent active days), with one column per weekday, headed by the German abbreviation (Mo, Di, Mi, Do, Fr, Sa, So), and one row per full hour, labelled "HH:00" (e.g. "07:00", "08:00"). The rows SHALL span from the earliest to the latest hour that has a logged entry in the shown month; when the month has none, the rows SHALL span the configured reminder window's hours. Each cell SHALL represent the average activity value of all logged (non-unanswered) entries in the shown month whose date falls on that weekday and whose slot time falls in that hour, and SHALL be filled with the colour of the activity level nearest to that average (level colours per [[android-quick-entry]]). A cell with no logged entries, or whose average is 0, SHALL be left empty. A filled cell SHALL remain inspectable to show the number of entries it represents and their average value.

#### Scenario: Heatmap sits below the Monatsüberblick
- **WHEN** the Auswertung screen is displayed
- **THEN** the "Tage im Überblick" heatmap is shown directly below the "Monatsüberblick" section

#### Scenario: Cell colour reflects the average level
- **WHEN** the month's Tuesday 09:00–09:59 entries have values 3, 3 and 4
- **THEN** the Di / 09:00 cell is filled with the colour of level 3 (average 3.33, nearest level 3)

#### Scenario: Only zero values leave the cell empty
- **WHEN** all of the month's Monday 14:00 entries have value 0
- **THEN** the Mo / 14:00 cell is left empty, looking the same as a cell with no entries

#### Scenario: Unanswered slots do not influence a cell
- **WHEN** a weekday/hour combination has one logged entry with value 2 and several unanswered slots
- **THEN** the cell shows the colour of level 2

#### Scenario: Hours outside the data range are not shown
- **WHEN** the month's logged entries fall between 07:00 and 16:59 only
- **THEN** the heatmap rows are 07:00 through 16:00, with no rows before or after

#### Scenario: Filled cell can be inspected
- **WHEN** the user taps the Di / 09:00 cell that represents 3 entries with average 3.33
- **THEN** the screen shows that the cell represents 3 entries with an average value of 3,3
