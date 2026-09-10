package com.bewegungserinnerung.app.ui.quickentry

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.data.MovementEntryDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class QuickEntrySaveFailureTest {

    private class FailingDao : MovementEntryDao {
        override suspend fun insert(entry: MovementEntry): Long {
            throw IllegalStateException("simulated storage failure")
        }

        override fun observeAll(): Flow<List<MovementEntry>> = flowOf(emptyList())

        override suspend fun entriesForSlot(date: String, reminderTime: String): List<MovementEntry> =
            emptyList()
    }

    @Test
    fun `a failed save shows an error state and preserves the note`() = runBlocking {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val viewModel = QuickEntryViewModel(
            dao = FailingDao(),
            clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
            currentSlotTime = slotTime,
        )
        viewModel.updateNote("wird nicht gespeichert")

        val result = viewModel.save()

        assertTrue(result is SaveResult.Failure)
        assertEquals("wird nicht gespeichert", viewModel.uiState.value.note)
        assertTrue(viewModel.uiState.value.hasError)
    }
}
