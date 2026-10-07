package com.bewegungserinnerung.app.ui.evaluation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import java.time.LocalDate
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ActivityEvaluationCardTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val today = LocalDate.parse("2026-09-10")
    private val slots = listOf("07:55", "08:55", "09:55")

    private fun entry(
        date: String = today.toString(),
        reminderTime: String = "08:55",
        value: Int = 2,
        delayMinutes: Int? = 5,
        isAdditionalBreak: Boolean = false,
        entryType: String = "planned_break_response",
    ) = MovementEntry(
        date = date,
        weekday = "Donnerstag",
        reminderTime = reminderTime,
        responseTime = "09:00",
        delayMinutes = delayMinutes,
        value = value,
        description = "Bewegung",
        durationMinutes = null,
        isAdditionalBreak = isAdditionalBreak,
        entryType = entryType,
        note = "",
        createdAt = "2026-09-10T07:00:00.000Z",
    )

    private fun show(entries: List<MovementEntry>) = composeRule.setContent {
        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
            ActivityEvaluationCard(entries = entries, slots = slots, today = today)
        }
    }

    @Test
    fun `Balkendiagramm zeigt nur Stunden mit Einträgen`() {
        show(listOf(entry(reminderTime = "07:55"), entry(reminderTime = "09:55")))

        composeRule.onAllNodesWithTag(HOUR_BAR_TAG).assertCountEquals(2)
    }

    @Test
    fun `Leerer Tag zeigt eine Leermeldung statt eines leeren Diagramms`() {
        show(emptyList())

        composeRule.onNodeWithText("Keine Einträge für diesen Tag").assertIsDisplayed()
        composeRule.onAllNodesWithTag(HOUR_BAR_TAG).assertCountEquals(0)
        composeRule.onAllNodesWithTag(HEATMAP_DAY_TAG).assertCountEquals(0)
        composeRule.onAllNodesWithTag(HEATMAP_EMPTY_CELL_TAG).assertCountEquals(0)
    }

    @Test
    fun `Statistik zeigt Anzahlen und durchschnittliche Verzögerung des gewählten Tages`() {
        show(
            listOf(
                entry(reminderTime = "07:55", delayMinutes = 4),
                entry(reminderTime = "08:55", delayMinutes = 10),
                entry(reminderTime = "08:55", delayMinutes = 12, isAdditionalBreak = true),
                entry(reminderTime = "09:55", delayMinutes = null, entryType = UNANSWERED_ENTRY_TYPE),
            ),
        )

        composeRule.onNodeWithText("Geplant: 2").assertIsDisplayed()
        composeRule.onNodeWithText("Zusätzlich: 1").assertIsDisplayed()
        composeRule.onNodeWithText("Nicht beantwortet: 1").assertIsDisplayed()
        composeRule.onNodeWithText("Ø Verzögerung: 8,7 min").assertIsDisplayed()
    }

    @Test
    fun `Tagesauswahl listet Heute und aktive Tage und wechselt die angezeigten Werte`() {
        show(listOf(entry(date = "2026-09-08", reminderTime = "07:55"), entry(date = "2026-09-08", reminderTime = "08:55")))

        composeRule.onAllNodesWithTag(HOUR_BAR_TAG).assertCountEquals(0)
        composeRule.onNodeWithTag(DAY_PICKER_TAG).performClick()
        composeRule.onAllNodesWithTag(DAY_OPTION_TAG).assertCountEquals(2)
        composeRule.onNodeWithText("08.09.2026").performClick()

        composeRule.onAllNodesWithTag(HOUR_BAR_TAG).assertCountEquals(2)
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
        show(listOf(entry(reminderTime = "08:55"), entry(reminderTime = "08:55", isAdditionalBreak = true)))

        composeRule.onNodeWithTag(HEATMAP_CELL_TAG).performScrollTo().performClick()

        composeRule.onNodeWithText("2 Einträge", substring = true).performScrollTo().assertIsDisplayed()
    }
}
