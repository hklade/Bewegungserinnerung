package com.bewegungserinnerung.app.ui

import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
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
                quickEntry = { openSettings ->
                    Button(onClick = openSettings) { Text("Schnelleingabe-Inhalt") }
                },
                settings = { back ->
                    Button(onClick = back) { Text("Optionen-Inhalt") }
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
}
