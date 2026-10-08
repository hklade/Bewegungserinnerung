## MODIFIED Requirements

### Requirement: Recent activity entries are listed with full detail
The system SHALL display a list of the user's most recent logged activity entries, each showing: the date, the actual time the entry was logged (its response time), the response delay in minutes (or an explicit "none" indicator if not applicable), the activity level value, the description/note, and the entry's type classification (planned/primary answer, additional/extra, or unanswered). For an unanswered slot, which has no logged time, the row SHALL show the slot's planned time in place of the actual time.

#### Scenario: Entry row shows all required fields
- **WHEN** the activity history list is displayed
- **THEN** each row shows the entry's date, actual logged time, delay, activity value, description/note, and type classification

#### Scenario: Row shows when the entry was logged, not the slot
- **WHEN** an entry for the 09:00 slot was logged at 09:17
- **THEN** its row shows 09:17, not 09:00

#### Scenario: Unanswered slot shows its planned time
- **WHEN** a row represents an unanswered slot for 11:00
- **THEN** the row shows 11:00

#### Scenario: Entries with no delay show an explicit indicator
- **WHEN** an entry has no meaningful response delay (e.g. an unanswered slot with no response time)
- **THEN** the row shows an explicit placeholder instead of a numeric delay

### Requirement: Today's and yesterday's dates are shown as relative labels; the description/note is bold
The system SHALL replace an entry's date in the first line with "Heute" when the entry's date equals the current calendar date in the Europe/Vienna zone, or with "Gestern" when it equals the previous calendar day; all other dates SHALL continue to show the existing dd.MM.yyyy format. The description/note portion of the first line SHALL be rendered in bold and in the colour of the entry's activity level (as defined in [[android-quick-entry]]); the date/time portion is neither bold nor level-coloured. The second line of the row is unaffected.

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

#### Scenario: The description/note has the level colour
- **WHEN** a row's entry has activity value 3
- **THEN** its bold description/note text is drawn in the level-3 colour (blue), and the date/time portion keeps the default text colour

## ADDED Requirements

### Requirement: The list is sorted by actual time, newest first
The system SHALL order the activity history list by each entry's actual time — its date combined with its logged (response) time, or with its planned slot time for an unanswered slot — most recent first. Entries with the same actual time SHALL be ordered by creation time, most recent first.

#### Scenario: Later extra entry appears above the primary answer
- **WHEN** the 09:00 slot was answered at 09:05 and an extra entry for the same slot was logged at 09:40
- **THEN** the 09:40 entry is listed above the 09:05 entry

#### Scenario: Late answer sorts by when it was logged
- **WHEN** an extra entry for the 08:00 slot was logged at 09:30 and the 09:00 slot was answered at 09:10
- **THEN** the 09:30 entry is listed above the 09:10 entry, even though its slot is earlier

#### Scenario: Unanswered slot sorts by its planned time
- **WHEN** the 10:00 slot is unanswered, one entry was logged at 10:20 and another at 09:45 on the same day
- **THEN** the order is: the 10:20 entry, the unanswered 10:00 row, the 09:45 entry
