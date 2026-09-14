package com.bewegungserinnerung.app.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * Fires when a scheduled reminder alarm goes off. Shows the notification for the current slot
 * and immediately enqueues [ReminderBackfillWorker] to re-arm the following alarm — the alarm
 * itself only fires once, so re-arming must happen right after (see `android-reminder-scheduling`'s
 * "reminder notifications resume after device restart"/re-arming requirement, D4).
 */
class ReminderAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        ReminderNotifier.showReminderNotification(context, ReminderDefaults.TONE_ENABLED)

        WorkManager.getInstance(context).enqueueUniqueWork(
            REARM_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<ReminderBackfillWorker>().build(),
        )
    }

    companion object {
        const val REARM_WORK_NAME = "reminder-rearm-after-alarm"
    }
}
