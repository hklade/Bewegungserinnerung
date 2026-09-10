## 1. Day/week evaluation

- [ ] 1.1 Implement the day picker limited to today plus the last 13 days with activity, and verify a unit test confirms days without any entries are excluded (except today) — depends on the movement entity/DAO from `add-android-quick-entry` (task 1.1 there)
- [ ] 1.2 Implement per-day stats (answered/primary count, additional count, unanswered count, average delay over answered slots only), and verify unit tests reproduce the three example scenarios in `android-day-week-evaluation` — depends on the slot-status computation from `add-android-reminder-scheduling` (task 1.2 there)
- [ ] 1.3 Implement the hourly bar chart for the selected day (hours-with-entries only) plus its empty-state message, and verify manually with a day that has partial-hour coverage and a day with zero entries
- [ ] 1.4 Implement the 7-day × hourly-slot heatmap (active days only, average-value color intensity, visually distinct empty cells), and verify manually against a dataset with fewer than 7 active days and one with 7+

## 2. Cross-cutting verification

- [ ] 2.1 Run a full manual pass of the `android-day-week-evaluation` capability spec against a physical or emulated device, checking every scenario listed in the spec file
