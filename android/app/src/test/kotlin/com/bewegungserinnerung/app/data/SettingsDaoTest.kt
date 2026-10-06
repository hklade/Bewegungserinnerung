package com.bewegungserinnerung.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import com.bewegungserinnerung.app.reminder.ToneSequence
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SettingsDaoTest {

    private lateinit var database: AppDatabase
    private lateinit var dao: SettingsDao

    @Before
    fun createDatabase() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
        dao = database.settingsDao()
    }

    @After
    fun closeDatabase() {
        database.close()
    }

    @Test
    fun `Vor dem ersten Speichern gelten die Standardeinstellungen`() = runBlocking {
        val settings = dao.observeSettings().first()

        assertTrue(settings.remindersEnabled)
        assertEquals("07:55", settings.startTime)
        assertEquals("16:55", settings.endTime)
        assertTrue(settings.weekdaysOnly)
        assertEquals(2000, settings.hydrationGoalMl)
        assertTrue(settings.toneEnabled)
        assertEquals(ToneSequence.Aufwaerts, settings.toneSequence)
        assertNull(settings.exportLocationUri)
        assertFalse(settings.hideMissedReminders)
        assertEquals(settings, dao.currentSettings())
    }

    @Test
    fun `Gespeicherte Einstellungen ersetzen die Standardwerte`() = runBlocking {
        val changed = AppSettings(
            remindersEnabled = false,
            startTime = "08:30",
            endTime = "15:30",
            weekdaysOnly = false,
            hydrationGoalMl = 2500,
            toneEnabled = false,
            toneSequence = ToneSequence.WeicherGong,
            exportLocationUri = "content://com.android.externalstorage.documents/tree/primary%3ADownload",
            hideMissedReminders = true,
        )

        dao.save(changed)

        assertEquals(changed, dao.observeSettings().first())
        assertEquals(changed, dao.currentSettings())
    }

    @Test
    fun `Erneutes Speichern überschreibt die eine Einstellungszeile`() = runBlocking {
        dao.save(AppSettings(hydrationGoalMl = 1500))
        dao.save(AppSettings(hydrationGoalMl = 3000))

        assertEquals(3000, dao.currentSettings().hydrationGoalMl)
        assertEquals(1, dao.rowCount())
    }
}
