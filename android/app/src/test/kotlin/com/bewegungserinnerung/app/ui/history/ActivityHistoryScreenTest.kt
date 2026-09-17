package com.bewegungserinnerung.app.ui.history

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import org.junit.Rule
import org.junit.Test
import org.robolectric.RobolectricTestRunner
import org.junit.runner.RunWith

@RunWith(RobolectricTestRunner::class)
class ActivityHistoryScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    private fun entry(reminderTime: String) = ActivityHistoryEntry(
        date = "2026-09-10",
        reminderTime = reminderTime,
        delayMinutes = 5,
        value = 2,
        description = "Bewegung",
        note = "",
        type = ActivityEntryType.Primary,
    )

    private fun entries(count: Int) = (count downTo 1).map { entry(reminderTime = "%02d:00".format(it)) }

    @Test
    fun `Standardansicht zeigt maximal die 5 neuesten Einträge`() {
        composeRule.setContent {
            ActivityHistoryScreen(entries = entries(8))
        }

        composeRule.onAllNodesWithTag("activity-history-row").assertCountEquals(5)
        composeRule.onNodeWithText("Mehr anzeigen").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `Mehr anzeigen erweitert die Liste bis zur oberen Grenze`() {
        composeRule.setContent {
            ActivityHistoryScreen(entries = entries(8))
        }

        composeRule.onNodeWithText("Mehr anzeigen").performScrollTo().performClick()

        composeRule.onAllNodesWithTag("activity-history-row").assertCountEquals(8)
        composeRule.onNodeWithText("Weniger anzeigen").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `Weniger anzeigen reduziert wieder auf 5 Einträge`() {
        composeRule.setContent {
            ActivityHistoryScreen(entries = entries(8))
        }

        composeRule.onNodeWithText("Mehr anzeigen").performScrollTo().performClick()
        composeRule.onNodeWithText("Weniger anzeigen").performScrollTo().performClick()

        composeRule.onAllNodesWithTag("activity-history-row").assertCountEquals(5)
        composeRule.onNodeWithText("Mehr anzeigen").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `Weniger als 5 Einträge zeigen keine Erweitern-Aktion`() {
        composeRule.setContent {
            ActivityHistoryScreen(entries = entries(3))
        }

        composeRule.onAllNodesWithTag("activity-history-row").assertCountEquals(3)
    }

    @Test
    fun `Fehlende Verzögerung zeigt einen expliziten Platzhalter`() {
        composeRule.setContent {
            ActivityHistoryScreen(entries = listOf(entry(reminderTime = "08:55").copy(delayMinutes = null)))
        }

        composeRule.onNodeWithText("–", substring = true).assertIsDisplayed()
    }
}
