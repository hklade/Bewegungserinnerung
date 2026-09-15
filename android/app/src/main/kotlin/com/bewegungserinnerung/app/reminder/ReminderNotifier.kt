package com.bewegungserinnerung.app.reminder

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.VibrationEffect
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import java.time.Instant
import java.time.format.DateTimeFormatter

private const val CHANNEL_ID = "reminder"
private const val NOTIFICATION_ID = 1
private val TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(ZONE)
private val VIBRATION_PATTERN = longArrayOf(0, 250, 150, 250)

/**
 * Shows the native reminder notification and plays the configured tone/vibration, per
 * `android-reminder-scheduling`'s notification and tone requirements. [playTestTone] lets the
 * settings screen trigger the same tone/vibration on demand without showing a notification or
 * touching any DAO/schedule state (see that capability's "test tone has no side effects" scenario).
 */
object ReminderNotifier {

    fun showReminderNotification(context: Context, toneEnabled: Boolean, slotTime: Instant = Instant.now()) {
        ensureChannel(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("Bewegungserinnerung")
            .setContentText("Zeit für eine Bewegungspause (${TIME_FORMATTER.format(slotTime)})")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)

        if (toneEnabled) {
            vibrate(context)
        }
    }

    /** Plays the tone/vibration on demand, with no notification and no persisted side effect. */
    fun playTestTone(context: Context) {
        vibrate(context)
    }

    private fun vibrate(context: Context) {
        // minSdk = 33 (D9) is always >= Build.VERSION_CODES.S, so VibratorManager is always available.
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, -1))
    }

    private fun ensureChannel(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Bewegungserinnerung",
            NotificationManager.IMPORTANCE_HIGH,
        )
        manager.createNotificationChannel(channel)
    }
}
