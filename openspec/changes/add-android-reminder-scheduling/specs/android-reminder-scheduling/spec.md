## Purpose

Schedules hourly movement reminders on-device between a configurable time window, fires native notifications with sound/vibration, tracks each reminder slot's answer status, and backfills slots that went unanswered — all as a single, deterministic on-device mechanism with no server counterpart.

## ADDED Requirements

### Requirement: Hourly reminder slots are computed from a configurable start and end time
The system SHALL compute one reminder slot per hour between a configurable start time and end time (inclusive), using the same minute-of-hour as the start time for every slot (e.g. a start time of `07:55` and end time of `16:55` yields slots at `07:55, 08:55, ..., 16:55`).

#### Scenario: Default window produces ten slots
- **WHEN** the reminder start time is `07:55` and the end time is `16:55`
- **THEN** the system computes exactly ten slots: `07:55, 08:55, 09:55, 10:55, 11:55, 12:55, 13:55, 14:55, 15:55, 16:55`

#### Scenario: End time earlier than start time falls back to a bounded default window
- **WHEN** the configured end time is earlier than the configured start time
- **THEN** the system computes hourly slots starting from the configured start time up to a fixed fallback end time of `16:00`, rather than producing zero slots or an error

#### Scenario: Unparseable start or end time falls back to the built-in default window
- **WHEN** the configured start time or end time cannot be parsed as a valid `HH:MM` time
- **THEN** the system uses the built-in default slots `07:55, 08:55, 09:55, 10:55, 11:55, 12:55, 13:55, 14:55, 15:55, 16:55`

### Requirement: Reminders are eligible only on configured days
The system SHALL only schedule and fire reminders on days that are eligible under the current "weekdays only" setting: when the setting is enabled, Saturday and Sunday are not eligible; when disabled, every day is eligible.

#### Scenario: Weekday-only enabled skips the weekend
- **WHEN** "weekdays only" is enabled and the current day is a Saturday or Sunday
- **THEN** no reminder notification fires and no new slot is scheduled for that day

#### Scenario: Weekday-only disabled includes weekends
- **WHEN** "weekdays only" is disabled
- **THEN** reminders are scheduled and fire on every day of the week, including Saturday and Sunday

### Requirement: Reminders can be turned off entirely
The system SHALL stop scheduling and firing all reminder notifications when the hourly-reminder setting is turned off, and SHALL resume scheduling from the next eligible slot when it is turned back on.

#### Scenario: Disabling reminders cancels pending alarms
- **WHEN** the user turns off the hourly-reminder setting
- **THEN** no further reminder notification fires until the setting is turned back on

#### Scenario: Re-enabling reminders schedules the next eligible slot
- **WHEN** the user turns the hourly-reminder setting back on
- **THEN** the system schedules a notification for the next eligible slot from the current time onward, without requiring the app to be reopened at exactly that slot's time

### Requirement: A reminder notification fires at each eligible slot time
The system SHALL deliver a native Android notification at each eligible reminder slot's time, including while the app is not in the foreground and the device is in a low-power/idle state, and SHALL do so within a small tolerance of the slot's exact minute rather than only on the next app launch.

#### Scenario: Notification fires while the app is backgrounded
- **WHEN** an eligible reminder slot's time is reached and the app is not currently open
- **THEN** a system notification for that slot is delivered without requiring the user to open the app first

#### Scenario: Notification survives device idle/low-power state
- **WHEN** an eligible reminder slot's time is reached while the device is in a Doze/idle low-power state
- **THEN** the notification is still delivered, at most a few minutes after the exact slot time

#### Scenario: Notification content reflects the slot time
- **WHEN** a reminder notification is delivered for a given slot
- **THEN** the notification text identifies the slot time it corresponds to

### Requirement: Reminder notifications resume after device restart
The system SHALL re-establish its reminder schedule after the device restarts, without requiring the user to open the app first.

#### Scenario: Schedule is re-armed after reboot
- **WHEN** the device restarts while hourly reminders are enabled
- **THEN** the next eligible reminder slot still fires a notification at its scheduled time, without the user having opened the app since the restart

