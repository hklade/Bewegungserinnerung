package com.bewegungserinnerung.app.ui.quickentry

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import java.time.Clock
import java.time.Instant
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

        composeRule.onNodeWithText("08:55").assertIsDisplayed()
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
}
