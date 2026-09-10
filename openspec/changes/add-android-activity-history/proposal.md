## Why

The existing web app's recent-activity list only runs on a workstation browser. This change specifies the same chronological activity-history list as an on-device Android capability, showing enough detail per entry (date, planned time, delay, value, description/note, type) to review what was logged, without requiring every entry to be visible at once, backed by local Room queries.

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup must land first), `add-android-reminder-scheduling` (excludes `Unanswered`-status entries from the list per the authoritative slot-status enum), `add-android-quick-entry` (consumes the movement entry Room entity/DAO defined there).
Consumed by: none.

## What Changes

- A chronological list shows the user's most recent logged activity entries, each with date, planned (slot) time, response delay (or an explicit "none" indicator), activity value, description/note, and type classification (primary/additional/unanswered).
- Entries with `Unanswered` status are excluded from this scrollable list — since no activity was actually logged for them — while still counting toward the day/week statistics in `android-day-week-evaluation`.
- The list initially shows the 5 most recent entries, expandable to a bounded maximum with one action, and collapsible back to 5 with another.

## Capabilities

### New Capabilities
- `android-activity-history`: The recent-activity list (date, planned time, delay, value, description/note, type) with expand/collapse.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: the activity history Compose list screen, its list-filtering function (excluding `Unanswered`), and expand/collapse state, under `android/`.
- **No shared runtime**: on-device only, no HTTP API, no server.
