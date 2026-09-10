## Why

The existing web app's day/week evaluation views (per-day stats, hourly bar chart, 7-day heatmap) only run on a workstation browser. This change specifies the same aggregated-activity views as an on-device Android capability, so patterns of missed or completed reminders remain visible at a glance, backed by local Room queries instead of server-computed dashboard payloads.

## Dependencies

Depends on: `add-android-ci-pipeline` (project setup must land first), `add-android-reminder-scheduling` (per-day stats and the heatmap derive from the authoritative slot-status enum and the configured start/end time), `add-android-quick-entry` (consumes the movement entry Room entity/DAO defined there).
Consumed by: none.

## What Changes

- A day picker lets the user choose among today and the last 13 days that have at least one logged activity entry (today is always selectable, even if empty).
- Per-day statistics summarize answered (primary vs. additional/extra) and unanswered reminder slots, and the average response delay computed only over answered slots.
- An hourly bar chart shows the selected day's activity level, displaying only hours that have entries, with an explicit empty-state message for a day with none.
- A 7-day x hourly-slot heatmap shows activity across the most recent 7 active days, with cell color intensity reflecting average activity value and empty day/hour combinations visually distinct from data cells.
- All of this reads from on-device Room queries; no server-computed dashboard payload is involved.

## Capabilities

### New Capabilities
- `android-day-week-evaluation`: Day picker (last 14 active days) with per-day stats and hourly bar chart, plus the 7-day x hourly-slot heatmap.

### Modified Capabilities
_None._ This is a new, additive capability; no existing spec is altered.

## Impact

- **New code**: the day-picker, per-day stats, bar-chart, and heatmap Compose screens/components (heatmap and bar chart use Compose `Canvas` custom drawing per design.md D1), under `android/`.
- **No shared runtime**: on-device only, no HTTP API, no server.
