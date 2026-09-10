## 1. Data layer (Room)

- [ ] 1.1 Define the Room entity/DAO for the single settings row (reminder window, weekdays-only, hydration goal, tone enabled, export location), seeded with defaults on first run, and verify a unit test confirms defaults are returned before any explicit save

## 2. Settings screen

- [ ] 2.1 Build the settings screen reachable via one navigation action from quick-entry, and verify manually it is not shown on cold start
- [ ] 2.2 Implement reminder settings (enabled, start time, end time, weekdays-only) with explicit save and immediate effect on scheduling, and verify unit/integration tests for: toggle takes effect without restart, window change reschedules, weekdays-only change takes effect going forward — depends on the reminder-scheduling module from `add-android-reminder-scheduling` (task 2.1/2.3 there)
- [ ] 2.3 Implement the hydration goal input with validation/fallback-to-default, and verify a unit test covers valid input and invalid-input-falls-back-to-2L
- [ ] 2.4 Implement the tone/vibration toggle and its "test" action wiring to the module built in `add-android-reminder-scheduling` (task 2.5 there), and verify the test action is disabled when tone is off
- [ ] 2.5 Implement the export-location picker (Android-native storage/document picker, replacing the web app's free-text path field), and verify manually — this becomes the default destination for the export flow once `add-android-csv-import-export` (task 1.2 there) exists
- [ ] 2.6 Implement explicit save/confirmation/error states for the settings screen (no autosave-on-change), and verify a unit/integration test confirms navigating away without saving leaves prior settings in effect

## 3. Cross-cutting verification

- [ ] 3.1 Run a full manual pass of the `android-settings-configuration` capability spec against a physical or emulated device, checking every scenario listed in the spec file
