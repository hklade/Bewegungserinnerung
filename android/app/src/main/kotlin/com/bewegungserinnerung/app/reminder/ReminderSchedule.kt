package com.bewegungserinnerung.app.reminder

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeParseException

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
