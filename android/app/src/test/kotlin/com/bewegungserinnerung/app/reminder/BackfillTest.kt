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

    @Test
    fun `Ein überfälliges Zeitfenster ohne Eintrag wird genau einmal als unbeantwortet nachgetragen`() = runBlocking {
        // Slot 08:55 is 65 minutes in the past (> 59 minute threshold); slot 07:55 is not due to backfill anything else today.
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

        assertEquals(2, created)
        val entries = database.movementEntryDao().observeAll().first()
        assertEquals(2, entries.size)
        assertEquals(setOf("07:55", "08:55"), entries.map { it.reminderTime }.toSet())
        assertEquals(setOf("unanswered"), entries.map { it.entryType }.toSet())
    }

    @Test
    fun `Ein wiederholter Lauf für dasselbe Zeitfenster erzeugt keinen doppelten Eintrag`() = runBlocking {
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant()
        val dao = database.movementEntryDao()

        runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )
        val createdOnSecondRun = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )

        assertEquals(0, createdOnSecondRun)
        val entries = dao.observeAll().first()
        assertEquals(2, entries.size)
    }

    @Test
    fun `Kein Nachtrag wenn Erinnerungen deaktiviert sind`() = runBlocking {
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            database.movementEntryDao(),
            now,
            remindersEnabled = false,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )

        assertEquals(0, created)
    }

    @Test
    fun `Kein Nachtrag am Wochenende wenn Nur-Werktage aktiv ist`() = runBlocking {
        // 2026-09-12 is a Saturday.
        val now = ZonedDateTime.of(2026, 9, 12, 10, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            database.movementEntryDao(),
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )

        assertEquals(0, created)
    }

    @Test
    fun `Lookback trägt auch überfällige Zeitfenster von gestern nach`() = runBlocking {
        // 2026-09-10 (yesterday) is a Thursday; today, 2026-09-11, is a Friday, still before its own first slot.
        val now = ZonedDateTime.of(2026, 9, 11, 7, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            database.movementEntryDao(),
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 1,
        )

        assertEquals(2, created)
        val entries = database.movementEntryDao().observeAll().first()
        assertEquals(setOf("2026-09-10"), entries.map { it.date }.toSet())
    }

    @Test
    fun `Der Standard-Lookback trägt ein am Freitag verpasstes Zeitfenster am folgenden Montag nach`() = runBlocking {
        // 2026-09-11 (Friday) has no entries; 2026-09-12/13 (Sat/Sun) are skipped by weekdaysOnly;
        // 2026-09-14 (Monday) is "today" when the worker next runs, using the default lookbackDays.
        val now = ZonedDateTime.of(2026, 9, 14, 7, 0, 0, 0, zone).toInstant()

        val created = runBackfill(
            database.movementEntryDao(),
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
        )

        assertEquals(2, created)
        val entries = database.movementEntryDao().observeAll().first()
        assertEquals(setOf("2026-09-11"), entries.map { it.date }.toSet())
    }

    @Test
    fun `Ein bereits beantwortetes Zeitfenster wird nicht nachgetragen`() = runBlocking {
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant()
        val dao = database.movementEntryDao()
        dao.insert(
            MovementEntry(
                date = "2026-09-10",
                weekday = "Donnerstag",
                reminderTime = "08:55",
                responseTime = "09:00",
                delayMinutes = 5,
                value = 1,
                description = "Mini-Pause",
                durationMinutes = null,
                isAdditionalBreak = false,
                entryType = "planned_break_response",
                note = "",
                createdAt = "2026-09-10T07:00:00.000Z",
            ),
        )

        val created = runBackfill(
            dao,
            now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "08:55",
            lookbackDays = 0,
        )

        assertEquals(1, created)
        val entries = dao.observeAll().first()
        assertEquals(1, entries.count { it.reminderTime == "08:55" })
        assertEquals("planned_break_response", entries.single { it.reminderTime == "08:55" }.entryType)
    }
}
