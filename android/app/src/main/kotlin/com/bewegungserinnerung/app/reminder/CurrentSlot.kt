package com.bewegungserinnerung.app.reminder

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

private val DEFAULT_START_TIME = "07:55"
private val DEFAULT_END_TIME = "16:55"
private val ZONE = ZoneId.of("Europe/Vienna")

/**
 * The most recently reached reminder slot for "now", or null if no slot has been
 * reached yet today or the day is ineligible. Settings (custom window, weekdays-only)
 * are owned by `add-android-settings-configuration`; this uses the built-in default
 * window until that capability exists.
 */
fun currentSlotInstant(now: Instant = Instant.now()): Instant? {
    val zonedNow = now.atZone(ZONE)
    val today = zonedNow.toLocalDate()

    if (!isWeekdayEligible(date = today.toString(), weekdaysOnly = true)) {
        return null
    }

    val slots = buildReminderSlots(startTime = DEFAULT_START_TIME, endTime = DEFAULT_END_TIME)
    val nowMinutes = zonedNow.hour * 60 + zonedNow.minute

    val currentSlot = slots
        .map { slot -> parseTimeToMinutes(slot)!! }
        .filter { it <= nowMinutes }
        .maxOrNull()
        ?: return null

    return dateTimeFor(today, currentSlot)
}

private fun dateTimeFor(date: LocalDate, minutesOfDay: Int): Instant {
    val time = LocalTime.of(minutesOfDay / 60, minutesOfDay % 60)
    return ZonedDateTime.of(date, time, ZONE).toInstant()
}
