package com.bewegungserinnerung.app.reminder

import java.time.Duration
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Test

class ReminderCountdownTest {

    private val zone = ZoneId.of("Europe/Vienna")

    @Test
    fun `Countdown zeigt die verbleibende Zeit bis zum nächsten Zeitfenster`() {
        val now = ZonedDateTime.of(2026, 9, 10, 8, 10, 0, 0, zone).toInstant()

        val countdown = nextReminderCountdown(
            now = now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "16:55",
        )

        assertEquals(
            NextReminderCountdown.Eligible(
                nextSlot = ZonedDateTime.of(2026, 9, 10, 8, 55, 0, 0, zone).toInstant(),
                remaining = Duration.ofMinutes(45),
            ),
            countdown,
        )
    }

    @Test
    fun `Countdown zeigt deaktiviert-Zustand wenn Erinnerungen ausgeschaltet sind`() {
        val now = ZonedDateTime.of(2026, 9, 10, 8, 10, 0, 0, zone).toInstant()

        val countdown = nextReminderCountdown(
            now = now,
            remindersEnabled = false,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "16:55",
        )

        assertEquals(NextReminderCountdown.Disabled, countdown)
    }

    @Test
    fun `Countdown überspringt das Wochenende und zeigt den nächsten Werktag`() {
        // 2026-09-12 is a Saturday; the next eligible day is Monday 2026-09-14.
        val now = ZonedDateTime.of(2026, 9, 12, 8, 10, 0, 0, zone).toInstant()

        val countdown = nextReminderCountdown(
            now = now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "16:55",
        )

        assertEquals(
            NextReminderCountdown.Eligible(
                nextSlot = ZonedDateTime.of(2026, 9, 14, 7, 55, 0, 0, zone).toInstant(),
                remaining = Duration.between(now, ZonedDateTime.of(2026, 9, 14, 7, 55, 0, 0, zone).toInstant()),
            ),
            countdown,
        )
    }

    @Test
    fun `Countdown nach dem letzten Zeitfenster springt zum nächsten Tag`() {
        val now = ZonedDateTime.of(2026, 9, 10, 17, 30, 0, 0, zone).toInstant()

        val countdown = nextReminderCountdown(
            now = now,
            remindersEnabled = true,
            weekdaysOnly = true,
            startTime = "07:55",
            endTime = "16:55",
        )

        assertEquals(
            NextReminderCountdown.Eligible(
                nextSlot = ZonedDateTime.of(2026, 9, 11, 7, 55, 0, 0, zone).toInstant(),
                remaining = Duration.between(now, ZonedDateTime.of(2026, 9, 11, 7, 55, 0, 0, zone).toInstant()),
            ),
            countdown,
        )
    }

}
