## MODIFIED Requirements

### Requirement: Hydration progress is shown against the daily goal
The system SHALL display today's logged hydration amount alongside the configured daily goal, in a way that visually communicates progress toward the goal. The progress indicator SHALL be a segmented bar with one segment per 250 ml of the goal (rounded up for goals that are not a multiple of 250 ml), separated by a small visible gap, where one segment is filled per full 250 ml logged. For goals above 5 liters the bar SHALL be capped at 20 segments, each then representing an equal share of the goal, filled in proportion to the logged amount. The bar SHALL be noticeably thicker than a standard thin progress line (at least 12 dp high on the reference device).

#### Scenario: Progress display reflects current amount and goal
- **WHEN** the hydration screen or widget is displayed
- **THEN** it shows today's logged amount in ml and the configured goal in ml (or liters), together with a proportional visual progress indicator

#### Scenario: Progress display updates immediately after logging
- **WHEN** the user logs a +250 ml or −250 ml change
- **THEN** the progress display reflects the new amount without requiring a manual refresh

#### Scenario: One segment per 250 ml of the goal
- **WHEN** the goal is 2 liters and 500 ml have been logged today
- **THEN** the bar shows 8 segments separated by gaps, of which the first 2 are filled

#### Scenario: Goal not divisible by 250 ml
- **WHEN** the goal is 2.1 liters
- **THEN** the bar shows 9 segments

#### Scenario: Very large goal is capped at 20 segments
- **WHEN** the goal is 8 liters and 2 liters have been logged today
- **THEN** the bar shows 20 segments, of which the first 5 are filled
