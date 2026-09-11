package com.bewegungserinnerung.app.reminder

import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CurrentSlotTest {

    private val zone = ZoneId.of("Europe/Vienna")

    @Test
    fun `Gibt null zurück vor dem ersten Zeitfenster des Tages`() {
        val now = ZonedDateTime.of(2026, 9, 10, 7, 0, 0, 0, zone).toInstant()

        assertNull(currentSlotInstant(now))
    }

    @Test
    fun `Gibt das zuletzt erreichte Zeitfenster zurück`() {
        val now = ZonedDateTime.of(2026, 9, 10, 9, 10, 0, 0, zone).toInstant()

        val slot = currentSlotInstant(now)

        assertEquals(
            ZonedDateTime.of(2026, 9, 10, 8, 55, 0, 0, zone).toInstant(),
            slot,
        )
    }

    @Test
    fun `Gibt null zurück am Wochenende`() {
        // 2026-09-12 is a Saturday.
        val now = ZonedDateTime.of(2026, 9, 12, 9, 10, 0, 0, zone).toInstant()

        assertNull(currentSlotInstant(now))
    }
}
