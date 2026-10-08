package com.bewegungserinnerung.app.ui.evaluation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.bewegungserinnerung.app.data.MovementEntry
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class WeekHeatmapScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val slots = listOf("07:55", "08:55", "09:55")

    private fun entry(date: String = "2026-09-10", reminderTime: String = "08:55") = MovementEntry(
        date = date,
        weekday = "Donnerstag",
        reminderTime = reminderTime,
        responseTime = "09:00",
        delayMinutes = 5,
        value = 2,
        description = "Bewegung",
        durationMinutes = null,
        isAdditionalBreak = false,
        entryType = "planned_break_response",
        note = "",
        createdAt = "2026-09-10T07:00:00.000Z",
    )

    private var wentBack = false

    private fun show(entries: List<MovementEntry>) = composeRule.setContent {
        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
            WeekHeatmapScreen(entries = entries, slots = slots, onBack = { wentBack = true })
        }
    }

    @Test
    fun `Heatmap hat eine Spalte pro aktivem Tag`() {
        show(listOf(entry(date = "2026-09-08"), entry(date = "2026-09-10")))

        composeRule.onAllNodesWithTag(HEATMAP_DAY_TAG).assertCountEquals(2)
    }

    @Test
    fun `Leere Heatmap-Zellen sind von Zellen mit Daten unterscheidbar`() {
        show(listOf(entry(reminderTime = "08:55")))

        composeRule.onAllNodesWithTag(HEATMAP_CELL_TAG).assertCountEquals(1)
        composeRule.onAllNodesWithTag(HEATMAP_EMPTY_CELL_TAG).assertCountEquals(2)
    }

    @Test
    fun `Antippen einer Heatmap-Zelle zeigt die Anzahl der Einträge`() {
        show(listOf(entry(reminderTime = "08:55"), entry(reminderTime = "08:55").copy(isAdditionalBreak = true)))

        composeRule.onNodeWithTag(HEATMAP_CELL_TAG).performScrollTo().performClick()

        composeRule.onNodeWithText("2 Einträge", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `Ohne aktive Tage erscheint eine Leermeldung`() {
        show(emptyList())

        composeRule.onNodeWithText("Noch keine aktiven Tage").assertIsDisplayed()
    }

    @Test
    fun `Zurück-Schaltfläche führt zurück`() {
        show(emptyList())

        composeRule.onNodeWithContentDescription("Zurück").performClick()

        assertTrue(wentBack)
    }
}
