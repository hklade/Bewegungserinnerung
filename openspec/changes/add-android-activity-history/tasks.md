## 1. Activity history

- [x] 1.1 Implement the activity history list showing date/planned time/delay/value/description/type per row, including `Unanswered`-status entries as ordinary rows, and verify a unit test confirms unanswered slots appear in the list and are present in day/week counts — depends on the movement entity/DAO from `add-android-quick-entry` (task 1.1 there) and the slot-status computation from `add-android-reminder-scheduling` (task 1.2 there)
- [x] 1.2 Implement the default 5-row view with expand/collapse to a bounded maximum, and verify a Compose UI test covers expand and collapse actions
- [x] 1.3 Replace the first line's date with "Heute"/"Gestern" (Europe/Vienna calendar day, falling back to dd.MM.yyyy otherwise) and render the description/note in bold, and verify a Compose UI test covers: today's entry, yesterday's entry, an older entry, and bold styling of the description/note

## 2. Wiring

- [ ] 2.1 Show the activity history list on the main screen, sourced from `MovementEntryDao.observeAll()` mapped via `toActivityHistory`, and verify a Compose UI test confirms a newly saved entry appears in the visible list without restarting the app

## 3. Cross-cutting verification

- [ ] 3.1 Run a full manual pass of the `android-activity-history` capability spec against a physical or emulated device, checking every scenario listed in the spec file
