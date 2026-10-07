package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ActivityAggregationTest {

    private val day = LocalDate.parse("2026-09-10")

    private fun entry(
        date: String = day.toString(),
        reminderTime: String = "08:55",
        value: Int = 2,
        entryType: String = "planned_break_response",
    ) = MovementEntry(
        date = date,
        weekday = "Donnerstag",
        reminderTime = reminderTime,
        responseTime = "09:00",
        delayMinutes = 5,
        value = value,
        description = "Bewegung",
        durationMinutes = null,
        isAdditionalBreak = false,
        entryType = entryType,
        note = "",
        createdAt = "2026-09-10T07:00:00.000Z",
    )

    // --- hourly chart ---

    @Test
    fun `Stundenwerte enthalten nur Stunden mit Einträgen, chronologisch`() {
        val entries = listOf(
            entry(reminderTime = "10:55", value = 4),
            entry(reminderTime = "08:55", value = 1),
        )

        val hours = hourlyActivity(entries, day)

        assertEquals(listOf(8, 10), hours.map { it.hour })
        assertEquals(listOf(1.0, 4.0), hours.map { it.averageValue })
    }

    @Test
    fun `Stundenwert ist der Durchschnitt aller Einträge der Stunde`() {
        val entries = listOf(
            entry(reminderTime = "08:55", value = 1),
            entry(reminderTime = "08:55", value = 4),
        )

        assertEquals(2.5, hourlyActivity(entries, day).single().averageValue, 0.0001)
    }

    @Test
    fun `Unbeantwortete Zeitfenster zählen nicht als Aktivität`() {
        val entries = listOf(entry(reminderTime = "09:55", value = 0, entryType = UNANSWERED_ENTRY_TYPE))

        assertTrue(hourlyActivity(entries, day).isEmpty())
    }

    @Test
    fun `Tag ohne Einträge liefert keine Stundenwerte`() {
        assertTrue(hourlyActivity(listOf(entry(date = "2026-09-09")), day).isEmpty())
    }

    // --- heatmap ---

    private val slots = listOf("07:55", "08:55", "09:55")

    @Test
    fun `Heatmap hat nur so viele Spalten wie aktive Tage, ältester links`() {
        val entries = listOf(entry(date = "2026-09-10"), entry(date = "2026-09-08"))

        val heatmap = weekHeatmap(entries, slots)

        assertEquals(listOf("2026-09-08", "2026-09-10").map(LocalDate::parse), heatmap.days)
    }

    @Test
    fun `Heatmap zeigt höchstens die 7 neuesten aktiven Tage`() {
        val entries = (1..9).map { entry(date = "2026-09-%02d".format(it)) }

        val heatmap = weekHeatmap(entries, slots)

        assertEquals(7, heatmap.days.size)
        assertEquals(LocalDate.parse("2026-09-03"), heatmap.days.first())
        assertEquals(LocalDate.parse("2026-09-09"), heatmap.days.last())
    }

    @Test
    fun `Heatmap-Zelle enthält Durchschnittswert und Anzahl der Einträge`() {
        val entries = listOf(
            entry(reminderTime = "08:55", value = 1),
            entry(reminderTime = "08:55", value = 4),
        )

        val cell = weekHeatmap(entries, slots).cell(day, "08:55")!!

        assertEquals(2.5, cell.averageValue, 0.0001)
        assertEquals(2, cell.count)
    }

    @Test
    fun `Kombination ohne Einträge hat keine Zelle statt eines Nullwerts`() {
        val heatmap = weekHeatmap(listOf(entry(reminderTime = "08:55", value = 0)), slots)

        assertNull(heatmap.cell(day, "07:55"))
        assertEquals(0.0, heatmap.cell(day, "08:55")!!.averageValue, 0.0001)
    }
}
