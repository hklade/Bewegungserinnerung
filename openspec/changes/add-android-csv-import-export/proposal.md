## Why

CSV import/export is retained as the interchange format so a user can carry existing history from the web app onto the Android app, or back up/restore local data, but the transport mechanism must change from browser download/file-input to Android's Storage Access Framework (SAF) and Share intents. This change specifies that on-device import/export capability. It is **optional**: not required for the app to be usable end-to-end — quick-entry, reminders, hydration, and evaluation all work fully without it (see tasks.md).

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup must land first), `add-android-quick-entry` (consumes the movement entry Room entity/DAO defined there — import/export operates on that same entity), `add-android-settings-configuration` (uses the configured export-location setting as the default export destination).
Consumed by: none.

## What Changes

- CSV export produces a single file of all logged movement activity entries, using the same column set and semicolon-delimited convention as the existing web app's export (`id;date;weekday;reminder_time;response_time;delay_minutes;value;description;duration_minutes;is_additional_break;entry_type;note;created_at`), excluding hydration data.
- Export is offered via the Android system share/save flow (SAF and/or Share intent) rather than a browser download.
- Import fully replaces existing movement activity data (not merge/append) and requires an explicit destructive-action confirmation naming the file before any data is changed; cancelling leaves data untouched.
- Import is restricted to `.csv`-extension files, parses tolerantly (alternate column names, defaulted missing fields), and reports a row-count/skipped-row summary after import rather than only a generic success message.
- An unreadable/unparseable file is rejected before any existing data is deleted.

## Capabilities

### New Capabilities
- `android-csv-import-export` (optional): CSV export via Share/SAF and full-replace CSV import with a destructive-action confirmation, using the same CSV schema as the web app where practical. Not required for the app to be usable end-to-end — only for carrying data over from the web app or backing up/restoring locally.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: CSV export/import logic (schema-compatible serialization, tolerant parsing, row-count reporting) and the SAF/Share integration, under `android/`.
- **Data compatibility**: CSV files produced by the existing web app should remain importable by this capability (same delimiter/column conventions), so a user can carry existing history over; this is a design constraint, not a live sync between the two apps.
- **No shared runtime**: on-device only, no HTTP API, no server.
