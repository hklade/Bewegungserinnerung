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

### Requirement: Unanswered slots appear in the activity list like any other entry
The system SHALL include entries with `Unanswered` status in the scrollable activity list alongside logged entries, displayed as an ordinary row with no distinct visual treatment, while still counting them in the day/week statistics defined in [[android-day-week-evaluation]].

#### Scenario: Unanswered slot appears as a list row
- **WHEN** a reminder slot has been backfilled with `Unanswered` status and no entry was ever logged for it
- **THEN** it appears as a row in the activity history list, in chronological order like any other entry

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

### Requirement: The activity history list is visible on the main screen
The system SHALL display the activity history list on the app's main screen, sourced from the live Room data (all persisted movement entries, mapped to the display model), so newly logged entries appear without restarting the app.

#### Scenario: A newly saved entry appears in the visible list
- **WHEN** the user saves a new activity entry via quick-entry
- **THEN** the activity history list on the main screen updates to include that entry without further user action

### Requirement: Today's and yesterday's dates are shown as relative labels; the description/note is bold
The system SHALL replace an entry's date in the first line with "Heute" when the entry's date equals the current calendar date in the Europe/Vienna zone, or with "Gestern" when it equals the previous calendar day; all other dates SHALL continue to show the existing dd.MM.yyyy format. The description/note portion of the first line SHALL be rendered in bold; the date/time portion is not bold. The second line of the row is unaffected.

#### Scenario: Today's entry shows a "Heute" label
- **WHEN** an entry's date equals the current calendar date in Europe/Vienna
- **THEN** the first line shows "Heute" in place of the numeric date

#### Scenario: Yesterday's entry shows a "Gestern" label
- **WHEN** an entry's date equals the previous calendar date in Europe/Vienna
- **THEN** the first line shows "Gestern" in place of the numeric date

#### Scenario: Older entries keep the numeric date
- **WHEN** an entry's date is neither today nor yesterday in Europe/Vienna
- **THEN** the first line shows the existing dd.MM.yyyy date

#### Scenario: The description/note is rendered bold
- **WHEN** the activity history list is displayed and a row has a non-blank description or note
- **THEN** that description/note text is rendered in bold, while the date/time portion of the same line is not bold
