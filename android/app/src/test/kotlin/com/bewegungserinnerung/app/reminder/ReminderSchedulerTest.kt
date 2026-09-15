package com.bewegungserinnerung.app.reminder

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
class ReminderSchedulerTest {

    @Test
    fun `Periodischer Backfill-Job wird als eindeutige Arbeit registriert`() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        ReminderScheduler.ensurePeriodicBackfillScheduled(context)

        val workInfos = WorkManager.getInstance(context)
            .getWorkInfosForUniqueWork(ReminderScheduler.PERIODIC_BACKFILL_WORK_NAME)
            .get()

        assertEquals(1, workInfos.size)
        // The test executor runs work eagerly (state may already be RUNNING/SUCCEEDED rather
        // than ENQUEUED by the time we read it) — what matters here is that registration
        // happened at all, under the expected unique work name, not which state it's in yet.
        assertTrue(workInfos.single().state !in setOf(WorkInfo.State.FAILED, WorkInfo.State.CANCELLED))
    }
}
