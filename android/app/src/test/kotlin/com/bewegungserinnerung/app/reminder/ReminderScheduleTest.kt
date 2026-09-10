package com.bewegungserinnerung.app.reminder

import org.junit.Assert.assertEquals
import org.junit.Test

class ReminderScheduleTest {

    @Test
    fun `default window produces ten slots`() {
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
    fun `end time earlier than start time falls back to bounded default window`() {
        val slots = buildReminderSlots(startTime = "10:00", endTime = "09:00")

        assertEquals(listOf("10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"), slots)
    }

    @Test
    fun `unparseable start or end time falls back to the built-in default window`() {
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
    fun `weekday-only enabled excludes saturday and sunday`() {
        // 2026-09-12 is a Saturday, 2026-09-13 a Sunday, 2026-09-14 a Monday.
        assertEquals(false, isWeekdayEligible(date = "2026-09-12", weekdaysOnly = true))
        assertEquals(false, isWeekdayEligible(date = "2026-09-13", weekdaysOnly = true))
        assertEquals(true, isWeekdayEligible(date = "2026-09-14", weekdaysOnly = true))
    }

    @Test
    fun `weekday-only disabled includes every day`() {
        assertEquals(true, isWeekdayEligible(date = "2026-09-12", weekdaysOnly = false))
        assertEquals(true, isWeekdayEligible(date = "2026-09-13", weekdaysOnly = false))
    }
}
