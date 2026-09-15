package com.bewegungserinnerung.app.reminder

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class ReminderAlarmReceiverTest {

    @Test
    fun `Feuernder Alarm reiht die Backfill-Arbeit als eindeutige Arbeit ein`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        ReminderAlarmReceiver().onReceive(context, Intent())

        val workInfos = WorkManager.getInstance(context)
            .getWorkInfosForUniqueWork(ReminderAlarmReceiver.REARM_WORK_NAME)
            .get()

        assertEquals(1, workInfos.size)
        // The test executor runs work eagerly, so the state may already be RUNNING/SUCCEEDED
        // rather than ENQUEUED — what matters is that the work was registered at all.
        assertTrue(workInfos.single().state !in setOf(WorkInfo.State.FAILED, WorkInfo.State.CANCELLED))
    }

    @Test
    fun `Notification zeigt die im Alarm mitgegebene Slot-Zeit, nicht die tatsächliche Feuerzeit`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        // The slot was scheduled for 08:55, but delivery is simulated as happening much later
        // (e.g. an inexact fallback alarm delayed by Doze) — the notification must still say 08:55.
        val slotTime = ZonedDateTime.of(2026, 9, 10, 8, 55, 0, 0, ZONE).toInstant()
        val intent = Intent().putExtra(ReminderAlarmReceiver.EXTRA_SLOT_TIME_EPOCH_MILLI, slotTime.toEpochMilli())

        ReminderAlarmReceiver().onReceive(context, intent)

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = shadowOf(manager).allNotifications.single()
        val text = notification.extras.getCharSequence(android.app.Notification.EXTRA_TEXT).toString()

        assertTrue(text.contains("08:55"))
    }
}
