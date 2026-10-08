## MODIFIED Requirements

### Requirement: Quick-entry fits entirely on one screen without scrolling
The system SHALL lay out the quick-entry screen so that, on the reference device profile defined in design.md (412 × 892 dp), in portrait orientation, at the system's default font scale, the following are all visible and reachable without scrolling: the current reminder slot indicator, the activity level selection, the note field, the save action, the Trinkmanager card (see [[android-hydration-tracking]]) and the Aktivitätsauswertung card (see [[android-day-week-evaluation]]). The activity history list below them MAY extend beyond the visible area and be reached by scrolling.

#### Scenario: All controls visible without scrolling on the reference device
- **WHEN** the quick-entry screen is displayed on the reference device profile in portrait orientation
- **THEN** the current reminder slot indicator, the activity level options, the note field, the save button, the Trinkmanager card and the Aktivitätsauswertung card are all fully visible without any scrolling gesture

#### Scenario: History may continue below the visible area
- **WHEN** the quick-entry screen is displayed on the reference device profile and history entries exist
- **THEN** the history list may start or continue below the visible area and is reachable by scrolling, without pushing any of the elements above out of view in the initial position

#### Scenario: Layout adapts on smaller screens without hiding the save action
- **WHEN** the quick-entry screen is displayed on a device smaller than the reference profile
- **THEN** the note field may reduce in height and the Trinkmanager and Aktivitätsauswertung cards may require scrolling, but the activity level options and the save action remain visible and reachable without scrolling

### Requirement: The user selects one activity level from five options
The system SHALL present exactly five mutually-exclusive activity level options, each with a distinct numeric value (0 through 4) and a short German label, and SHALL default to selecting one option (value 1) when the screen is first shown. The options SHALL be laid out as cards in a three-column grid (three in the first row, two in the second). Each card SHALL show a badge with the level's numeric value filled in the level's fixed colour (listed below), the label, and the short description; the card background SHALL be the same neutral panel colour for all levels. The same level colours SHALL be used wherever an activity level is colour-coded in the app (activity history, evaluation charts and grids). The selected card SHALL be marked by a visible outline ring around the card and a slightly raised/stronger background, so the selection is recognisable independently of the badge colours.

| Value | Label | Description | Colour |
|---|---|---|---|
| 0 | Keine Pause | sitzen geblieben | red (#B14D43) |
| 1 | Mini-Pause | kurz innegehalten | ochre (#99661F) |
| 2 | Leichte Aktivität | Bürotätigkeit | orange (#E37D2D) |
| 3 | Bewegung | gehen / dehnen | blue (#375FD7) |
| 4 | Aktive Pause | Spaziergang / Übungen | green (#086142) |

#### Scenario: Default selection on screen open
- **WHEN** the quick-entry screen is displayed and the user has not yet made a selection
- **THEN** the "Mini-Pause" option (value 1) is shown as selected

#### Scenario: Selecting a different level updates the selection
- **WHEN** the user taps a different activity level option
- **THEN** that option becomes the selected one and any previously selected option is deselected

#### Scenario: Each level card shows a coloured number badge, label and description
- **WHEN** the quick-entry screen is displayed
- **THEN** each of the five level cards shows its numeric value in a badge filled with the colour assigned to its level in the table above, together with its label and description, and no two levels share a badge colour

#### Scenario: Selected card is outlined
- **WHEN** one level is selected
- **THEN** that card has an outline ring and a stronger background, and the other four cards have neither

### Requirement: The user can enter a free-text note for the activity
The system SHALL provide a single-line free-text input for describing the logged activity, and SHALL allow saving an entry with the note left empty. The note input SHALL NOT accept line breaks: pressing Enter SHALL NOT insert a new line, and line breaks contained in pasted text SHALL be replaced by single spaces.

#### Scenario: Note is optional
- **WHEN** the user saves an entry without typing anything into the note field
- **THEN** the entry is saved successfully with a default description derived from the selected activity level's label

#### Scenario: Note text is saved verbatim
- **WHEN** the user types a note and saves the entry
- **THEN** the saved entry's note matches exactly what the user typed

#### Scenario: Enter does not create a new line
- **WHEN** the user presses Enter on the keyboard while the note field is focused
- **THEN** the note remains a single line and no line break is added to its text

#### Scenario: Pasted line breaks are flattened
- **WHEN** the user pastes the text "Treppe\ngegangen" into the note field
- **THEN** the note field contains "Treppe gegangen"
