## Purpose

Tracks daily fluid intake ("Trinkmanager") against a configurable daily goal, letting the user log intake in fixed increments and see progress, including when the goal is exceeded.

## ADDED Requirements

### Requirement: Daily hydration goal is configurable in liters
The system SHALL let the user configure a daily hydration goal in liters (a positive number), and SHALL use a built-in default of 2 liters when no value has been configured yet.

#### Scenario: Default goal applies before any configuration
- **WHEN** the app has never had a hydration goal configured
- **THEN** the daily hydration goal is 2 liters (2000 ml)

#### Scenario: Configured goal is used for progress calculations
- **WHEN** the user sets the daily hydration goal to a specific value in settings
- **THEN** all hydration progress displays use that configured value as the goal

### Requirement: Hydration intake is logged in fixed 250 ml increments
The system SHALL let the user increase today's logged hydration amount by 250 ml with one action, and decrease it by 250 ml with another action, and SHALL prevent the logged amount from going below 0 ml.

#### Scenario: Adding 250 ml increases today's total
- **WHEN** the user taps the "+250 ml" action
- **THEN** today's logged hydration amount increases by 250 ml and the new total is persisted

#### Scenario: Removing 250 ml decreases today's total
- **WHEN** the user taps the "−250 ml" action and today's logged amount is at least 250 ml
- **THEN** today's logged hydration amount decreases by 250 ml and the new total is persisted

#### Scenario: Removing 250 ml is unavailable at zero
- **WHEN** today's logged hydration amount is 0 ml
- **THEN** the "−250 ml" action is disabled and cannot reduce the amount below 0 ml

### Requirement: Hydration progress is shown against the daily goal
The system SHALL display today's logged hydration amount alongside the configured daily goal, in a way that visually communicates progress toward the goal.

#### Scenario: Progress display reflects current amount and goal
- **WHEN** the hydration screen or widget is displayed
- **THEN** it shows today's logged amount in ml and the configured goal in ml (or liters), together with a proportional visual progress indicator

#### Scenario: Progress display updates immediately after logging
- **WHEN** the user logs a +250 ml or −250 ml change
- **THEN** the progress display reflects the new amount without requiring a manual refresh

### Requirement: Exceeding the daily goal is visually distinguished
The system SHALL visually distinguish the portion of logged hydration that exceeds the configured daily goal from the portion within the goal, rather than simply capping or clipping the display at the goal amount.

#### Scenario: Amount over goal shows an overflow indicator
- **WHEN** today's logged hydration amount exceeds the configured daily goal
- **THEN** the progress display shows a distinct overflow indicator representing the amount beyond the goal, in addition to the filled indicator for the goal itself

#### Scenario: Amount at or under goal shows no overflow indicator
- **WHEN** today's logged hydration amount is at or below the configured daily goal
- **THEN** no overflow indicator is shown

### Requirement: A hydration log failure does not corrupt today's total
The system SHALL leave today's logged hydration amount unchanged if a +250 ml or −250 ml action fails to persist, rather than showing an amount that was never actually saved.

#### Scenario: Failed persist rolls back the displayed amount
- **WHEN** a +250 ml or −250 ml action is shown optimistically in the UI but fails to persist to storage
- **THEN** the displayed amount reverts to the last successfully persisted value and an error state is shown
