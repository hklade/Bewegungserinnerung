package com.bewegungserinnerung.app.ui.history

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import org.junit.Assert.assertEquals
import org.junit.Test

class ActivityHistoryTest {

    private fun entry(
        date: String = "2026-09-10",
        reminderTime: String = "08:55",
        responseTime: String? = "09:00",
        delayMinutes: Int? = 5,
        value: Int = 2,
        description: String = "Bewegung",
        isAdditionalBreak: Boolean = false,
        entryType: String = "planned_break_response",
        note: String = "",
        createdAt: String = "2026-09-10T07:00:00.000Z",
    ) = MovementEntry(
        date = date,
        weekday = "Donnerstag",
        reminderTime = reminderTime,
        responseTime = responseTime,
        delayMinutes = delayMinutes,
        value = value,
        description = description,
        durationMinutes = null,
        isAdditionalBreak = isAdditionalBreak,
        entryType = entryType,
        note = note,
        createdAt = createdAt,
    )

    @Test
    fun `Unbeantwortete Zeitfenster erscheinen als gewöhnliche Zeile in der Liste`() {
        val entries = listOf(
            entry(reminderTime = "08:55", entryType = "planned_break_response"),
            entry(reminderTime = "09:55", entryType = UNANSWERED_ENTRY_TYPE, responseTime = null, delayMinutes = null),
        )

        val history = toActivityHistory(entries)

        assertEquals(2, history.size)
        assertEquals(setOf("08:55", "09:55"), history.map { it.reminderTime }.toSet())
    }

    @Test
    fun `Unbeantwortete Einträge werden als Unanswered klassifiziert`() {
        val history = toActivityHistory(
            listOf(entry(entryType = UNANSWERED_ENTRY_TYPE, responseTime = null, delayMinutes = null)),
        )

        assertEquals(ActivityEntryType.Unanswered, history.single().type)
    }

    @Test
    fun `Primäre Einträge werden als Primary klassifiziert`() {
        val history = toActivityHistory(listOf(entry(isAdditionalBreak = false)))

        assertEquals(ActivityEntryType.Primary, history.single().type)
    }

    @Test
    fun `Zusätzliche Einträge werden als Additional klassifiziert`() {
        val history = toActivityHistory(listOf(entry(isAdditionalBreak = true)))

        assertEquals(ActivityEntryType.Additional, history.single().type)
    }

    @Test
    fun `Fehlende Verzögerung wird als null abgebildet für eine explizite Anzeige`() {
        val history = toActivityHistory(listOf(entry(responseTime = null, delayMinutes = null)))

        assertEquals(null, history.single().delayMinutes)
    }

    @Test
    fun `Abbildung in die Liste verändert die zugrunde liegenden Einträge nicht`() {
        val unanswered = entry(entryType = UNANSWERED_ENTRY_TYPE, responseTime = null, delayMinutes = null)
        val entries = listOf(entry(entryType = "planned_break_response"), unanswered)

        toActivityHistory(entries)

        // The day/week statistics (owned by android-day-week-evaluation) count every persisted
        // entry — this mapping only formats its own display projection, it never mutates or
        // deletes the underlying rows those counts read from.
        assertEquals(2, entries.size)
        assertEquals(UNANSWERED_ENTRY_TYPE, entries[1].entryType)
    }

    @Test
    fun `Einträge werden nach Datum und Erinnerungszeit absteigend sortiert`() {
        val entries = listOf(
            entry(date = "2026-09-09", reminderTime = "10:55"),
            entry(date = "2026-09-10", reminderTime = "08:55"),
            entry(date = "2026-09-10", reminderTime = "09:55"),
        )

        val history = toActivityHistory(entries)

        assertEquals(
            listOf("2026-09-10" to "09:55", "2026-09-10" to "08:55", "2026-09-09" to "10:55"),
            history.map { it.date to it.reminderTime },
        )
    }
}
