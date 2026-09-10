**Optional:** this capability (`android-csv-import-export`) is not required for the app to be usable end-to-end on-device — quick-entry, reminders, hydration, and evaluation all work fully without it. It exists only to carry historical data over from the existing web app or to back up/restore local data. Implement after the other `add-android-*` capabilities are done, or defer entirely to a follow-up if time is constrained.

## 1. CSV import/export

- [ ] 1.1 Implement CSV export of movement activity entries using the compatible column set/delimiter from design.md (D7), excluding hydration data, and verify a unit test round-trips a known entry set into the expected CSV text — depends on the movement entity/DAO from `add-android-quick-entry` (task 1.1 there)
- [ ] 1.2 Wire export to the Android system share/save flow (SAF and/or Share intent), using the export-location setting from `add-android-settings-configuration` (task 9.5 there) as the default destination, and verify manually that the resulting file can be opened/shared
- [ ] 1.3 Implement the `.csv`-extension file-selection restriction for import, and verify a unit test rejects a non-CSV file before any confirmation step
- [ ] 1.4 Implement the destructive-import confirmation dialog (naming the file, warning of full replacement) and the full-replace import logic, and verify unit/integration tests for: confirm-replaces-all, cancel-changes-nothing
- [ ] 1.5 Implement tolerant CSV parsing (alternate column names, defaulted missing fields) and the post-import row-count/skipped-row report, and verify with a test importing a CSV exported by the existing web app (`data/Bewegungsdaten.csv` schema) and confirming zero skipped rows
- [ ] 1.6 Implement rejection of unreadable/unparseable files before any existing data is deleted, and verify a test confirms existing data is untouched after a failed import attempt

## 2. Cross-cutting verification

- [ ] 2.1 Run a full manual pass of the `android-csv-import-export` capability spec against a physical or emulated device, checking every scenario listed in the spec file
