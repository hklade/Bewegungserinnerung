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
 * Creates a persisted `Unanswered` record for every eligible reminder slot from today that is
 * more than 59 minutes in the past, still has no entry, and is followed later that same day by a
 * real entry — per `android-reminder-scheduling`'s single backfill rule (D6). A slot with no
 * later entry that day is treated as the end of the user's workday, not a missed reminder, and is
 * left unfilled (see that requirement's "Trailing slots after the day's last entry" scenario) —
 * this also means backfill never looks at days before today: once a day has ended without a
 * later entry, it stays as-is, and the next day starts independently. Never runs as a side effect
 * of a UI read — call this only from the scheduled background job.
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
): Int {
    if (!remindersEnabled) return 0

    val today = now.atZone(ZONE).toLocalDate()
    if (!isWeekdayEligible(today.toString(), weekdaysOnly)) return 0

    val slotMinutes = buildReminderSlots(startTime, endTime).map { parseTimeToMinutes(it)!! }
    var created = 0

    for (minutes in slotMinutes) {
        val slotInstant = slotInstantFor(today, minutes)
        val dateString = DATE_FORMATTER.format(slotInstant)
        val timeString = formatMinutesToTime(minutes)

        val entryCount = dao.entriesForSlot(date = dateString, reminderTime = timeString).size
        if (computeSlotStatus(slotTime = slotInstant, now = now, entryCount = entryCount) != SlotStatus.Unanswered) {
            continue
        }
        if (!dao.hasRealEntryLaterThan(date = dateString, afterReminderTime = timeString)) {
            // No entry after this slot that day: the user ended their workday here rather
            // than missing a reminder, so this and every later slot that day stay unfilled.
            break
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

    return created
}

private fun slotInstantFor(date: LocalDate, minutesOfDay: Int): Instant =
    ZonedDateTime.of(date, LocalTime.of(minutesOfDay / 60, minutesOfDay % 60), ZONE).toInstant()
