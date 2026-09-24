## ADDED Requirements

### Requirement: The current time is shown next to the reminder slot indicator
The system SHALL display the current local time, formatted as `HH:mm` in the device's current time zone and labelled "Aktuelle Zeit", in the same row as the reminder slot indicator on the quick-entry screen. It SHALL do so whether a reminder slot is active or not, and SHALL keep the displayed time current while the screen is visible, with no user interaction.

#### Scenario: Current time is shown next to an active reminder slot
- **WHEN** the quick-entry screen is displayed while a reminder slot is active (e.g. slot 08:55) and the current local time on the device is 09:12
- **THEN** the screen shows "Nächster Alarm: 08:55" and, in the same row, "Aktuelle Zeit: 09:12"

#### Scenario: Current time is shown when no reminder is active
- **WHEN** the quick-entry screen is displayed while no reminder slot is active
- **THEN** the screen shows "Keine aktive Erinnerung" and, in the same row, the current time as "Aktuelle Zeit: HH:mm"

#### Scenario: Displayed time advances while the screen stays open
- **WHEN** the quick-entry screen is visible showing "Aktuelle Zeit: 09:12" and the clock passes 09:13:00
- **THEN** the screen shows "Aktuelle Zeit: 09:13" without the user interacting with the screen or reopening the app

#### Scenario: Time follows the device's time zone
- **WHEN** the current instant is 2026-09-10T07:12:00Z and the device's time zone is `Europe/Vienna`
- **THEN** the screen shows "Aktuelle Zeit: 09:12"

#### Scenario: Time follows a device time zone other than Vienna
- **WHEN** the current instant is 2026-09-10T07:12:00Z and the device's time zone is `America/New_York`
- **THEN** the screen shows "Aktuelle Zeit: 03:12", not the Europe/Vienna rendering

#### Scenario: Adding the time keeps the screen scroll-free
- **WHEN** the quick-entry screen is displayed on the reference device profile in portrait orientation at default font scale
- **THEN** the current time, the reminder slot indicator, the activity level options, the note field and the save button are all visible without scrolling
