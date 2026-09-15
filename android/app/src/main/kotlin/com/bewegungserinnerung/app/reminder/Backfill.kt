package com.bewegungserinnerung.app.reminder

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.data.MovementEntryDao
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZONE)
private val WEEKDAY_FORMATTER = DateTimeFormatter.ofPattern("EEEE", Locale.GERMAN).withZone(ZONE)
private val TIMESTAMP_FORMATTER = DateTimeFormatter.ISO_INSTANT
const val UNANSWERED_ENTRY_TYPE = "unanswered"

/**
 * Creates a persisted `Unanswered` record for every eligible reminder slot from today (and up to
 * [lookbackDays] earlier days, to catch slots missed while the app/device was off) that is more
 * than 59 minutes in the past and still has no entry, per `android-reminder-scheduling`'s single
 * backfill rule (D6). Never runs as a side effect of a UI read — call this only from the
 * scheduled background job.
 *
 * The default of 3 days covers the common "off since Friday, next alarm fires Monday" case (Sat
 * and Sun are skipped anyway when weekdays-only is on, so 3 calendar days reaches back to the
 * prior Friday) without scanning indefinitely far into the past.
 *
 * Returns the number of `Unanswered` records created.
 */
suspend fun runBackfill(
    dao: MovementEntryDao,
    now: Instant,
    remindersEnabled: Boolean,
    weekdaysOnly: Boolean,
    startTime: String,
    endTime: String,
    lookbackDays: Int = 3,
): Int {
    if (!remindersEnabled) return 0

    val slotMinutes = buildReminderSlots(startTime, endTime).map { parseTimeToMinutes(it)!! }
    val today = now.atZone(ZONE).toLocalDate()
    var created = 0

    for (dayOffset in 0..lookbackDays) {
        val date = today.minusDays(dayOffset.toLong())
        if (!isWeekdayEligible(date.toString(), weekdaysOnly)) continue

        for (minutes in slotMinutes) {
            val slotInstant = slotInstantFor(date, minutes)
            val dateString = DATE_FORMATTER.format(slotInstant)
            val timeString = formatMinutesToTime(minutes)

            val entryCount = dao.entriesForSlot(date = dateString, reminderTime = timeString).size
            if (computeSlotStatus(slotTime = slotInstant, now = now, entryCount = entryCount) != SlotStatus.Unanswered) {
                continue
            }

            dao.insert(
                MovementEntry(
                    date = dateString,
                    weekday = WEEKDAY_FORMATTER.format(slotInstant),
                    reminderTime = timeString,
                    responseTime = null,
                    delayMinutes = null,
                    value = 0,
                    description = "Nicht beantwortet",
                    durationMinutes = null,
                    isAdditionalBreak = false,
                    entryType = UNANSWERED_ENTRY_TYPE,
                    note = "",
                    createdAt = TIMESTAMP_FORMATTER.format(now),
                ),
            )
            created++
        }
    }

    return created
}

private fun slotInstantFor(date: LocalDate, minutesOfDay: Int): Instant =
    ZonedDateTime.of(date, LocalTime.of(minutesOfDay / 60, minutesOfDay % 60), ZONE).toInstant()
