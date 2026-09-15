package com.bewegungserinnerung.app.reminder

import android.app.AlarmManager
import android.content.Context

/**
 * Whether the exact-alarm permission (`SCHEDULE_EXACT_ALARM`/`canScheduleExactAlarms`) is
 * currently granted. Checked on demand (not cached) since the user can revoke it from system
 * settings at any time without the app being notified — per `android-reminder-scheduling`'s
 * exact-alarm risk mitigation (design.md Risks), the UI shows a warning banner when this is false
 * rather than failing silently.
 */
fun isExactAlarmPermissionGranted(context: Context): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
}
