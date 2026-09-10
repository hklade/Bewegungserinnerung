## Purpose

Provides the app's default, one-screen "Schnelleingabe" flow for logging an activity level and note against the currently active reminder slot, with no scrolling required to reach any control.

## ADDED Requirements

### Requirement: Quick-entry is the app's default screen
The system SHALL show the quick-entry screen as the first screen presented whenever the app is opened, including from a cold start, from the home screen launcher icon, and from tapping a reminder notification.

#### Scenario: Cold start opens quick-entry
- **WHEN** the user launches the app from a fully closed state
- **THEN** the quick-entry screen is the first screen shown

#### Scenario: Opening from a reminder notification opens quick-entry
- **WHEN** the user taps a reminder notification
- **THEN** the app opens directly to the quick-entry screen

### Requirement: Quick-entry fits entirely on one screen without scrolling
The system SHALL lay out every quick-entry control — activity level selection, note field, save action, and current reminder slot indicator — so that all of them are visible and reachable without scrolling, on the reference device profile defined in design.md, in portrait orientation, at the system's default font scale.

#### Scenario: All controls visible without scrolling on the reference device
- **WHEN** the quick-entry screen is displayed on the reference device profile in portrait orientation
- **THEN** the activity level options, the note field, the save button, and the current reminder slot indicator are all visible without any scrolling gesture

#### Scenario: Layout adapts on smaller screens without hiding the save action
- **WHEN** the quick-entry screen is displayed on a device smaller than the reference profile
- **THEN** the note field may reduce in height, but the activity level options and the save action remain visible and reachable without scrolling

### Requirement: The user selects one activity level from five options
The system SHALL present exactly five mutually-exclusive activity level options, each with a distinct numeric value (0 through 4) and a short German label, and SHALL default to selecting one option (value 1) when the screen is first shown.

| Value | Label | Description |
|---|---|---|
| 0 | Keine Pause | sitzen geblieben |
| 1 | Mini-Pause | kurz innegehalten |
| 2 | Leichte Aktivität | Bürotätigkeit |
| 3 | Bewegung | gehen / dehnen |
| 4 | Aktive Pause | Spaziergang / Übungen |

#### Scenario: Default selection on screen open
- **WHEN** the quick-entry screen is displayed and the user has not yet made a selection
- **THEN** the "Mini-Pause" option (value 1) is shown as selected

#### Scenario: Selecting a different level updates the selection
- **WHEN** the user taps a different activity level option
- **THEN** that option becomes the selected one and any previously selected option is deselected

### Requirement: The user can enter a free-text note for the activity
The system SHALL provide a free-text input for describing the logged activity, and SHALL allow saving an entry with the note left empty.

#### Scenario: Note is optional
- **WHEN** the user saves an entry without typing anything into the note field
- **THEN** the entry is saved successfully with a default description derived from the selected activity level's label

#### Scenario: Note text is saved verbatim
- **WHEN** the user types a note and saves the entry
- **THEN** the saved entry's note matches exactly what the user typed

### Requirement: Saving a quick-entry creates one activity entry classified by the current slot's status
The system SHALL, on save, create exactly one new activity entry using the selected activity level and note, associated with the current reminder slot (as determined by [[android-reminder-scheduling]]'s slot status mechanism), and classify it as the slot's primary answer or as an additional/extra entry based on that slot's authoritative status at the moment of saving — without the quick-entry screen independently re-deriving that classification through its own heuristic.

#### Scenario: First save for a slot is the primary answer
- **WHEN** the user saves an entry while the current slot's status is `Pending` or `Unanswered`
- **THEN** the new entry is recorded as that slot's primary answer, and the slot's status becomes `Answered`

#### Scenario: Second save for an already-answered slot is an additional entry
- **WHEN** the user saves another entry while the current slot's status is already `Answered`
- **THEN** the new entry is recorded as an additional/extra entry for that slot, and the slot's status becomes `AnsweredWithExtra`

#### Scenario: Note field clears after a successful save, selection is preserved
- **WHEN** an entry is saved successfully
- **THEN** the note field is cleared
- **AND** the previously selected activity level remains selected for the next entry

#### Scenario: Save failure is visible to the user
- **WHEN** saving an entry fails (e.g. a local storage error)
- **THEN** the screen shows an error state and the note field is not cleared, so the user does not lose their input

### Requirement: The current reminder slot is visible on the quick-entry screen
The system SHALL display the time of the currently active reminder slot on the quick-entry screen, or an explicit indication when no reminder slot is currently active (reminders disabled, or current day ineligible).

#### Scenario: Active slot time is shown
- **WHEN** hourly reminders are enabled and the current day is eligible
- **THEN** the quick-entry screen displays the time of the current reminder slot

#### Scenario: No active slot is shown explicitly
- **WHEN** hourly reminders are disabled, or the current day is not eligible
- **THEN** the quick-entry screen displays an explicit "no active reminder" indication instead of a slot time
