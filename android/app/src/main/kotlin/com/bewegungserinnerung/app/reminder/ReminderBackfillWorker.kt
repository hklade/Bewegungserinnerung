package com.bewegungserinnerung.app.reminder

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.MovementEntryDao
import com.bewegungserinnerung.app.data.SettingsDao
import com.bewegungserinnerung.app.data.currentSettings
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
 * [movementEntryDao]/[settingsDao] are `internal open` instead, purely so a test can override
 * them with in-memory DAOs — production code always uses the default (the shared [AppDatabase] singleton).
 */
open class ReminderBackfillWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    internal open fun movementEntryDao(): MovementEntryDao =
        AppDatabase.getInstance(applicationContext).movementEntryDao()

    internal open fun settingsDao(): SettingsDao =
        AppDatabase.getInstance(applicationContext).settingsDao()

    override suspend fun doWork(): Result {
        val settings = settingsDao().currentSettings()

        runBackfill(
            dao = movementEntryDao(),
            now = Instant.now(),
            remindersEnabled = settings.remindersEnabled,
            weekdaysOnly = settings.weekdaysOnly,
            startTime = settings.startTime,
            endTime = settings.endTime,
        )

        ReminderScheduler.scheduleNextAlarm(applicationContext, settings)

        return Result.success()
    }
}
