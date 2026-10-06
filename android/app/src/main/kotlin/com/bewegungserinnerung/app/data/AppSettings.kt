package com.bewegungserinnerung.app.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.bewegungserinnerung.app.reminder.ReminderDefaults
import com.bewegungserinnerung.app.reminder.ToneSequence

const val DEFAULT_HYDRATION_GOAL_ML = 2000

/**
 * The app's single settings row (D3). Every field defaults to the built-in configuration, so a
 * fresh install — where no row has been saved yet — behaves exactly like `AppSettings()`.
 */
@Entity(tableName = "settings")
data class AppSettings(
    @PrimaryKey
    val id: Int = SINGLE_ROW_ID,
    @ColumnInfo(name = "reminders_enabled")
    val remindersEnabled: Boolean = ReminderDefaults.REMINDERS_ENABLED,
    @ColumnInfo(name = "start_time")
    val startTime: String = ReminderDefaults.START_TIME,
    @ColumnInfo(name = "end_time")
    val endTime: String = ReminderDefaults.END_TIME,
    @ColumnInfo(name = "weekdays_only")
    val weekdaysOnly: Boolean = ReminderDefaults.WEEKDAYS_ONLY,
    @ColumnInfo(name = "hydration_goal_ml")
    val hydrationGoalMl: Int = DEFAULT_HYDRATION_GOAL_ML,
    @ColumnInfo(name = "tone_enabled")
    val toneEnabled: Boolean = ReminderDefaults.TONE_ENABLED,
    @ColumnInfo(name = "tone_sequence")
    val toneSequence: ToneSequence = ReminderDefaults.TONE_SEQUENCE,
    @ColumnInfo(name = "export_location_uri")
    val exportLocationUri: String? = null,
    @ColumnInfo(name = "hide_missed_reminders")
    val hideMissedReminders: Boolean = false,
) {
    companion object {
        const val SINGLE_ROW_ID = 0
    }
}
