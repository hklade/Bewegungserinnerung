package com.bewegungserinnerung.app.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * Re-arms the reminder schedule after a device reboot, per `android-reminder-scheduling`'s
 * "reminder notifications resume after device restart" requirement — `AlarmManager` alarms do
 * not survive a reboot on their own, so this must re-create the next alarm without requiring the
 * user to open the app first. It enqueues [ReminderBackfillWorker] rather than scheduling directly,
 * because the alarm depends on the saved settings, which a receiver can't read on the main thread.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        WorkManager.getInstance(context).enqueueUniqueWork(
            ReminderAlarmReceiver.REARM_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<ReminderBackfillWorker>().build(),
        )
    }
}
