## Purpose

Shows the user a chronological list of their logged movement activity entries, with enough detail per entry to review what was logged and when, without requiring every entry to be visible at once.

## ADDED Requirements

### Requirement: Recent activity entries are listed with full detail
The system SHALL display a list of the user's most recent logged activity entries, each showing: the date, the planned (slot) time, the response delay in minutes (or an explicit "none" indicator if not applicable), the activity level value, the description/note, and the entry's type classification (planned/primary answer, additional/extra, or unanswered).

#### Scenario: Entry row shows all required fields
- **WHEN** the activity history list is displayed
- **THEN** each row shows the entry's date, planned time, delay, activity value, description/note, and type classification

#### Scenario: Entries with no delay show an explicit indicator
- **WHEN** an entry has no meaningful response delay (e.g. an unanswered slot with no response time)
- **THEN** the row shows an explicit placeholder instead of a numeric delay

### Requirement: Unanswered slots are excluded from the primary activity list but included in counts elsewhere
The system SHALL exclude entries with `Unanswered` status from the scrollable activity list (which shows actual logged activity), while still counting them in the day/week statistics defined in [[android-day-week-evaluation]].

#### Scenario: Unanswered slot does not appear as a list row
- **WHEN** a reminder slot has been backfilled with `Unanswered` status and no entry was ever logged for it
- **THEN** it does not appear as a row in the activity history list

#### Scenario: Unanswered slot still counts in statistics
- **WHEN** a reminder slot has `Unanswered` status
- **THEN** it is still included in the "missed reminders" count shown by the day/week evaluation screens

### Requirement: The list shows a limited number of entries by default, expandable on demand
The system SHALL initially show only the 5 most recent activity entries, and SHALL let the user expand the view to show more entries (up to a bounded maximum) with a single action, and collapse back to the initial 5 with another action.

#### Scenario: Default view shows 5 entries
- **WHEN** the activity history screen is first displayed and more than 5 entries exist
- **THEN** only the 5 most recent entries are shown, along with an action to show more

#### Scenario: Expanding shows additional entries
- **WHEN** the user triggers the "show more" action
- **THEN** additional entries beyond the first 5 are shown, up to a bounded maximum, and the action changes to allow collapsing back

#### Scenario: Collapsing returns to the default view
- **WHEN** the user triggers the "show less" action after expanding
- **THEN** the list returns to showing only the 5 most recent entries
