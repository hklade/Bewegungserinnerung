package com.bewegungserinnerung.app.ui.settings

import com.bewegungserinnerung.app.data.AppSettings
import com.bewegungserinnerung.app.data.SettingsDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SettingsSaveFailureTest {

    private val previouslySaved = AppSettings(startTime = "08:00")

    /** Holds [previouslySaved]; every save attempt fails like a local storage error would. */
    private inner class FailingDao : SettingsDao {
        override suspend fun save(settings: AppSettings) {
            throw IllegalStateException("simulated storage failure")
        }

        override fun observeRow(): Flow<AppSettings?> = flowOf(previouslySaved)

        override suspend fun getRow(): AppSettings = previouslySaved

        override suspend fun rowCount(): Int = 1
    }

    @Test
    fun `Fehlgeschlagenes Speichern zeigt einen Fehler und wendet nichts an`() = runBlocking {
        val applied = mutableListOf<AppSettings>()
        val viewModel = SettingsViewModel(dao = FailingDao(), onSaved = { applied += it })
        viewModel.load()
        viewModel.edit { it.copy(startTime = "10:00") }

        viewModel.save()

        assertEquals(SaveStatus.Failed, viewModel.uiState.value.saveStatus)
        assertTrue(applied.isEmpty())
        // The unsaved draft stays in the form so the user can retry, rather than silently
        // reverting their input.
        assertEquals("10:00", viewModel.uiState.value.draft.startTime)
    }
}
