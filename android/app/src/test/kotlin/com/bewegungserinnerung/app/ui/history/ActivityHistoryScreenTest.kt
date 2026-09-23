package com.bewegungserinnerung.app.ui.history

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.bewegungserinnerung.app.reminder.ZONE
import java.time.ZonedDateTime
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

    @Test
    fun `Datum wird im Format TT MM JJJJ angezeigt`() {
        composeRule.setContent {
            ActivityHistoryScreen(entries = listOf(entry(reminderTime = "08:55")))
        }

        composeRule.onNodeWithText("10.09.2026", substring = true).assertIsDisplayed()
    }

    @Test
    fun `Heutiger Eintrag zeigt Heute statt des numerischen Datums`() {
        val now = ZonedDateTime.of(2026, 9, 10, 10, 0, 0, 0, ZONE).toInstant()

        composeRule.setContent {
            ActivityHistoryScreen(entries = listOf(entry(reminderTime = "08:55")), now = now)
        }

        composeRule.onNodeWithText("Heute", substring = true).assertIsDisplayed()
    }

    @Test
    fun `Gestriger Eintrag zeigt Gestern statt des numerischen Datums`() {
        val now = ZonedDateTime.of(2026, 9, 11, 10, 0, 0, 0, ZONE).toInstant()

        composeRule.setContent {
            ActivityHistoryScreen(entries = listOf(entry(reminderTime = "08:55")), now = now)
        }

        composeRule.onNodeWithText("Gestern", substring = true).assertIsDisplayed()
    }

    @Test
    fun `Älterer Eintrag zeigt weiterhin das numerische Datum`() {
        val now = ZonedDateTime.of(2026, 9, 20, 10, 0, 0, 0, ZONE).toInstant()

        composeRule.setContent {
            ActivityHistoryScreen(entries = listOf(entry(reminderTime = "08:55")), now = now)
        }

        composeRule.onNodeWithText("10.09.2026", substring = true).assertIsDisplayed()
    }
}
