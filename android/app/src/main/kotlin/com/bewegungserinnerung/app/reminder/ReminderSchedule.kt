package com.bewegungserinnerung.app.reminder

import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeParseException

private val ZONE = ZoneId.of("Europe/Vienna")
private const val MAX_LOOKAHEAD_DAYS = 14

private val DEFAULT_SLOTS = listOf(
    "07:55", "08:55", "09:55", "10:55", "11:55",
    "12:55", "13:55", "14:55", "15:55", "16:55",
)

private const val FALLBACK_END_MINUTES = 16 * 60

private val TIME_REGEX = Regex("""^(\d{1,2}):(\d{2})(?::\d{2})?$""")

internal fun parseTimeToMinutes(value: String): Int? {
    val match = TIME_REGEX.matchEntire(value.trim()) ?: return null
    val hours = match.groupValues[1].toInt()
    val minutes = match.groupValues[2].toInt()
    if (hours !in 0..23 || minutes !in 0..59) return null
    return hours * 60 + minutes
}

internal fun formatMinutesToTime(totalMinutes: Int): String {
    val normalized = ((totalMinutes % 1440) + 1440) % 1440
    val hours = (normalized / 60).toString().padStart(2, '0')
    val minutes = (normalized % 60).toString().padStart(2, '0')
    return "$hours:$minutes"
}

private fun buildSlotsFromStart(startMinutes: Int): List<String> {
    val slots = mutableListOf<String>()
    var minutes = startMinutes
    while (minutes <= FALLBACK_END_MINUTES) {
        slots.add(formatMinutesToTime(minutes))
        minutes += 60
    }
    return slots.ifEmpty { DEFAULT_SLOTS }
}

fun buildReminderSlots(startTime: String, endTime: String): List<String> {
    val startMinutes = parseTimeToMinutes(startTime) ?: return DEFAULT_SLOTS
    val endMinutes = parseTimeToMinutes(endTime)

    if (endMinutes == null || endMinutes < startMinutes) {
        return buildSlotsFromStart(startMinutes)
    }

    val slots = mutableListOf<String>()
    var minutes = startMinutes
    while (minutes <= endMinutes) {
        slots.add(formatMinutesToTime(minutes))
        minutes += 60
    }
    return slots.ifEmpty { buildSlotsFromStart(startMinutes) }
}

fun isWeekdayEligible(date: String, weekdaysOnly: Boolean): Boolean {
    if (!weekdaysOnly) return true

    val parsedDate = try {
        LocalDate.parse(date)
    } catch (e: DateTimeParseException) {
        return true
    }
    return parsedDate.dayOfWeek != DayOfWeek.SATURDAY && parsedDate.dayOfWeek != DayOfWeek.SUNDAY
}

/** The amount of time remaining until the next eligible reminder slot, or the disabled state. */
sealed class NextReminderCountdown {
    data class Eligible(val nextSlot: Instant, val remaining: Duration) : NextReminderCountdown()
    data object Disabled : NextReminderCountdown()
}

/**
 * Computes the next eligible reminder slot from `now` onward, honoring the reminders-enabled
 * flag and weekday eligibility, and skipping ahead to the next eligible day once today's slots
 * are exhausted.
 */
fun nextReminderCountdown(
    now: Instant,
    remindersEnabled: Boolean,
    weekdaysOnly: Boolean,
    startTime: String,
    endTime: String,
): NextReminderCountdown {
    if (!remindersEnabled) return NextReminderCountdown.Disabled

    val slotMinutes = buildReminderSlots(startTime, endTime).map { parseTimeToMinutes(it)!! }
    val today = now.atZone(ZONE).toLocalDate()

    for (dayOffset in 0..MAX_LOOKAHEAD_DAYS) {
        val date = today.plusDays(dayOffset.toLong())
        if (!isWeekdayEligible(date.toString(), weekdaysOnly)) continue

        val candidateMinutes = if (dayOffset == 0) {
            val nowMinutes = now.atZone(ZONE).let { it.hour * 60 + it.minute }
            slotMinutes.filter { it > nowMinutes }
        } else {
            slotMinutes
        }

        val nextMinutes = candidateMinutes.minOrNull() ?: continue
        val nextSlot = ZonedDateTime.of(date, LocalTime.of(nextMinutes / 60, nextMinutes % 60), ZONE).toInstant()
        return NextReminderCountdown.Eligible(nextSlot = nextSlot, remaining = Duration.between(now, nextSlot))
    }

    error("No eligible reminder slot found within $MAX_LOOKAHEAD_DAYS days")
}
