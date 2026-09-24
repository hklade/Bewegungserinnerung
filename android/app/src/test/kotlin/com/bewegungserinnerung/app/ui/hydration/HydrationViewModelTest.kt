package com.bewegungserinnerung.app.ui.hydration

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
import com.bewegungserinnerung.app.data.HydrationEntry
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

@RunWith(RobolectricTestRunner::class)
class HydrationViewModelTest {

    private lateinit var database: AppDatabase

    private val zone = ZoneId.of("Europe/Vienna")
    private val clock = Clock.fixed(ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, zone).toInstant(), zone)

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
    }

    @After
    fun tearDown() {
        database.close()
    }

    private fun viewModel() = HydrationViewModel(
        dao = database.hydrationEntryDao(),
        clock = clock,
        zone = zone,
    )

    @Test
    fun `Ohne konfiguriertes Tagesziel gilt 2000 ml`() {
        assertEquals(2000, viewModel().uiState.value.goalMl)
    }

    @Test
    fun `Plus 250 ml erhöht die Tagesmenge und speichert sie`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()

        viewModel.increment()
        viewModel.increment()

        assertEquals(500, viewModel.uiState.value.amountMl)
        val reloaded = viewModel().also { it.load() }
        assertEquals(500, reloaded.uiState.value.amountMl)
    }

    @Test
    fun `Konfiguriertes Tagesziel wird verwendet`() {
        val viewModel = HydrationViewModel(
            dao = database.hydrationEntryDao(),
            clock = clock,
            zone = zone,
            goalMl = 1500,
        )

        assertEquals(1500, viewModel.uiState.value.goalMl)
    }

    @Test
    fun `Minus 250 ml verringert die Tagesmenge und speichert sie`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()
        viewModel.increment()
        viewModel.increment()

        viewModel.decrement()

        assertEquals(250, viewModel.uiState.value.amountMl)
        val reloaded = viewModel().also { it.load() }
        assertEquals(250, reloaded.uiState.value.amountMl)
    }

    @Test
    fun `Bei 0 ml ist Minus deaktiviert und verringert die Menge nicht`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()

        assertFalse(viewModel.uiState.value.canDecrement)
        viewModel.decrement()

        assertEquals(0, viewModel.uiState.value.amountMl)
        assertNull(database.hydrationEntryDao().amountForDate("2026-09-10"))
    }

    @Test
    fun `Ab 250 ml ist Minus möglich`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()

        viewModel.increment()

        assertTrue(viewModel.uiState.value.canDecrement)
    }

    @Test
    fun `Nach Mitternacht beginnt die Tagesmenge bei 0, auch wenn die App offen blieb`() = runBlocking {
        val lateEvening = ZonedDateTime.of(2026, 9, 10, 23, 50, 0, 0, zone).toInstant()
        val movingClock = MutableClock(lateEvening, zone)
        database.hydrationEntryDao().insert(
            HydrationEntry(date = "2026-09-10", hydrationMl = 1000, createdAt = "2026-09-10T21:00:00Z"),
        )
        val viewModel = HydrationViewModel(dao = database.hydrationEntryDao(), clock = movingClock, zone = zone)
        viewModel.load()

        movingClock.now = lateEvening.plusSeconds(20 * 60)
        viewModel.increment()

        assertEquals(250, viewModel.uiState.value.amountMl)
        assertEquals(250, database.hydrationEntryDao().amountForDate("2026-09-11"))
        assertEquals(1000, database.hydrationEntryDao().amountForDate("2026-09-10"))
    }
}

private class MutableClock(var now: Instant, private val zone: ZoneId) : Clock() {
    override fun getZone(): ZoneId = zone
    override fun withZone(zone: ZoneId): Clock = MutableClock(now, zone)
    override fun instant(): Instant = now
}
