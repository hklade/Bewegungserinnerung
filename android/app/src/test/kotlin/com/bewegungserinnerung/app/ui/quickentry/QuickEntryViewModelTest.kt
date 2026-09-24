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
import java.time.Instant
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
    fun `Erstes Speichern für ein Zeitfenster wird als primäre Antwort erfasst`() = runBlocking {
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
    fun `Zweites Speichern für ein bereits beantwortetes Zeitfenster wird als Zusatzeintrag erfasst`() = runBlocking {
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
    fun `Notizfeld wird nach erfolgreichem Speichern geleert, Auswahl bleibt erhalten`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Movement)
        viewModel.updateNote("Kurzer Spaziergang")

        viewModel.save()

        assertEquals("", viewModel.uiState.value.note)
        assertEquals(ActivityLevel.Movement, viewModel.uiState.value.selectedLevel)
    }

    @Test
    fun `Leere Notiz verwendet eine aus dem Stufen-Label abgeleitete Standardbeschreibung`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Light)

        viewModel.save()

        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "08:55",
        )
        assertEquals(ActivityLevel.Light.label, entries.single().description)
    }

    @Test
    fun `Eingetippte Notiz wird unverändert gespeichert`() = runBlocking {
        viewModel.selectLevel(ActivityLevel.Light)
        viewModel.updateNote("Kaffee geholt")

        viewModel.save()

        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "08:55",
        )
        assertEquals("Kaffee geholt", entries.single().description)
    }

    @Test
    fun `Nach Erreichen des nächsten Zeitfensters wird der Eintrag dem neuen Slot mit kleiner Verzögerung zugeordnet`() = runBlocking {
        val nextSlotTime = slotTime.plusSeconds(3600)
        val movingClock = MutableClock(slotTime.plusSeconds(120), zone)
        val resolvingViewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = movingClock,
            slotResolver = { now -> if (now >= nextSlotTime) nextSlotTime else slotTime },
        )

        movingClock.now = nextSlotTime.plusSeconds(120)
        resolvingViewModel.save()

        val entries = database.movementEntryDao().entriesForSlot(
            date = "2026-09-10",
            reminderTime = "09:55",
        )
        assertEquals(1, entries.size)
        assertEquals(2, entries.single().delayMinutes)
    }

    @Test
    fun `Aktualisieren des Zeitfensters übernimmt den inzwischen erreichten Slot`() {
        val nextSlotTime = slotTime.plusSeconds(3600)
        val movingClock = MutableClock(slotTime.plusSeconds(120), zone)
        val resolvingViewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = movingClock,
            slotResolver = { now -> if (now >= nextSlotTime) nextSlotTime else slotTime },
        )
        assertEquals(slotTime, resolvingViewModel.currentSlot.value)

        movingClock.now = nextSlotTime.plusSeconds(1)
        resolvingViewModel.refreshCurrentSlot()

        assertEquals(nextSlotTime, resolvingViewModel.currentSlot.value)
    }

    @Test
    fun `Ohne aktives Zeitfenster ist der aktuelle Slot leer`() {
        val resolvingViewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = clock,
            slotResolver = { null },
        )

        assertNull(resolvingViewModel.currentSlot.value)
    }
}

private class MutableClock(var now: Instant, private val zone: ZoneId) : Clock() {
    override fun getZone(): ZoneId = zone
    override fun withZone(zone: ZoneId): Clock = MutableClock(now, zone)
    override fun instant(): Instant = now
}
