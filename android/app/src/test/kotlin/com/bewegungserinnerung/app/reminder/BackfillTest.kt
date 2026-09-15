package com.bewegungserinnerung.app.reminder

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.MovementEntry
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class BackfillTest {

    private val zone = ZoneId.of("Europe/Vienna")
    private lateinit var database: AppDatabase

    @Before
    fun createDatabase() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
    }

    @After
    fun closeDatabase() {
        database.close()
    }

    private suspend fun insertRealEntry(dao: com.bewegungserinnerung.app.data.MovementEntryDao, date: String, reminderTime: String) {
        dao.insert(
            MovementEntry(
                date = date,
                weekday = "Donnerstag",
                reminderTime = reminderTime,
                responseTime = reminderTime,
                delayMinutes = 0,
                value = 1,
                description = "Mini-Pause",
                durationMinutes = null,
                isAdditionalBreak = false,
                entryType = "planned_break_response",
                note = "",
                createdAt = "$date${'T'}${reminderTime}:00.000Z",
            ),
        )
    }

    @Test
    fun `Ein überfälliges Zeitfenster mit einem späteren echten Eintrag am selben Tag wird nachgetragen`() = runBlocking {
        // 07:55 has no entry, but 08:55 (a real entry) proves the workday continued past 07:55.
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "08:55")
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao = dao,
            now = now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )

        assertEquals(1, created)
        val entries = dao.observeAll().first()
        assertEquals(setOf("07:55", "08:55"), entries.map { it.reminderTime }.toSet())
        assertEquals("unanswered", entries.single { it.reminderTime == "07:55" }.entryType)
    }

    @Test
    fun `Zeitfenster nach dem letzten Eintrag des Tages bleiben unausgefüllt (Feierabend)`() = runBlocking {
        // No entries at all today: the user is treated as having ended their workday, not as
        // having missed every single reminder.
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao = database.movementEntryDao(),
            now = now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )

        assertEquals(0, created)
        val entries = database.movementEntryDao().observeAll().first()
        assertEquals(0, entries.size)
    }

    @Test
    fun `Nur Zeitfenster vor dem letzten Eintrag des Tages werden nachgetragen, spätere bleiben leer`() = runBlocking {
        // Entry at 09:55 only: 07:55/08:55 (before it) get backfilled, 10:55/11:55 (after the
        // last real entry) do not — those are "after work ended", not missed reminders.
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 10, 13, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao = dao,
            now = now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "11:55",
            lookbackDays = 0,
        )

        assertEquals(2, created)
        val entries = dao.observeAll().first()
        assertEquals(setOf("07:55", "08:55", "09:55"), entries.map { it.reminderTime }.toSet())
        assertEquals(
            setOf("unanswered"),
            entries.filter { it.reminderTime != "09:55" }.map { it.entryType }.toSet(),
        )
    }

    @Test
    fun `Ein wiederholter Lauf für dasselbe Zeitfenster erzeugt keinen doppelten Eintrag`() = runBlocking {
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 10, 10, 30, 0, 0, zone).toInstant()

        runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
            lookbackDays = 0,
        )
        val createdOnSecondRun = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
            lookbackDays = 0,
        )

        assertEquals(0, createdOnSecondRun)
        val entries = dao.observeAll().first()
        assertEquals(3, entries.size)
    }

    @Test
    fun `Kein Nachtrag wenn Erinnerungen deaktiviert sind`() = runBlocking {
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 10, 10, 30, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao,
            now,
            remindersEnabled = false,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
            lookbackDays = 0,
        )

        assertEquals(0, created)
    }

    @Test
    fun `Kein Nachtrag am Wochenende wenn Nur-Werktage aktiv ist`() = runBlocking {
        // 2026-09-12 is a Saturday.
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-12", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 12, 10, 30, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
            lookbackDays = 0,
        )

        assertEquals(0, created)
    }

    @Test
    fun `Lookback trägt auch überfällige Zeitfenster von gestern mit späterem Eintrag nach`() = runBlocking {
        // 2026-09-10 (yesterday) is a Thursday with a real entry at 09:55; today, 2026-09-11
        // (Friday), is still before its own first slot.
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 11, 7, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
            lookbackDays = 1,
        )

        assertEquals(2, created)
        val entries = dao.observeAll().first()
        assertEquals(setOf("2026-09-10"), entries.filter { it.entryType == "unanswered" }.map { it.date }.toSet())
    }

    @Test
    fun `Der Standard-Lookback trägt ein am Freitag verpasstes Zeitfenster am folgenden Montag nach`() = runBlocking {
        // 2026-09-11 (Friday) has a real entry at 09:55, so 07:55/08:55 are backfilled;
        // 2026-09-12/13 (Sat/Sun) are skipped by weekdaysOnly; 2026-09-14 (Monday) is "today"
        // when the worker next runs, using the default lookbackDays.
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-11", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 14, 7, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
        )

        assertEquals(2, created)
        val entries = dao.observeAll().first()
        assertEquals(
            setOf("2026-09-11"),
            entries.filter { it.entryType == "unanswered" }.map { it.date }.toSet(),
        )
    }

    @Test
    fun `Ein bereits beantwortetes Zeitfenster wird nicht nachgetragen, auch wenn ein späterer Eintrag existiert`() = runBlocking {
        val dao = database.movementEntryDao()
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "08:55")
        insertRealEntry(dao, date = "2026-09-10", reminderTime = "09:55")
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "09:55",
            lookbackDays = 0,
        )

        // 08:55 and 09:55 already have real entries, so only 07:55 (which has neither an entry
        // nor is "after the last entry", since 08:55/09:55 come later) gets backfilled.
        assertEquals(1, created)
        val entries = dao.observeAll().first()
        assertEquals(1, entries.count { it.reminderTime == "08:55" })
        assertEquals("planned_break_response", entries.single { it.reminderTime == "08:55" }.entryType)
        assertEquals("unanswered", entries.single { it.reminderTime == "07:55" }.entryType)
    }
}
