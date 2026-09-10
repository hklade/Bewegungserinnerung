## 1. Activity history

- [ ] 1.1 Implement the activity history list showing date/planned time/delay/value/description/type per row, excluding `Unanswered`-status entries, and verify a unit test confirms unanswered slots are excluded from the list but present in day/week counts — depends on the movement entity/DAO from `add-android-quick-entry` (task 1.1 there) and the slot-status computation from `add-android-reminder-scheduling` (task 1.2 there)
- [ ] 1.2 Implement the default 5-row view with expand/collapse to a bounded maximum, and verify a Compose UI test covers expand and collapse actions

## 2. Cross-cutting verification

- [ ] 2.1 Run a full manual pass of the `android-activity-history` capability spec against a physical or emulated device, checking every scenario listed in the spec file
