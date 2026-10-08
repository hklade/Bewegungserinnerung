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

## REMOVED Requirements

### Requirement: A 7-day heatmap shows activity by day and hour
**Reason**: Replaced by the month evaluation screen ([[android-month-evaluation]]), whose "Tage im Überblick" weekday × hour grid and "Wochentrend" cover the same question over a whole month.
**Migration**: The evaluation card's calendar action now opens the Auswertung (month evaluation) screen instead of "Letzte aktive Tage".
