package com.bewegungserinnerung.app.reminder

import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ReminderAlarmReceiverTest {

    @Test
    fun `Feuernder Alarm reiht die Backfill-Arbeit als eindeutige Arbeit ein`() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
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
}
