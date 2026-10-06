package com.bewegungserinnerung.app.reminder

import android.app.AlarmManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import com.bewegungserinnerung.app.data.AppSettings
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

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

    private val zone = ZoneId.of("Europe/Vienna")
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun scheduledTriggerTimes(): List<Long> =
        shadowOf(alarmManager).scheduledAlarms.map { it.triggerAtTime }

    private fun at(year: Int, month: Int, day: Int, hour: Int, minute: Int) =
        ZonedDateTime.of(year, month, day, hour, minute, 0, 0, zone).toInstant()

    @Test
    fun `Ausgeschaltete Erinnerungen entfernen den gestellten Alarm`() {
        val now = at(2026, 9, 10, 7, 0)
        ReminderScheduler.scheduleNextAlarm(context, AppSettings(), now)
        assertEquals(1, scheduledTriggerTimes().size)

        ReminderScheduler.scheduleNextAlarm(context, AppSettings(remindersEnabled = false), now)

        assertTrue(scheduledTriggerTimes().isEmpty())
    }

    @Test
    fun `Geändertes Zeitfenster ersetzt den Alarm durch einen im neuen Fenster`() {
        val now = at(2026, 9, 10, 7, 0)
        ReminderScheduler.scheduleNextAlarm(context, AppSettings(), now)
        assertEquals(listOf(at(2026, 9, 10, 7, 55).toEpochMilli()), scheduledTriggerTimes())

        ReminderScheduler.scheduleNextAlarm(context, AppSettings(startTime = "10:00", endTime = "15:00"), now)

        assertEquals(listOf(at(2026, 9, 10, 10, 0).toEpochMilli()), scheduledTriggerTimes())
    }

    @Test
    fun `Nur-Werktage bestimmt, ob am Samstag ein Alarm gestellt wird`() {
        // 2026-09-12 is a Saturday; with weekdays only the next slot is Monday 2026-09-14.
        val now = at(2026, 9, 12, 7, 0)

        ReminderScheduler.scheduleNextAlarm(context, AppSettings(weekdaysOnly = true), now)
        assertEquals(listOf(at(2026, 9, 14, 7, 55).toEpochMilli()), scheduledTriggerTimes())

        ReminderScheduler.scheduleNextAlarm(context, AppSettings(weekdaysOnly = false), now)
        assertEquals(listOf(at(2026, 9, 12, 7, 55).toEpochMilli()), scheduledTriggerTimes())
    }

    @Test
    fun `Der gestellte Alarm trägt die gespeicherte Ton-Einstellung mit`() {
        val now = at(2026, 9, 10, 7, 0)

        ReminderScheduler.scheduleNextAlarm(
            context,
            AppSettings(toneEnabled = false, toneSequence = ToneSequence.WeicherGong),
            now,
        )

        val intent = shadowOf(shadowOf(alarmManager).scheduledAlarms.single().operation).savedIntent
        assertEquals(ToneChoice(enabled = false, sequence = ToneSequence.WeicherGong), intent.toneChoice())
    }
}
