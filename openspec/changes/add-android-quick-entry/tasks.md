## 1. Data layer (Room)

- [x] 1.1 Define the Room entity and DAO for movement activity entries, matching the CSV-compatible field set from design.md (D7, see `add-android-csv-import-export`), and verify with a unit test that insert/query round-trips all fields — `MovementEntry`/`MovementEntryDao`/`AppDatabase`, verified by `MovementEntryDaoTest` (Robolectric, JVM)

## 2. Quick-entry screen (default screen)

- [x] 2.1 Build the quick-entry Compose screen as the app's start destination, reachable from cold start, launcher icon, and tapping a reminder notification; verify manually that all three entry points land on quick-entry — `QuickEntryScreen` wired as `MainActivity`'s only content (cold start and launcher icon path); notification-tap entry point does not exist yet (no notifications implemented — out of scope, owned by `add-android-reminder-scheduling`); on-device manual confirmation still outstanding (no emulator in this devcontainer)
- [x] 2.2 Implement the 5-option activity level selector (2-row grid per design.md D8) defaulting to value 1, and verify a Compose UI test confirms default selection and that tapping another option changes selection — `ActivityLevelSelector`, verified by `ActivityLevelSelectorTest`
- [x] 2.3 Implement the free-text note field (optional, cleared after save) and the save action that creates an entry classified by the current slot's authoritative status (primary vs. additional), per `android-quick-entry`; verify a unit/integration test for both the "first save" and "second save for already-answered slot" scenarios — depends on `add-android-reminder-scheduling`'s slot-status computation (task 1.2 there); `QuickEntryViewModel.save()`, verified by `QuickEntryViewModelTest`
- [x] 2.4 Implement the current-slot-time display (or "no active reminder" state) on the quick-entry screen, and verify manually for both the enabled/eligible and disabled/ineligible cases — `QuickEntryScreen`'s slot label + `currentSlotInstant()` (default reminder window, since settings storage from `add-android-settings-configuration` doesn't exist yet), verified by `QuickEntryScreenTest`/`CurrentSlotTest`; on-device manual confirmation still outstanding
- [ ] 2.5 Verify the full quick-entry screen fits without scrolling on the reference device profile (411dp × 891dp) and on a smaller reference (~360dp × 640dp), per `android-quick-entry`'s one-screen requirement — capture screenshots at both sizes as the verification artifact — not verifiable in this devcontainer (no emulator/device)
- [x] 2.6 Implement error handling for a failed save (error state shown, note field preserved, not cleared), and verify with a unit/integration test that simulates a storage failure — verified by `QuickEntrySaveFailureTest`

## 3. Cross-cutting verification

- [ ] 3.1 Run a full manual pass of the `android-quick-entry` capability spec against a physical or emulated device, checking every scenario listed in the spec file — not verifiable in this devcontainer (no emulator/device)
