package com.bewegungserinnerung.app.ui.quickentry

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import com.bewegungserinnerung.app.reminder.ZONE
import com.bewegungserinnerung.app.ui.evaluation.HEATMAP_CELL_TAG
import com.bewegungserinnerung.app.ui.hydration.HydrationViewModel
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class QuickEntryScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var database: AppDatabase

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

    @Test
    fun `Aktive Slot-Zeit wird angezeigt wenn ein Erinnerungs-Zeitfenster aktuell ist`() {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
            currentSlotTime = slotTime,
        )

        composeRule.setContent {
            QuickEntryScreen(viewModel = viewModel, currentSlotLabel = "08:55")
        }

        composeRule.onNodeWithText("Nächster Alarm: 08:55").assertIsDisplayed()
    }

    @Test
    fun `Keine aktive Erinnerung wird explizit angezeigt wenn kein Zeitfenster aktuell ist`() {
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = Clock.fixed(Instant.parse("2026-09-10T08:55:00Z"), ZoneOffset.UTC),
            currentSlotTime = Instant.parse("2026-09-10T08:55:00Z"),
        )

        composeRule.setContent {
            QuickEntryScreen(viewModel = viewModel, currentSlotLabel = null)
        }

        composeRule.onNodeWithText("Keine aktive Erinnerung").assertIsDisplayed()
    }

    @Test
    fun `Eintippen einer Notiz und Speichern übernimmt sie unverändert`() {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
            currentSlotTime = slotTime,
        )

        composeRule.setContent {
            QuickEntryScreen(viewModel = viewModel, currentSlotLabel = "08:55")
        }

        composeRule.onNodeWithText("Notiz").performTextInput("Kurzer Spaziergang")
        composeRule.onNodeWithText("Speichern").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Notiz").assertIsDisplayed()
    }

    @Test
    fun `Neu gespeicherter Eintrag erscheint im Aktivitätsverlauf ohne Neustart`() {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
            currentSlotTime = slotTime,
        )

        composeRule.setContent {
            QuickEntryScreen(
                viewModel = viewModel,
                currentSlotLabel = "08:55",
                dao = database.movementEntryDao(),
            )
        }

        composeRule.onNodeWithText("Notiz").performTextInput("Kurzer Spaziergang")
        composeRule.onNodeWithText("Speichern").performClick()
        composeRule.waitForIdle()

        composeRule.onAllNodesWithText("Kurzer Spaziergang", substring = true)
            .assertCountEquals(1)[0]
            .performScrollTo()
            .assertIsDisplayed()
    }

    @Test
    fun `Trinkmanager ist Teil der Schnelleingabe`() {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC)
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = clock,
            currentSlotTime = slotTime,
        )
        val hydrationViewModel = HydrationViewModel(
            dao = database.hydrationEntryDao(),
            clock = clock,
            zone = ZoneOffset.UTC,
        )

        composeRule.setContent {
            QuickEntryScreen(
                viewModel = viewModel,
                currentSlotLabel = "08:55",
                hydrationViewModel = hydrationViewModel,
            )
        }

        composeRule.onNodeWithText("Trinkmanager").assertExists()
        composeRule.onNodeWithText("0 ml / 2000 ml").assertExists()
    }

    @Test
    fun `Aktivitätsauswertung zeigt die gespeicherten Einträge mit den konfigurierten Zeitfenstern`() {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
            currentSlotTime = slotTime,
        )
        runBlocking {
            database.movementEntryDao().insert(
                MovementEntry(
                    date = LocalDate.now(ZONE).toString(),
                    weekday = "Donnerstag",
                    reminderTime = "11:11",
                    responseTime = "11:15",
                    delayMinutes = 4,
                    value = 3,
                    description = "Bewegung",
                    durationMinutes = null,
                    isAdditionalBreak = false,
                    entryType = "planned_break_response",
                    note = "",
                    createdAt = "2026-09-10T07:00:00Z",
                ),
            )
        }

        composeRule.setContent {
            QuickEntryScreen(
                viewModel = viewModel,
                currentSlotLabel = "08:55",
                dao = database.movementEntryDao(),
                reminderSlots = listOf("11:11"),
            )
        }
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithTag(HEATMAP_CELL_TAG).fetchSemanticsNodes().size == 1
        }

        composeRule.onNodeWithText("Aktivitätsauswertung").assertExists()
        composeRule.onNodeWithText("Geplant: 1").assertExists()
    }

    @Test
    fun `Verpasste Erinnerungen ausblenden wirkt ohne Neustart`() {
        val slotTime = Instant.parse("2026-09-10T08:55:00Z")
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = Clock.fixed(slotTime.plusSeconds(60), ZoneOffset.UTC),
            currentSlotTime = slotTime,
        )
        runBlocking {
            database.movementEntryDao().insert(
                MovementEntry(
                    date = "2026-09-10",
                    weekday = "Donnerstag",
                    reminderTime = "07:55",
                    responseTime = null,
                    delayMinutes = null,
                    value = 0,
                    description = "Nicht beantwortet",
                    durationMinutes = null,
                    isAdditionalBreak = false,
                    entryType = UNANSWERED_ENTRY_TYPE,
                    note = "",
                    createdAt = "2026-09-10T07:00:00Z",
                ),
            )
        }
        var hideMissed by mutableStateOf(false)

        composeRule.setContent {
            QuickEntryScreen(
                viewModel = viewModel,
                currentSlotLabel = "08:55",
                dao = database.movementEntryDao(),
                hideMissedReminders = hideMissed,
            )
        }
        // Room delivers the observed entries asynchronously, outside Compose's idling.
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithTag("activity-history-row").fetchSemanticsNodes().size == 1
        }

        hideMissed = true
        composeRule.waitForIdle()

        composeRule.onAllNodesWithTag("activity-history-row").assertCountEquals(0)
    }
}
