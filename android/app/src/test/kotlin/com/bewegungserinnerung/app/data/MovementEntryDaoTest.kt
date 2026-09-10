package com.bewegungserinnerung.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MovementEntryDaoTest {

    private lateinit var database: AppDatabase
    private lateinit var dao: MovementEntryDao

    @Before
    fun createDatabase() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
        dao = database.movementEntryDao()
    }

    @After
    fun closeDatabase() {
        database.close()
    }

    @Test
    fun `insert and query round-trips all fields`() = runBlocking {
        val entry = MovementEntry(
            date = "2026-09-10",
            weekday = "Donnerstag",
            reminderTime = "08:55",
            responseTime = "09:10",
            delayMinutes = 15,
            value = 2,
            description = "Geschirrspüler ausräumen",
            durationMinutes = null,
            isAdditionalBreak = false,
            entryType = "planned_break_response",
            note = "Geschirrspüler ausräumen",
            createdAt = "2026-09-10T07:10:57.508Z",
        )

        val insertedId = dao.insert(entry)
        val loaded = dao.observeAll().first().single { it.id == insertedId }

        assertEquals(entry.date, loaded.date)
        assertEquals(entry.weekday, loaded.weekday)
        assertEquals(entry.reminderTime, loaded.reminderTime)
        assertEquals(entry.responseTime, loaded.responseTime)
        assertEquals(entry.delayMinutes, loaded.delayMinutes)
        assertEquals(entry.value, loaded.value)
        assertEquals(entry.description, loaded.description)
        assertEquals(entry.durationMinutes, loaded.durationMinutes)
        assertEquals(entry.isAdditionalBreak, loaded.isAdditionalBreak)
        assertEquals(entry.entryType, loaded.entryType)
        assertEquals(entry.note, loaded.note)
        assertEquals(entry.createdAt, loaded.createdAt)
    }

    @Test
    fun `entries for a slot are returned by date and reminder time`() = runBlocking {
        val matching = MovementEntry(
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
        )
        val other = matching.copy(reminderTime = "09:55")

        dao.insert(matching)
        dao.insert(other)

        val forSlot = dao.entriesForSlot(date = "2026-09-10", reminderTime = "08:55")

        assertEquals(1, forSlot.size)
        assertEquals("08:55", forSlot.single().reminderTime)
    }
}
