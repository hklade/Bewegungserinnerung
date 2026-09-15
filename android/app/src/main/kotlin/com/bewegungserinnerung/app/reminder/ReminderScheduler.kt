package com.bewegungserinnerung.app.reminder

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.Instant

private const val REQUEST_CODE_REMINDER_ALARM = 1001

// 15 minutes is the shortest interval WorkManager/Android allows for periodic work.
private val PERIODIC_BACKFILL_INTERVAL = Duration.ofMinutes(15)

/**
 * Schedules the next eligible reminder notification via [AlarmManager], and re-arms it whenever
 * settings change or an alarm fires. `setExactAndAllowWhileIdle` is the only primitive that
 * reliably fires at a specific minute under Doze (D4) — `WorkManager` alone cannot guarantee
 * that precision, which is why alarm scheduling and backfill bookkeeping are split across two
 * different mechanisms that both call into this object.
 */
object ReminderScheduler {

    const val PERIODIC_BACKFILL_WORK_NAME = "reminder-periodic-backfill"

    /**
     * Computes the next eligible reminder slot from now and schedules an exact alarm for it,
     * replacing any previously scheduled alarm. Does nothing (and cancels any pending alarm) if
     * reminders are disabled or no eligible slot exists.
     */
    fun scheduleNextAlarm(context: Context, now: Instant = Instant.now()) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = reminderPendingIntent(context)

        val countdown = nextReminderCountdown(
            now = now,
            remindersEnabled = ReminderDefaults.REMINDERS_ENABLED,
            weekdaysOnly = ReminderDefaults.WEEKDAYS_ONLY,
            startTime = ReminderDefaults.START_TIME,
            endTime = ReminderDefaults.END_TIME,
        )

        alarmManager.cancel(pendingIntent)

        if (countdown !is NextReminderCountdown.Eligible) return

        if (alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                countdown.nextSlot.toEpochMilli(),
                pendingIntent,
            )
        } else {
            // No exact-alarm permission: fall back to an inexact alarm so a reminder still
            // fires eventually, tolerated by the backfill's 59-minute window (see design.md Risks).
            alarmManager.set(AlarmManager.RTC_WAKEUP, countdown.nextSlot.toEpochMilli(), pendingIntent)
        }
    }

    /** Cancels any pending reminder alarm, e.g. when the user turns reminders off. */
    fun cancelAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(reminderPendingIntent(context))
    }

    /**
     * Ensures the periodic backfill/re-arm safety net (D6) is registered. This is the fallback
     * path for when no exact alarm fires for an extended period — a killed alarm (OEM battery
     * optimization), a missed boot-completed broadcast, or the device being off — since
     * [ReminderBackfillWorker] would otherwise only run as a side effect of an alarm firing.
     * Safe to call on every app start: `KEEP` means an already-scheduled periodic job is left
     * untouched rather than restarted.
     */
    fun ensurePeriodicBackfillScheduled(context: Context) {
        val request = PeriodicWorkRequestBuilder<ReminderBackfillWorker>(PERIODIC_BACKFILL_INTERVAL).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_BACKFILL_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    private fun reminderPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, ReminderAlarmReceiver::class.java)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE_REMINDER_ALARM,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
