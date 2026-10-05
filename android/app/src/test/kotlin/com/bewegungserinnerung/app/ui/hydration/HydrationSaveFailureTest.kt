package com.bewegungserinnerung.app.ui.hydration

import com.bewegungserinnerung.app.data.HydrationEntry
import com.bewegungserinnerung.app.data.HydrationEntryDao
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class HydrationSaveFailureTest {

    /** Starts with 500 ml logged; every insert waits for [pendingInsert] to be completed by the test. */
    private class GatedDao : HydrationEntryDao {
        val pendingInsert = CompletableDeferred<Long>()

        override suspend fun insert(entry: HydrationEntry): Long = pendingInsert.await()

        override suspend fun amountForDate(date: String): Int = 500
    }

    private val clock = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneOffset.UTC)

    @Test
    fun `Plus 250 ml wird sofort angezeigt und bei Speicherfehler zurückgesetzt`() = runBlocking {
        val dao = GatedDao()
        val viewModel = HydrationViewModel(dao = dao, clock = clock, zone = ZoneOffset.UTC)
        viewModel.load()

        val job = launch { viewModel.increment() }
        yield()
        assertEquals(750, viewModel.uiState.value.amountMl)

        dao.pendingInsert.completeExceptionally(IllegalStateException("simulated storage failure"))
        job.join()

        assertEquals(500, viewModel.uiState.value.amountMl)
        assertTrue(viewModel.uiState.value.hasError)
    }

    @Test
    fun `Minus 250 ml wird bei Speicherfehler zurückgesetzt`() = runBlocking {
        val dao = GatedDao()
        val viewModel = HydrationViewModel(dao = dao, clock = clock, zone = ZoneOffset.UTC)
        viewModel.load()

        val job = launch { viewModel.decrement() }
        yield()
        assertEquals(250, viewModel.uiState.value.amountMl)

        dao.pendingInsert.completeExceptionally(IllegalStateException("simulated storage failure"))
        job.join()

        assertEquals(500, viewModel.uiState.value.amountMl)
        assertTrue(viewModel.uiState.value.hasError)
    }

    @Test
    fun `Erfolgreiches Speichern nach einem Fehler hebt den Fehlerzustand auf`() = runBlocking {
        val dao = object : HydrationEntryDao {
            var fail = true
            override suspend fun insert(entry: HydrationEntry): Long =
                if (fail) throw IllegalStateException("simulated storage failure") else 1

            override suspend fun amountForDate(date: String): Int = 500
        }
        val viewModel = HydrationViewModel(dao = dao, clock = clock, zone = ZoneOffset.UTC)
        viewModel.load()
        viewModel.increment()
        assertTrue(viewModel.uiState.value.hasError)

        dao.fail = false
        viewModel.increment()

        assertFalse(viewModel.uiState.value.hasError)
        assertEquals(750, viewModel.uiState.value.amountMl)
    }
}
