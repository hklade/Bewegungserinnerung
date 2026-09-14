package com.bewegungserinnerung.app.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-arms the reminder schedule after a device reboot, per `android-reminder-scheduling`'s
 * "reminder notifications resume after device restart" requirement — `AlarmManager` alarms do
 * not survive a reboot on their own, so this must re-create the next alarm without requiring the
 * user to open the app first.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        ReminderScheduler.scheduleNextAlarm(context)
    }
}
