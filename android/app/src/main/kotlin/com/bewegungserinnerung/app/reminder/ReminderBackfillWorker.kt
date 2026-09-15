package com.bewegungserinnerung.app.reminder

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.MovementEntryDao
import java.time.Instant

/**
 * Runs the unified backfill rule (D6) and re-arms the next reminder alarm. Scheduled
 * periodically by [ReminderScheduler] and also triggered right after each alarm fires, so it is
 * the single place backfill runs from — never as a side effect of a UI read (see
 * `android-reminder-scheduling`'s "Backfill runs on a schedule, not on read" scenario).
 *
 * WorkManager's default `WorkerFactory` instantiates this via reflection on the exact
 * `(Context, WorkerParameters)` constructor, so the DAO can't be a constructor parameter the
 * way it is for [QuickEntryViewModel][com.bewegungserinnerung.app.ui.quickentry.QuickEntryViewModel].
 * [movementEntryDao] is `internal open` instead, purely so a test can override it with an
 * in-memory DAO — production code always uses the default (the shared [AppDatabase] singleton).
 */
open class ReminderBackfillWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    internal open fun movementEntryDao(): MovementEntryDao =
        AppDatabase.getInstance(applicationContext).movementEntryDao()

    override suspend fun doWork(): Result {
        runBackfill(
            dao = movementEntryDao(),
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
