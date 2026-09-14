package com.bewegungserinnerung.app.reminder

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.bewegungserinnerung.app.data.AppDatabase
import java.time.Instant

/**
 * Runs the unified backfill rule (D6) and re-arms the next reminder alarm. Scheduled
 * periodically by [ReminderScheduler] and also triggered right after each alarm fires, so it is
 * the single place backfill runs from — never as a side effect of a UI read (see
 * `android-reminder-scheduling`'s "Backfill runs on a schedule, not on read" scenario).
 */
class ReminderBackfillWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val dao = AppDatabase.getInstance(applicationContext).movementEntryDao()

        runBackfill(
            dao = dao,
            now = Instant.now(),
            remindersEnabled = ReminderDefaults.REMINDERS_ENABLED,
            weekdaysOnly = ReminderDefaults.WEEKDAYS_ONLY,
            startTime = ReminderDefaults.START_TIME,
            endTime = ReminderDefaults.END_TIME,
        )

        ReminderScheduler.scheduleNextAlarm(applicationContext)

        return Result.success()
    }
}
