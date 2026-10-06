package com.bewegungserinnerung.app.ui.settings

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.AppSettings
import com.bewegungserinnerung.app.data.currentSettings
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SettingsViewModelTest {

    private lateinit var database: AppDatabase
    private val savedCallbacks = mutableListOf<AppSettings>()

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

    private fun viewModel() = SettingsViewModel(
        dao = database.settingsDao(),
        onSaved = { savedCallbacks += it },
    )

    @Test
    fun `Laden zeigt die gespeicherten Einstellungen im Formular`() = runBlocking {
        database.settingsDao().save(AppSettings(startTime = "08:30", weekdaysOnly = false))
        val viewModel = viewModel()

        viewModel.load()

        assertEquals("08:30", viewModel.uiState.value.draft.startTime)
        assertFalse(viewModel.uiState.value.draft.weekdaysOnly)
    }

    @Test
    fun `Speichern übernimmt die Änderungen und bestätigt den Erfolg`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()

        viewModel.edit { it.copy(remindersEnabled = false, endTime = "14:55", hideMissedReminders = true) }
        viewModel.save()

        val saved = database.settingsDao().currentSettings()
        assertFalse(saved.remindersEnabled)
        assertEquals("14:55", saved.endTime)
        assertTrue(saved.hideMissedReminders)
        assertEquals(SaveStatus.Saved, viewModel.uiState.value.saveStatus)
        assertEquals(listOf(saved), savedCallbacks)
    }

    @Test
    fun `Ungespeicherte Änderungen bleiben ohne Wirkung`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()

        viewModel.edit { it.copy(remindersEnabled = false, startTime = "10:00") }

        assertEquals(AppSettings(), database.settingsDao().currentSettings())
        assertTrue(savedCallbacks.isEmpty())
        val reopened = viewModel().also { it.load() }
        assertEquals(AppSettings(), reopened.uiState.value.draft)
    }

    @Test
    fun `Eine neue Änderung nach dem Speichern hebt die Bestätigung auf`() = runBlocking {
        val viewModel = viewModel()
        viewModel.load()
        viewModel.save()

        viewModel.edit { it.copy(weekdaysOnly = false) }

        assertEquals(SaveStatus.Idle, viewModel.uiState.value.saveStatus)
    }

    @Test
    fun `Geladenes Tagesziel wird in Litern angezeigt`() = runBlocking {
        database.settingsDao().save(AppSettings(hydrationGoalMl = 2500))
        val viewModel = viewModel()

        viewModel.load()

        assertEquals("2,5", viewModel.uiState.value.hydrationGoalInput)
    }

    @Test
    fun `Gültiges Tagesziel in Litern wird in ml gespeichert`() = runBlocking {
        for ((input, expectedMl) in listOf("2,5" to 2500, "1.75" to 1750, " 3 " to 3000)) {
            val viewModel = viewModel()
            viewModel.load()

            viewModel.setHydrationGoalInput(input)
            viewModel.save()

            assertEquals("Eingabe '$input'", expectedMl, database.settingsDao().currentSettings().hydrationGoalMl)
        }
    }

    @Test
    fun `Ungültiges oder nicht positives Tagesziel fällt auf 2 Liter zurück`() = runBlocking {
        for (input in listOf("abc", "", "0", "-1", "1,2,3")) {
            database.settingsDao().save(AppSettings(hydrationGoalMl = 3000))
            val viewModel = viewModel()
            viewModel.load()

            viewModel.setHydrationGoalInput(input)
            viewModel.save()

            assertEquals("Eingabe '$input'", 2000, database.settingsDao().currentSettings().hydrationGoalMl)
            assertEquals("2", viewModel.uiState.value.hydrationGoalInput)
        }
    }
}
