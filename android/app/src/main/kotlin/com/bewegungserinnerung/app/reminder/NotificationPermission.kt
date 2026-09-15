package com.bewegungserinnerung.app.reminder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

/**
 * Whether the runtime `POST_NOTIFICATIONS` permission (required since Android 13/API 33, which
 * is this app's `minSdk`) is currently granted. Unlike the exact-alarm permission, this one is
 * never auto-granted — the manifest declaration alone does nothing; the app must actively launch
 * the system permission dialog (see [MainActivity]'s `ActivityResultContracts.RequestPermission`
 * launcher) or `NotificationManagerCompat.notify` silently does nothing when it fires a reminder.
 */
fun isNotificationPermissionGranted(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
