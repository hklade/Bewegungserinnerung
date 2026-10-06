package com.bewegungserinnerung.app.reminder

/**
 * Built-in reminder configuration: the defaults of the settings row ([AppSettings][com.bewegungserinnerung.app.data.AppSettings])
 * before the user first saves. Consumers read the settings row, never these constants directly.
 */
object ReminderDefaults {
    const val REMINDERS_ENABLED = true
    const val WEEKDAYS_ONLY = true
    const val START_TIME = "07:55"
    const val END_TIME = "16:55"
    const val TONE_ENABLED = true
    val TONE_SEQUENCE = ToneSequence.Aufwaerts
}
