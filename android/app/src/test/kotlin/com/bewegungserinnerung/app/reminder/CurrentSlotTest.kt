package com.bewegungserinnerung.app.reminder

import com.bewegungserinnerung.app.data.AppSettings
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

        assertNull(currentSlotInstant(now, AppSettings()))
    }

    @Test
    fun `Gibt das zuletzt erreichte Zeitfenster zurück`() {
        val now = ZonedDateTime.of(2026, 9, 10, 9, 10, 0, 0, zone).toInstant()

        val slot = currentSlotInstant(now, AppSettings())

        assertEquals(
            ZonedDateTime.of(2026, 9, 10, 8, 55, 0, 0, zone).toInstant(),
            slot,
        )
    }

    @Test
    fun `Gibt null zurück am Wochenende`() {
        // 2026-09-12 is a Saturday.
        val now = ZonedDateTime.of(2026, 9, 12, 9, 10, 0, 0, zone).toInstant()

        assertNull(currentSlotInstant(now, AppSettings()))
    }

    @Test
    fun `Ohne aktive Erinnerungen gibt es kein aktuelles Zeitfenster`() {
        val now = ZonedDateTime.of(2026, 9, 10, 9, 10, 0, 0, zone).toInstant()

        assertNull(currentSlotInstant(now, AppSettings(remindersEnabled = false)))
    }

    @Test
    fun `Eigenes Zeitfenster bestimmt das aktuelle Zeitfenster`() {
        val now = ZonedDateTime.of(2026, 9, 10, 9, 10, 0, 0, zone).toInstant()

        val slot = currentSlotInstant(now, AppSettings(startTime = "08:30", endTime = "15:30"))

        assertEquals(ZonedDateTime.of(2026, 9, 10, 8, 30, 0, 0, zone).toInstant(), slot)
    }

    @Test
    fun `Am Wochenende gibt es ein Zeitfenster, wenn nicht nur Werktage gelten`() {
        // 2026-09-12 is a Saturday.
        val now = ZonedDateTime.of(2026, 9, 12, 9, 10, 0, 0, zone).toInstant()

        val slot = currentSlotInstant(now, AppSettings(weekdaysOnly = false))

        assertEquals(ZonedDateTime.of(2026, 9, 12, 8, 55, 0, 0, zone).toInstant(), slot)
    }
}
