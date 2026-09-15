package com.bewegungserinnerung.app.reminder

/**
 * Built-in reminder configuration, used until `add-android-settings-configuration`'s settings
 * row exists. Every consumer of these values (scheduling, backfill, countdown) reads them from
 * here so that wiring in real settings later only means changing this one place.
 */
object ReminderDefaults {
    const val REMINDERS_ENABLED = true
    const val WEEKDAYS_ONLY = true
    const val START_TIME = "07:55"
    const val END_TIME = "16:55"
    const val TONE_ENABLED = true
}
