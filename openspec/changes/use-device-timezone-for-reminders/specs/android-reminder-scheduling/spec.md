## ADDED Requirements

### Requirement: Reminder times follow the device's current time zone
The system SHALL interpret every reminder slot time as a wall-clock time in the device's current time zone. This applies when:
- computing slots and weekday eligibility;
- scheduling alarms;
- showing slot times in notifications, the "Nächster Alarm" indicator and the countdown;
- writing the `date`, `weekday` and `reminderTime` fields of new movement entries, including backfilled `Unanswered` records.

It SHALL NOT rewrite entries that were already stored. When the device's time zone or system clock changes, the system SHALL re-arm the next pending alarm for the next eligible slot in the new zone, without the user opening the app.

#### Scenario: Slots ring at local wall-clock time outside Vienna
- **WHEN** the device's time zone is `America/New_York` and the reminder window is `07:55`–`16:55`
- **THEN** the first reminder of an eligible day fires at 07:55 New York time, not at 07:55 Europe/Vienna time

#### Scenario: Displayed slot time matches the device clock
- **WHEN** the device's time zone is `America/New_York` and the current slot is the one at 08:55 New York time
- **THEN** the notification text and the quick-entry indicator show `08:55` ("Nächster Alarm: 08:55")

#### Scenario: New entries store device-zone wall-clock fields
- **WHEN** the user saves an entry for the 08:55 slot while the device's time zone is `America/New_York`
- **THEN** the stored entry has `reminderTime` `08:55`, and its `date` and `weekday` are the New York calendar day

#### Scenario: Weekday eligibility uses the device's calendar day
- **WHEN** "weekdays only" is enabled and it is Saturday in the device's time zone but still Friday in Europe/Vienna
- **THEN** no reminder fires, because the device's local day is a Saturday

#### Scenario: Time zone change re-arms the next alarm
- **WHEN** hourly reminders are enabled and the device's time zone changes from `Europe/Vienna` to `America/New_York` while the app is not open
- **THEN** the pending alarm is replaced by one for the next eligible slot in New York time, and no alarm fires at the old Vienna-based instant

#### Scenario: Existing entries are not rewritten after a zone change
- **WHEN** entries were stored while the device was in `Europe/Vienna` and the device's time zone then changes
- **THEN** those entries keep their stored `date`, `weekday` and `reminderTime` values unchanged
