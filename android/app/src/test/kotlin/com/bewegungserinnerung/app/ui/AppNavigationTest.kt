package com.bewegungserinnerung.app.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryScreen
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryViewModel
import com.bewegungserinnerung.app.ui.settings.SettingsScreen
import com.bewegungserinnerung.app.ui.settings.SettingsViewModel
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AppNavigationTest {

    @get:Rule
    val composeRule = createComposeRule()

    private fun showApp() {
        composeRule.setContent {
            AppNavigation(
                quickEntry = { openSettings, openHeatmap ->
                    Column {
                        Button(onClick = openSettings) { Text("Schnelleingabe-Inhalt") }
                        Button(onClick = openHeatmap) { Text("Wochenübersicht öffnen") }
                    }
                },
                settings = { back ->
                    Button(onClick = back) { Text("Optionen-Inhalt") }
                },
                heatmap = { back ->
                    Button(onClick = back) { Text("Wochenübersicht-Inhalt") }
                },
            )
        }
    }

    @Test
    fun `Beim Start wird die Schnelleingabe gezeigt, nicht die Optionen`() {
        showApp()

        composeRule.onNodeWithText("Schnelleingabe-Inhalt").assertIsDisplayed()
        composeRule.onNodeWithText("Optionen-Inhalt").assertDoesNotExist()
    }

    @Test
    fun `Eine Aktion öffnet die Optionen, Zurück führt zur Schnelleingabe`() {
        showApp()

        composeRule.onNodeWithText("Schnelleingabe-Inhalt").performClick()
        composeRule.onNodeWithText("Optionen-Inhalt").assertIsDisplayed()

        composeRule.onNodeWithText("Optionen-Inhalt").performClick()
        composeRule.onNodeWithText("Schnelleingabe-Inhalt").assertIsDisplayed()
    }

    @Test
    fun `Eine Aktion öffnet die Wochenübersicht, Zurück führt zur Schnelleingabe`() {
        showApp()

        composeRule.onNodeWithText("Wochenübersicht öffnen").performClick()
        composeRule.onNodeWithText("Wochenübersicht-Inhalt").assertIsDisplayed()

        composeRule.onNodeWithText("Wochenübersicht-Inhalt").performClick()
        composeRule.onNodeWithText("Schnelleingabe-Inhalt").assertIsDisplayed()
    }

    @Test
    fun `Nach dem Speichern der Optionen ist wieder die Schnelleingabe zu sehen`() {
        val database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
        try {
            val slotTime = Instant.parse("2026-09-10T08:55:00Z")
            val quickEntryViewModel = QuickEntryViewModel(
                dao = database.movementEntryDao(),
                clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
                currentSlotTime = slotTime,
            )
            val settingsViewModel = SettingsViewModel(dao = database.settingsDao())

            composeRule.setContent {
                AppNavigation(
                    quickEntry = { openSettings, _ ->
                        QuickEntryScreen(
                            viewModel = quickEntryViewModel,
                            currentSlotLabel = "08:55",
                            onOpenSettings = openSettings,
                        )
                    },
                    settings = { back ->
                        SettingsScreen(viewModel = settingsViewModel, onBack = back, onTestTone = {})
                    },
                    heatmap = { },
                )
            }

            composeRule.onNodeWithContentDescription("Optionen öffnen").performClick()
            composeRule.onNodeWithText("Optionen").assertIsDisplayed()

            composeRule.onNodeWithText("Speichern").performScrollTo().performClick()
            // Saving goes through Room asynchronously, outside Compose's idling, so wait for the
            // settings screen to be gone before asserting what replaced it.
            composeRule.waitUntil(timeoutMillis = 5_000) {
                composeRule.onAllNodesWithText("Optionen").fetchSemanticsNodes().isEmpty()
            }

            composeRule.onNodeWithText("Nächster Alarm: 08:55").assertIsDisplayed()
        } finally {
            composeRule.waitForIdle()
            database.close()
        }
    }
}
