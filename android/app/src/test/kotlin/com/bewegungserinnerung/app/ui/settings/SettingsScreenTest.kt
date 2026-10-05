package com.bewegungserinnerung.app.ui.settings

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.AppSettings
import com.bewegungserinnerung.app.data.SettingsDao
import com.bewegungserinnerung.app.data.currentSettings
import com.bewegungserinnerung.app.reminder.ToneSequence
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import kotlin.math.abs
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowToast

@RunWith(RobolectricTestRunner::class)
class SettingsScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var database: AppDatabase
    private val testTones = mutableListOf<ToneSequence>()
    private var backCount = 0

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
    }

    @After
    fun tearDown() {
        composeRule.waitForIdle()
        database.close()
    }

    private fun showScreen(dao: SettingsDao = database.settingsDao()) {
        val viewModel = SettingsViewModel(dao = dao)
        runBlocking { viewModel.load() }
        composeRule.setContent {
            SettingsScreen(
                viewModel = viewModel,
                onBack = { backCount++ },
                onTestTone = { testTones += it },
            )
        }
    }

    @Test
    fun `Optionen zeigen die Standardeinstellungen`() {
        showScreen()

        composeRule.onNodeWithText("Stündliche Erinnerung").performScrollTo().assertIsOn()
        composeRule.onNodeWithText("Zeitfenster").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Akustische Erinnerung").performScrollTo().assertIsOn()
        composeRule.onNodeWithText("07:55").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("16:55").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Nur Werktage").performScrollTo().assertIsOn()
        composeRule.onNodeWithText("2").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Aufwärts").performScrollTo().assertIsSelected()
        composeRule.onNodeWithText("Downloads (Standard)").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `Zurück-Pfeil sitzt auf halber Höhe des Titels`() {
        showScreen()

        val arrow = composeRule.onNodeWithContentDescription("Zurück").getUnclippedBoundsInRoot()
        val title = composeRule.onNodeWithText("Optionen").getUnclippedBoundsInRoot()

        val arrowCenter = (arrow.top + arrow.bottom) / 2
        val titleCenter = (title.top + title.bottom) / 2
        assertTrue("Pfeil-Mitte $arrowCenter, Titel-Mitte $titleCenter", abs(arrowCenter.value - titleCenter.value) <= 1f)
    }

    @Test
    fun `Verpasste Erinnerungen ausblenden ist standardmäßig aus`() {
        showScreen()

        composeRule.onNodeWithText("Verpasste Erinnerungen ausblenden").performScrollTo().assertIsOff()
    }

    @Test
    fun `Es gibt keinen eigenen Ton-testen-Button mehr`() {
        showScreen()

        composeRule.onNodeWithText("Ton testen").assertDoesNotExist()
    }

    @Test
    fun `Abspiel-Pfeil spielt die Tonfolge, ohne die Auswahl zu ändern`() {
        showScreen()

        composeRule.onNodeWithContentDescription("Weicher Gong anhören").performScrollTo().performClick()

        assertEquals(listOf(ToneSequence.WeicherGong), testTones)
        composeRule.onNodeWithText("Aufwärts").performScrollTo().assertIsSelected()
        composeRule.onNodeWithText("Weicher Gong").performScrollTo().assertIsNotSelected()
    }

    @Test
    fun `Jede Tonfolge hat einen eigenen Abspiel-Pfeil`() {
        showScreen()

        for (sequence in ToneSequence.entries) {
            composeRule.onNodeWithContentDescription("${sequence.label} anhören").performScrollTo().performClick()
        }

        assertEquals(ToneSequence.entries.toList(), testTones)
    }

    @Test
    fun `Tonfolgen lassen sich auch bei ausgeschalteter akustischer Erinnerung anhören`() {
        showScreen()

        composeRule.onNodeWithText("Akustische Erinnerung").performScrollTo().performClick()
        composeRule.onNodeWithText("Akustische Erinnerung").performScrollTo().assertIsOff()

        for (sequence in ToneSequence.entries) {
            composeRule.onNodeWithContentDescription("${sequence.label} anhören").performScrollTo()
                .assertIsEnabled()
                .performClick()
        }
        assertEquals(ToneSequence.entries.toList(), testTones)
    }

    @Test
    fun `Speichern übernimmt die Änderungen, bestätigt kurz und kehrt zur Schnelleingabe zurück`() {
        showScreen()

        composeRule.onNodeWithText("Verpasste Erinnerungen ausblenden").performScrollTo().performClick()
        composeRule.onNodeWithText("Speichern").performScrollTo().performClick()
        composeRule.waitForIdle()

        assertEquals("Einstellungen gespeichert.", ShadowToast.getTextOfLatestToast())
        assertEquals(1, backCount)
        assertTrue(runBlocking { database.settingsDao().currentSettings() }.hideMissedReminders)
    }

    @Test
    fun `Speicherfehler zeigt eine Fehlermeldung`() {
        val failingDao = object : SettingsDao {
            override suspend fun save(settings: AppSettings) =
                throw IllegalStateException("simulated storage failure")

            override fun observeRow(): Flow<AppSettings?> = flowOf(null)
            override suspend fun getRow(): AppSettings? = null
            override suspend fun rowCount(): Int = 0
        }
        showScreen(dao = failingDao)

        composeRule.onNodeWithText("Speichern").performScrollTo().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Speichern fehlgeschlagen. Die bisherigen Einstellungen bleiben aktiv.")
            .performScrollTo()
            .assertIsDisplayed()
        assertEquals("Bei einem Fehler bleiben die Optionen offen", 0, backCount)
    }
}
