package com.bewegungserinnerung.app.reminder

import org.junit.Assert.assertEquals
import org.junit.Test

class ReminderScheduleTest {

    @Test
    fun `Standard-Zeitfenster erzeugt zehn Slots`() {
        val slots = buildReminderSlots(startTime = "07:55", endTime = "16:55")

        assertEquals(
            listOf(
                "07:55", "08:55", "09:55", "10:55", "11:55",
                "12:55", "13:55", "14:55", "15:55", "16:55",
            ),
            slots,
        )
    }

    @Test
    fun `Endzeit vor Startzeit fällt auf begrenztes Standardfenster zurück`() {
        val slots = buildReminderSlots(startTime = "10:00", endTime = "09:00")

        assertEquals(listOf("10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"), slots)
    }

    @Test
    fun `Nicht parsbare Start- oder Endzeit fällt auf das eingebaute Standardfenster zurück`() {
        val slots = buildReminderSlots(startTime = "not-a-time", endTime = "16:55")

        assertEquals(
            listOf(
                "07:55", "08:55", "09:55", "10:55", "11:55",
                "12:55", "13:55", "14:55", "15:55", "16:55",
            ),
            slots,
        )
    }

    @Test
    fun `Nur-Werktage aktiviert schließt Samstag und Sonntag aus`() {
        // 2026-09-12 is a Saturday, 2026-09-13 a Sunday, 2026-09-14 a Monday.
        assertEquals(false, isWeekdayEligible(date = "2026-09-12", weekdaysOnly = true))
        assertEquals(false, isWeekdayEligible(date = "2026-09-13", weekdaysOnly = true))
        assertEquals(true, isWeekdayEligible(date = "2026-09-14", weekdaysOnly = true))
    }

    @Test
    fun `Nur-Werktage deaktiviert schließt jeden Tag ein`() {
        assertEquals(true, isWeekdayEligible(date = "2026-09-12", weekdaysOnly = false))
        assertEquals(true, isWeekdayEligible(date = "2026-09-13", weekdaysOnly = false))
    }
}
