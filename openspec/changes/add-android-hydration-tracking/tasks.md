## 1. Data layer (Room)

- [ ] 1.1 Define the Room entity and DAO for hydration log entries (timestamp + absolute daily ml amount), and verify with a unit test that querying "today's total" returns the latest entry for the day, not a sum

## 2. Hydration tracking

- [ ] 2.1 Build the hydration card/screen showing today's logged amount vs. configured goal with a proportional progress indicator, and verify manually against a few sample amounts/goals
- [ ] 2.2 Implement +250 ml / −250 ml actions with optimistic UI update, persistence, and rollback-on-failure, and verify unit tests for: normal increment/decrement, floor-at-zero disabling of decrement, and rollback on simulated failure
- [ ] 2.3 Implement the overflow indicator shown when logged amount exceeds the goal, and verify a Compose UI test confirms the overflow indicator appears only when amount > goal

## 3. Cross-cutting verification

- [ ] 3.1 Run a full manual pass of the `android-hydration-tracking` capability spec against a physical or emulated device, checking every scenario listed in the spec file
