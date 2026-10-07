package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DayStatsTest {

    private val day = LocalDate.parse("2026-09-10")

    private fun entry(
        date: String = day.toString(),
        reminderTime: String = "08:55",
        delayMinutes: Int? = 5,
        isAdditionalBreak: Boolean = false,
        entryType: String = "planned_break_response",
    ) = MovementEntry(
        date = date,
        weekday = "Donnerstag",
        reminderTime = reminderTime,
        responseTime = if (entryType == UNANSWERED_ENTRY_TYPE) null else "09:00",
        delayMinutes = delayMinutes,
        value = 2,
        description = "Bewegung",
        durationMinutes = null,
        isAdditionalBreak = isAdditionalBreak,
        entryType = entryType,
        note = "",
        createdAt = "2026-09-10T07:00:00.000Z",
    )

    private fun unanswered(reminderTime: String) = entry(
        reminderTime = reminderTime,
        delayMinutes = null,
        entryType = UNANSWERED_ENTRY_TYPE,
    )

    @Test
    fun `Gemischter Tag zählt geplante, zusätzliche und unbeantwortete Zeitfenster getrennt`() {
        val entries = listOf(
            entry(reminderTime = "07:55"),
            entry(reminderTime = "08:55"),
            entry(reminderTime = "08:55", isAdditionalBreak = true),
            unanswered("09:55"),
        )

        val stats = dayStats(entries, day)

        assertEquals(2, stats.primaryCount)
        assertEquals(1, stats.additionalCount)
        assertEquals(1, stats.unansweredCount)
    }

    @Test
    fun `Durchschnittliche Verzögerung berücksichtigt nur beantwortete Zeitfenster`() {
        val entries = listOf(
            entry(reminderTime = "07:55", delayMinutes = 4),
            entry(reminderTime = "08:55", delayMinutes = 10),
            unanswered("09:55"),
        )

        assertEquals(7.0, dayStats(entries, day).averageDelayMinutes!!, 0.0001)
    }

    @Test
    fun `Ohne beantwortete Zeitfenster gibt es keine durchschnittliche Verzögerung`() {
        val stats = dayStats(listOf(unanswered("09:55")), day)

        assertNull(stats.averageDelayMinutes)
    }

    @Test
    fun `Einträge anderer Tage werden nicht mitgezählt`() {
        val entries = listOf(entry(), entry(date = "2026-09-09"))

        assertEquals(1, dayStats(entries, day).primaryCount)
    }
}
