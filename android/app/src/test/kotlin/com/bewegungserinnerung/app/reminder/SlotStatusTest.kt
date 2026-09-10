package com.bewegungserinnerung.app.reminder

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class SlotStatusTest {

    private val slotTime = Instant.parse("2026-09-10T08:55:00Z")

    @Test
    fun `slot with time not yet reached is Pending`() {
        val now = slotTime.minusSeconds(60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 0)

        assertEquals(SlotStatus.Pending, status)
    }

    @Test
    fun `slot more than 59 minutes past due with no entry is Unanswered`() {
        val now = slotTime.plusSeconds(60 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 0)

        assertEquals(SlotStatus.Unanswered, status)
    }

    @Test
    fun `slot within 59 minutes of due time with no entry is still Pending`() {
        val now = slotTime.plusSeconds(59 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 0)

        assertEquals(SlotStatus.Pending, status)
    }

    @Test
    fun `slot with exactly one entry is Answered`() {
        val now = slotTime.plusSeconds(5 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 1)

        assertEquals(SlotStatus.Answered, status)
    }

    @Test
    fun `slot with more than one entry is AnsweredWithExtra`() {
        val now = slotTime.plusSeconds(5 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 2)

        assertEquals(SlotStatus.AnsweredWithExtra, status)
    }
}