### Requirement: Reminder tone and vibration are configurable and independently testable
The system SHALL play an audible tone and/or vibrate when a reminder notification fires, according to a configurable tone-enabled setting, and SHALL let the user trigger the same tone/vibration on demand from settings without creating a log entry or affecting the reminder schedule.

#### Scenario: Tone enabled plays sound with the notification
- **WHEN** the reminder tone setting is enabled and a reminder notification fires
- **THEN** the device plays an audible tone and/or vibrates alongside the notification

#### Scenario: Tone disabled suppresses sound but still notifies
- **WHEN** the reminder tone setting is disabled and a reminder notification fires
- **THEN** the notification is still delivered, but without an audible tone

#### Scenario: Manual test plays the tone without side effects
- **WHEN** the user triggers "test tone" from the settings screen
- **THEN** the configured tone/vibration plays immediately
- **AND** no activity entry, reminder slot state, or schedule is created or changed as a result

### Requirement: A live countdown to the next eligible reminder is shown in the app
The system SHALL display, while the app is open, the amount of time remaining until the next eligible reminder slot, or an explicit "reminders off" state when hourly reminders are disabled.

#### Scenario: Countdown reflects the next eligible slot
- **WHEN** the app is open, hourly reminders are enabled, and the current day is eligible
- **THEN** the displayed countdown reflects the time remaining until the next eligible reminder slot, updating at least once per minute

#### Scenario: Countdown shows a disabled state
- **WHEN** hourly reminders are turned off
- **THEN** the app displays an explicit indication that reminders are disabled instead of a numeric countdown

#### Scenario: Countdown skips ineligible days
- **WHEN** "weekdays only" is enabled and the current day is a weekend
- **THEN** the countdown reflects the next eligible slot on the next weekday, not a weekend slot

### Requirement: Each reminder slot has exactly one authoritative answer status
For any given day and reminder slot, the system SHALL derive exactly one authoritative status — `Pending` (slot time not yet reached), `Unanswered` (slot time has passed with no entry logged for it), `Answered` (exactly one entry has been logged against the slot), or `AnsweredWithExtra` (an entry already exists for the slot and at least one additional entry has since been logged while it remains the current slot) — computed by a single shared mechanism, not independently by more than one part of the system.

#### Scenario: Slot with no entry after its time has passed is Unanswered
- **WHEN** a reminder slot's time has passed by more than 59 minutes and no entry has been logged against it
- **THEN** the slot's status is `Unanswered`

#### Scenario: First entry against a slot marks it Answered
- **WHEN** the user logs an activity entry while a given slot is the current slot and no entry exists yet for that slot
- **THEN** the slot's status becomes `Answered` and the new entry is recorded as the slot's primary answer, not as an additional/extra entry

#### Scenario: A second entry against an already-answered current slot marks it AnsweredWithExtra
- **WHEN** the user logs another activity entry while the current slot already has status `Answered`
- **THEN** the slot's status becomes `AnsweredWithExtra` and the new entry is recorded as an additional/extra entry, distinct from the slot's primary answer

#### Scenario: Status computation is single-sourced
- **WHEN** any screen (quick-entry, activity history, day/week evaluation) needs to know a slot's answer status
- **THEN** it reads the same computed status rather than deriving it independently through its own logic

### Requirement: Unanswered slots are backfilled by a single, deterministic rule
The system SHALL create a persisted `Unanswered` record for a reminder slot once that slot's time is more than 59 minutes in the past and no entry has been logged for it, evaluated by exactly one background mechanism on a regular schedule, and SHALL NOT create such records as a side effect of the user merely viewing data (e.g. opening the quick-entry, history, or evaluation screens).

#### Scenario: Backfill runs on a schedule, not on read
- **WHEN** the user opens the app and views today's stats or activity history
- **THEN** viewing that data does not itself create, modify, or delete any backfill record

#### Scenario: Slot backfilled once eligibility window has passed
- **WHEN** a background schedule check runs and finds a reminder slot whose time is more than 59 minutes in the past with no logged entry
- **THEN** the system creates exactly one `Unanswered` record for that slot, and does not create a duplicate on a later check of the same slot

#### Scenario: Backfill respects reminders-off and weekend exclusion
- **WHEN** hourly reminders are disabled, or the current day is excluded by "weekdays only"
- **THEN** no `Unanswered` backfill record is created for that day
