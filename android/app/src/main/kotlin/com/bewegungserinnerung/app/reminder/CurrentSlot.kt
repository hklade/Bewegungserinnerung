package com.bewegungserinnerung.app.reminder

import com.bewegungserinnerung.app.data.AppSettings
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime

/**
 * The most recently reached reminder slot for "now" under the given [settings] (window,
 * weekdays-only, reminders on/off), or null if reminders are off, no slot has been reached yet
 * today, or the day is ineligible.
 */
fun currentSlotInstant(now: Instant, settings: AppSettings): Instant? {
    if (!settings.remindersEnabled) return null

    val zonedNow = now.atZone(ZONE)
    val today = zonedNow.toLocalDate()

    if (!isWeekdayEligible(date = today.toString(), weekdaysOnly = settings.weekdaysOnly)) {
        return null
    }

    val slots = buildReminderSlots(startTime = settings.startTime, endTime = settings.endTime)
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
