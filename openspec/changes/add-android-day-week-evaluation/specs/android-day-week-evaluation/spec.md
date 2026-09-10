## Purpose

Gives the user an aggregated view of their logged activity per day and across the past week, so patterns of missed or completed reminders are visible at a glance rather than only as a raw list.

## ADDED Requirements

### Requirement: The user can select among the last 14 active days
The system SHALL let the user pick any day, from today back through the last 14 days that have at least one logged activity entry (or today itself, even if empty), to view that day's statistics.

#### Scenario: Day picker lists only days with activity, plus today
- **WHEN** the user opens the day picker
- **THEN** it lists today and any of the previous 13 days that have at least one logged activity entry, ordered most recent first

#### Scenario: Selecting a day updates the displayed statistics
- **WHEN** the user selects a day from the picker
- **THEN** the statistics and chart shown update to reflect only that day's entries

### Requirement: Per-day statistics summarize completed, additional, and missed reminders
For the selected day, the system SHALL display: the count of answered reminder slots (broken down into primary/planned answers and additional/extra entries), the count of unanswered (missed) reminder slots, and the average response delay in minutes across answered slots.

#### Scenario: Stats reflect a day with a mix of outcomes
- **WHEN** the selected day has some slots answered, some answered with an extra entry, and some unanswered
- **THEN** the displayed stats show the correct count of primary answers, the correct count of additional entries, and the correct count of unanswered slots, matching [[android-reminder-scheduling]]'s slot status for that day

#### Scenario: Average delay is computed only over answered slots
- **WHEN** the selected day has both answered and unanswered slots
- **THEN** the displayed average response delay is computed only from the answered slots' response times, excluding unanswered slots

### Requirement: An hourly chart shows activity level over the selected day
The system SHALL display a chronological chart of the selected day's activity levels by hour, showing only the hours that have at least one logged entry, with each hour's value derived from its entries.

#### Scenario: Chart shows only hours with entries
- **WHEN** the selected day has entries in some hours but not others
- **THEN** the chart displays bars only for the hours that have entries

#### Scenario: Empty day shows an explicit empty state
- **WHEN** the selected day has no logged entries at all
- **THEN** the system displays an explicit message indicating no entries exist for that day, instead of an empty chart

### Requirement: A 7-day heatmap shows activity by day and hour
The system SHALL display a heatmap covering the most recent 7 days that have at least one logged activity entry, with rows representing the reminder hour slots (derived from the configured start/end time) and columns representing those days, where each cell's color intensity reflects the average activity level logged in that day/hour combination.

#### Scenario: Heatmap columns are limited to active days
- **WHEN** fewer than 7 days in history have any logged activity
- **THEN** the heatmap shows only as many columns as there are days with activity, not empty placeholder columns

#### Scenario: Heatmap cell reflects average value and count
- **WHEN** a given day/hour combination has one or more logged entries
- **THEN** the corresponding heatmap cell's color intensity reflects the average activity value for that combination, and the cell can be inspected to see the number of entries it represents

#### Scenario: Empty day/hour combination is visually distinct
- **WHEN** a given day/hour combination has no logged entries
- **THEN** the corresponding heatmap cell is visually distinct from cells that have data, rather than appearing as a zero-value entry
