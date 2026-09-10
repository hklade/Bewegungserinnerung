## Purpose

Gives the user a dedicated settings screen (separate from the default quick-entry screen) to configure the reminder schedule, hydration goal, notification tone/vibration, and export location, with changes taking effect immediately.

## ADDED Requirements

### Requirement: Settings are reachable from a dedicated screen, not the default screen
The system SHALL provide a settings screen, reachable via explicit navigation from the quick-entry screen, that is not shown by default when the app opens.

#### Scenario: Settings is not the default screen
- **WHEN** the app is opened from a cold start
- **THEN** the settings screen is not shown; the quick-entry screen is shown instead

#### Scenario: Settings is reachable with one navigation action
- **WHEN** the user is on the quick-entry screen
- **THEN** a single navigation action (e.g. a settings icon/button) takes them to the settings screen

### Requirement: The reminder schedule is configurable
The system SHALL let the user configure, on the settings screen: whether hourly reminders are enabled, the reminder window's start time, the reminder window's end time, and whether reminders are restricted to weekdays only.

#### Scenario: Toggling reminders on/off takes effect immediately
- **WHEN** the user changes the hourly-reminder enabled setting and the change is saved
- **THEN** the reminder schedule behavior described in [[android-reminder-scheduling]] reflects the new setting without requiring an app restart

#### Scenario: Changing the time window reschedules future reminders
- **WHEN** the user changes the reminder start time or end time and saves
- **THEN** subsequently computed reminder slots use the new start/end time, and any already-scheduled notification outside the new window is not delivered

#### Scenario: Changing weekdays-only takes effect for the next eligible day
- **WHEN** the user changes the "weekdays only" setting and saves
- **THEN** day-eligibility for reminders (as defined in [[android-reminder-scheduling]]) reflects the new setting from that point forward

### Requirement: The daily hydration goal is configurable in liters
The system SHALL let the user configure the daily hydration goal, in liters, on the settings screen, accepting positive values and falling back to the default of 2 liters if an invalid value is entered.

#### Scenario: Valid goal is saved and applied
- **WHEN** the user enters a valid positive number of liters and saves
- **THEN** the hydration goal used by [[android-hydration-tracking]] is updated to that value

#### Scenario: Invalid goal input falls back to the default
- **WHEN** the user enters a non-numeric or non-positive value for the hydration goal and saves
- **THEN** the saved hydration goal falls back to the default of 2 liters rather than saving an invalid value

### Requirement: Notification tone/vibration is configurable with a test action
The system SHALL let the user enable or disable the reminder tone/vibration on the settings screen, and SHALL provide a "test" action that plays the current tone/vibration configuration on demand, disabled when the tone setting is off.

#### Scenario: Test action is unavailable when tone is disabled
- **WHEN** the tone/vibration setting is disabled
- **THEN** the "test" action is shown as disabled and cannot be triggered

#### Scenario: Test action plays the tone when enabled
- **WHEN** the tone/vibration setting is enabled and the user triggers "test"
- **THEN** the configured tone and/or vibration plays immediately, per [[android-reminder-scheduling]]'s test-tone requirement

### Requirement: The export location is configurable
The system SHALL let the user configure or choose the destination for CSV export (e.g. a storage location or default share target), replacing the web app's free-text filesystem-path field with an Android-appropriate storage location selection.

#### Scenario: User can choose an export destination
- **WHEN** the user opens the export location setting
- **THEN** the system presents an Android-native way to choose a storage destination (e.g. a document picker), not a free-text filesystem path field

#### Scenario: Configured destination is used by export
- **WHEN** the user has configured an export destination and later triggers CSV export per [[android-csv-import-export]]
- **THEN** the export flow uses or defaults to that configured destination

### Requirement: Settings changes are explicitly saved and confirmed
The system SHALL require an explicit save action to persist settings changes (not save on every keystroke/toggle), and SHALL show the user a clear confirmation when settings have been saved successfully, or an error state if saving fails.

#### Scenario: Unsaved changes are not applied
- **WHEN** the user changes a settings value but navigates away without saving
- **THEN** the previously saved settings remain in effect, not the unsaved changes

#### Scenario: Successful save is confirmed
- **WHEN** the user triggers the save action and it succeeds
- **THEN** the system shows a clear success confirmation to the user

#### Scenario: Failed save is shown as an error
- **WHEN** the user triggers the save action and it fails (e.g. a local storage error)
- **THEN** the system shows an error state and the previously saved settings remain in effect
