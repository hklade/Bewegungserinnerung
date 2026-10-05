package com.bewegungserinnerung.app.ui.hydration

import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertRangeInfoEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.HydrationEntry
import com.bewegungserinnerung.app.data.HydrationEntryDao
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@RunWith(RobolectricTestRunner::class)
class HydrationCardTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var database: AppDatabase

    private val clock = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneOffset.UTC)

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

    private fun showCard(loggedMl: Int? = null, dao: HydrationEntryDao = database.hydrationEntryDao()) {
        val viewModel = HydrationViewModel(dao = dao, clock = clock, zone = ZoneOffset.UTC)
        runBlocking {
            if (loggedMl != null) {
                dao.insert(HydrationEntry(date = "2026-09-10", hydrationMl = loggedMl, createdAt = "2026-09-10T07:00:00Z"))
            }
            viewModel.load()
        }
        composeRule.setContent { HydrationCard(viewModel = viewModel) }
    }

    @Test
    fun `Karte zeigt Tagesmenge und Tagesziel mit anteiligem Fortschritt`() {
        showCard(loggedMl = 500)

        composeRule.onNodeWithText("Trinkmanager").assertIsDisplayed()
        composeRule.onNodeWithText("500 ml / 2000 ml").assertIsDisplayed()
        composeRule.onNodeWithTag(HYDRATION_PROGRESS_TAG)
            .assertRangeInfoEquals(ProgressBarRangeInfo(current = 0.25f, range = 0f..1f))
    }

    @Test
    fun `Plus 250 ml aktualisiert die Anzeige sofort`() {
        showCard()

        composeRule.onNodeWithContentDescription("250 ml hinzufügen").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("250 ml / 2000 ml").assertIsDisplayed()
        composeRule.onNodeWithTag(HYDRATION_PROGRESS_TAG)
            .assertRangeInfoEquals(ProgressBarRangeInfo(current = 0.125f, range = 0f..1f))
    }

    @Test
    fun `Minus 250 ml aktualisiert die Anzeige sofort`() {
        showCard(loggedMl = 750)

        composeRule.onNodeWithContentDescription("250 ml entfernen").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("500 ml / 2000 ml").assertIsDisplayed()
    }

    @Test
    fun `Minus ist bei 0 ml deaktiviert`() {
        showCard()

        composeRule.onNodeWithContentDescription("250 ml entfernen").assertIsNotEnabled()
        composeRule.onNodeWithContentDescription("250 ml hinzufügen").assertIsEnabled()
    }

    @Test
    fun `Überlauf-Anzeige erscheint, wenn die Tagesmenge das Ziel übersteigt`() {
        showCard(loggedMl = 2500)

        composeRule.onNodeWithText("2500 ml / 2000 ml").assertIsDisplayed()
        composeRule.onNodeWithTag(HYDRATION_OVERFLOW_TAG).assertIsDisplayed()
        composeRule.onNodeWithText("+500 ml über dem Ziel").assertIsDisplayed()
        composeRule.onNodeWithTag(HYDRATION_PROGRESS_TAG)
            .assertRangeInfoEquals(ProgressBarRangeInfo(current = 1f, range = 0f..1f))
    }

    @Test
    fun `Genau am Ziel gibt es keine Überlauf-Anzeige`() {
        showCard(loggedMl = 2000)

        composeRule.onNodeWithTag(HYDRATION_OVERFLOW_TAG).assertDoesNotExist()
    }

    @Test
    fun `Unter dem Ziel gibt es keine Überlauf-Anzeige`() {
        showCard(loggedMl = 1750)

        composeRule.onNodeWithTag(HYDRATION_OVERFLOW_TAG).assertDoesNotExist()
    }

    @Test
    fun `Speicherfehler zeigt eine Fehlermeldung und die zuletzt gespeicherte Menge`() {
        val failingDao = object : HydrationEntryDao {
            override suspend fun insert(entry: HydrationEntry): Long =
                throw IllegalStateException("simulated storage failure")

            override suspend fun amountForDate(date: String): Int = 500
        }
        showCard(dao = failingDao)

        composeRule.onNodeWithContentDescription("250 ml hinzufügen").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("500 ml / 2000 ml").assertIsDisplayed()
        composeRule.onNodeWithText("Trinkmenge konnte nicht gespeichert werden.").assertIsDisplayed()
    }
}
