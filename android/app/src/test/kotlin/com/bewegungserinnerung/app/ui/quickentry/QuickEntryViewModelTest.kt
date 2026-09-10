package com.bewegungserinnerung.app.ui.quickentry

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.Clock
import java.time.ZoneId
import java.time.ZonedDateTime

@RunWith(RobolectricTestRunner::class)
class QuickEntryViewModelTest {

    private lateinit var database: AppDatabase
    private lateinit var viewModel: QuickEntryViewModel

    private val zone = ZoneId.of("Europe/Vienna")
    private val slotTime = ZonedDateTime.of(2026, 9, 10, 8, 55, 0, 0, zone).toInstant()
    private val clock = Clock.fixed(slotTime.plusSeconds(120), zone)

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
        viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = clock,
            currentSlotTime = slotTime,
        )
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun `first save for a slot is recorded as the primary answer`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Movement)

        val result = viewModel.save()

        assertTrue(result is SaveResult.Success)
        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "08:55",
        )
        assertEquals(1, entries.size)
        assertFalse(entries.single().isAdditionalBreak)
        assertEquals("Donnerstag", entries.single().weekday)
    }

    @Test
    fun `second save for an already-answered slot is recorded as additional`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Mini)
        viewModel.save()

        viewModel.selectLevel(ActivityLevel.Active)
        viewModel.save()

        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "08:55",
        )
        assertEquals(2, entries.size)
        assertFalse(entries[0].isAdditionalBreak)
        assertTrue(entries[1].isAdditionalBreak)
    }

    @Test
    fun `note field clears after a successful save, selection is preserved`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Movement)
        viewModel.updateNote("Kurzer Spaziergang")

        viewModel.save()

        assertEquals("", viewModel.uiState.value.note)
        assertEquals(ActivityLevel.Movement, viewModel.uiState.value.selectedLevel)
    }

    @Test
    fun `empty note uses a default description derived from the level label`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Light)

        viewModel.save()

        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "08:55",
        )
        assertEquals(ActivityLevel.Light.label, entries.single().description)
    }

    @Test
    fun `typed note is saved verbatim`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Light)
        viewModel.updateNote("Kaffee geholt")

        viewModel.save()

        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "08:55",
        )
        assertEquals("Kaffee geholt", entries.single().description)
    }
}
