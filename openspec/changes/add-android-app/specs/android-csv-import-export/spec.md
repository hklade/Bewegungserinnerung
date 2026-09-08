## Purpose

Lets the user move their movement activity data out of and into the app as CSV, using a schema compatible with the existing web app's export/import format, so history can be carried over without a manual conversion step.

## ADDED Requirements

### Requirement: Movement activity data can be exported as CSV
The system SHALL let the user export all of their logged movement activity entries as a single CSV file, using the same column set and semicolon-delimited convention as the existing web app's export (`id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at`), and SHALL let the user save or share that file via the Android system share/save mechanism.

#### Scenario: Export produces a complete CSV
- **WHEN** the user triggers "export CSV data"
- **THEN** the system produces a CSV file containing every logged movement activity entry, using the specified column set and delimiter

#### Scenario: Export offers a system save/share action
- **WHEN** the CSV export completes
- **THEN** the user is presented with the Android system's share or save-to-storage flow for the resulting file, rather than the file being silently written somewhere invisible to the user

### Requirement: Hydration data is not part of the movement CSV export
The system SHALL exclude hydration log entries from the movement activity CSV export, consistent with hydration and movement entries being tracked as separate data.

#### Scenario: Exported CSV contains no hydration rows
- **WHEN** the user exports movement activity data
- **THEN** the resulting CSV file contains only movement activity entries, no hydration log entries

### Requirement: Importing a CSV file fully replaces existing movement activity data
The system SHALL, when the user imports a CSV file, replace all currently stored movement activity entries with the entries parsed from that file — not merge or append — and SHALL require an explicit confirmation from the user before performing this destructive replacement.

#### Scenario: Import requires confirmation before replacing data
- **WHEN** the user selects a CSV file to import
- **THEN** the system shows a confirmation prompt naming the selected file and warning that all current movement activity data will be deleted and replaced, before any data is changed

#### Scenario: Cancelling the confirmation leaves data untouched
- **WHEN** the user cancels the import confirmation prompt
- **THEN** no existing data is modified and no import occurs

#### Scenario: Confirmed import replaces all data
- **WHEN** the user confirms the import
- **THEN** all previously stored movement activity entries are deleted and replaced with the entries parsed from the imported file

### Requirement: Import tolerates minor schema variation and reports what happened
The system SHALL parse an imported CSV file tolerantly (accepting known alternate column names/orders where unambiguous, and defaulting missing optional fields rather than rejecting the whole file), and SHALL report to the user, after import, how many rows were imported and how many rows were skipped or had fields defaulted due to being unparseable.

#### Scenario: File exported by the existing web app imports successfully
- **WHEN** the user imports a CSV file that was exported from the existing web app using its documented column set
- **THEN** every row imports successfully with no skipped rows

#### Scenario: Import reports row-level outcomes
- **WHEN** an import completes, whether or not every row parsed cleanly
- **THEN** the user is shown the total number of rows imported and the number of rows that were skipped or had defaulted fields, rather than only a generic success message

#### Scenario: Unreadable file is rejected before any data is deleted
- **WHEN** the selected file cannot be parsed as CSV at all (e.g. wrong format, unreadable encoding)
- **THEN** the import is aborted with an error shown to the user, and no existing data is deleted

### Requirement: Only files with a CSV extension can be selected for import
The system SHALL restrict the file selection step for import to files with a `.csv` extension (or recognized CSV MIME type), rejecting other file types before the confirmation step.

#### Scenario: Non-CSV file selection is rejected
- **WHEN** the user attempts to select a file without a `.csv` extension for import
- **THEN** the system shows an error indicating a CSV file must be selected, and the import confirmation step is not reached
