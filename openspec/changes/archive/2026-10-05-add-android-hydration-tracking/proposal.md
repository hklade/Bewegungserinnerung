## Why

The existing web app's "Trinkmanager" hydration tracker only exists as a browser widget on a workstation. This change specifies the same daily-hydration-goal tracking as an on-device Android capability: fixed 250 ml increment/decrement logging, a proportional progress display, and an overflow indicator when the goal is exceeded, backed by local Room storage instead of a server CSV file.

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup must land first), `add-android-settings-configuration` (the daily hydration goal value is configured there).
Consumed by: `add-android-day-week-evaluation` (not directly — hydration and movement stats are tracked separately; no cross-capability data dependency beyond the shared settings row).

## What Changes

- All persistence moves from a server-side CSV file (`Trinkdaten.csv`) to on-device local storage (Room); CSV is not part of this capability's live storage.
- The daily hydration goal is configurable in liters (default 2 L / 2000 ml when never configured).
- Hydration intake is logged in fixed +250 ml / -250 ml increments, with the logged amount floored at 0 ml (decrement disabled at zero).
- Progress is shown against the configured daily goal with a proportional visual indicator, updating immediately after logging.
- Exceeding the daily goal is visually distinguished with a distinct overflow indicator rather than clipping the display at the goal.
- A failed persist rolls back the optimistically-shown amount rather than leaving an unsaved value displayed.

## Capabilities

### New Capabilities
- `android-hydration-tracking`: The "Trinkmanager" daily hydration goal, +250 ml/-250 ml logging, and progress/overflow display.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: the hydration Room entity/DAO, the hydration card/screen, and its increment/decrement/rollback logic, under `android/`.
- **Data layer**: this capability's task list includes defining the Room entity/DAO for hydration log entries (timestamp + absolute daily ml amount, where "today's total" is the latest entry for the day, not a sum).
- **No shared runtime**: on-device only, no HTTP API, no server.
