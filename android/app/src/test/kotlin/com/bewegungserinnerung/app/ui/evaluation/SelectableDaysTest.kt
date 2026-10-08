package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class SelectableDaysTest {

    private val today = LocalDate.parse("2026-09-10")

    private fun entry(date: String) = MovementEntry(
        date = date,
        weekday = "Donnerstag",
        reminderTime = "08:55",
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

    @Test
    fun `Heute ist auch ohne Einträge auswählbar`() {
        assertEquals(listOf(today), selectableDays(emptyList(), today))
    }

    @Test
    fun `Tage ohne Einträge werden ausgelassen und die Reihenfolge ist neueste zuerst`() {
        val entries = listOf(entry("2026-09-07"), entry("2026-09-09"), entry("2026-09-09"))

        assertEquals(
            listOf("2026-09-10", "2026-09-09", "2026-09-07").map(LocalDate::parse),
            selectableDays(entries, today),
        )
    }

    @Test
    fun `Heute erscheint nur einmal, wenn heute Einträge hat`() {
        assertEquals(listOf(today), selectableDays(listOf(entry("2026-09-10")), today))
    }

    @Test
    fun `Höchstens 13 frühere aktive Tage werden angeboten`() {
        val entries = (1L..20L).map { entry(today.minusDays(it).toString()) }

        val days = selectableDays(entries, today)

        assertEquals(14, days.size)
        assertEquals(today, days.first())
        assertEquals(today.minusDays(13), days.last())
    }
}
