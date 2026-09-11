package com.bewegungserinnerung.app.reminder

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class SlotStatusTest {

    private val slotTime = Instant.parse("2026-09-10T08:55:00Z")

    @Test
    fun `Zeitfenster dessen Zeit noch nicht erreicht ist hat Status Pending`() {
        val now = slotTime.minusSeconds(60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 0)

        assertEquals(SlotStatus.Pending, status)
    }

    @Test
    fun `Zeitfenster über 59 Minuten überfällig ohne Eintrag hat Status Unanswered`() {
        val now = slotTime.plusSeconds(60 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 0)

        assertEquals(SlotStatus.Unanswered, status)
    }

    @Test
    fun `Zeitfenster innerhalb von 59 Minuten ohne Eintrag hat weiterhin Status Pending`() {
        val now = slotTime.plusSeconds(59 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 0)

        assertEquals(SlotStatus.Pending, status)
    }

    @Test
    fun `Zeitfenster mit genau einem Eintrag hat Status Answered`() {
        val now = slotTime.plusSeconds(5 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 1)

        assertEquals(SlotStatus.Answered, status)
    }

    @Test
    fun `Zeitfenster mit mehr als einem Eintrag hat Status AnsweredWithExtra`() {
        val now = slotTime.plusSeconds(5 * 60)

        val status = computeSlotStatus(slotTime = slotTime, now = now, entryCount = 2)

        assertEquals(SlotStatus.AnsweredWithExtra, status)
    }
}
