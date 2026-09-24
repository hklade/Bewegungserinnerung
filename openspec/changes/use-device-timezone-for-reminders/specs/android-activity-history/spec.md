## MODIFIED Requirements

### Requirement: Today's and yesterday's dates are shown as relative labels; the description/note is bold
The system SHALL replace an entry's date in the first line with "Heute" when the entry's date equals the current calendar date in the device's current time zone, or with "Gestern" when it equals the previous calendar day; all other dates SHALL continue to show the existing dd.MM.yyyy format. The description/note portion of the first line SHALL be rendered in bold; the date/time portion is not bold. The second line of the row is unaffected.

#### Scenario: Today's entry shows a "Heute" label
- **WHEN** an entry's date equals the current calendar date in the device's time zone
- **THEN** the first line shows "Heute" in place of the numeric date

#### Scenario: Yesterday's entry shows a "Gestern" label
- **WHEN** an entry's date equals the previous calendar date in the device's time zone
- **THEN** the first line shows "Gestern" in place of the numeric date

#### Scenario: Older entries keep the numeric date
- **WHEN** an entry's date is neither today nor yesterday in the device's time zone
- **THEN** the first line shows the existing dd.MM.yyyy date

#### Scenario: Relative label follows a non-Vienna device zone
- **WHEN** the device's time zone is `America/New_York`, the current instant is 2026-09-11T02:00:00Z (still 2026-09-10 in New York), and an entry's date is 2026-09-10
- **THEN** the first line shows "Heute", even though it is already 2026-09-11 in Europe/Vienna

#### Scenario: The description/note is rendered bold
- **WHEN** the activity history list is displayed and a row has a non-blank description or note
- **THEN** that description/note text is rendered in bold, while the date/time portion of the same line is not bold
