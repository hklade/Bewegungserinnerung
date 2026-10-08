## MODIFIED Requirements

### Requirement: The daily hydration goal is configurable in liters
The system SHALL let the user configure the daily hydration goal, in liters, on the settings screen, accepting positive values and falling back to the default of 2 liters if an invalid value is entered. The goal SHALL be edited in a single row that shows the label "Tagesziel in Litern, Standard 2 Liter" next to a compact input; no additional hint or supporting line SHALL be shown below the input.

#### Scenario: Valid goal is saved and applied
- **WHEN** the user enters a valid positive number of liters and saves
- **THEN** the hydration goal used by [[android-hydration-tracking]] is updated to that value

#### Scenario: Invalid goal input falls back to the default
- **WHEN** the user enters a non-numeric or non-positive value for the hydration goal and saves
- **THEN** the saved hydration goal falls back to the default of 2 liters rather than saving an invalid value

#### Scenario: Goal is edited on one row
- **WHEN** the Optionen screen is displayed
- **THEN** the label "Tagesziel in Litern, Standard 2 Liter" and the goal input appear on the same row, and no text line appears below the input

## ADDED Requirements

### Requirement: The Optionen screen fits on one screen
The system SHALL lay out the Optionen screen so that all its cards and the "Speichern" action are visible without scrolling on the reference device profile (412 × 892 dp, the same profile used by [[android-quick-entry]]) in portrait orientation at the default font scale; on smaller screens the screen SHALL remain scrollable so no control becomes unreachable. To achieve this, regular text on the Optionen screen SHALL use the size that the card headings used before this change (14 sp), card headings SHALL be 2 sp larger than regular text (16 sp), and the on/off switches SHALL be rendered smaller than the platform's default switch (about 80 % of its size), taking correspondingly less space in the layout.

#### Scenario: Everything visible without scrolling on the reference device
- **WHEN** the Optionen screen is displayed on the reference device profile in portrait orientation at default font scale
- **THEN** every card and the "Speichern" button are visible without scrolling

#### Scenario: Headings are larger than body text
- **WHEN** the Optionen screen is displayed
- **THEN** regular labels are rendered at 14 sp and card headings at 16 sp

#### Scenario: Switches are smaller than the default
- **WHEN** the Optionen screen is displayed
- **THEN** each on/off switch occupies less width and height than a default-sized platform switch, and still toggles its setting when tapped

#### Scenario: Smaller screens can still reach every control
- **WHEN** the Optionen screen is displayed on a device smaller than the reference profile
- **THEN** the screen can be scrolled so that every control and the "Speichern" button remain reachable

## REMOVED Requirements

### Requirement: The export location is configurable
**Reason**: The Optionen screen should fit on one screen; the export-location card is the least-used setting and is dropped from it.
**Migration**: The stored value is no longer read or shown. Any CSV export (see the open `add-android-csv-import-export` change) uses the system save dialog / Downloads instead of a preconfigured location.
