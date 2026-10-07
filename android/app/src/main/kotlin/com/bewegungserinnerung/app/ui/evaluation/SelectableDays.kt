package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import java.time.LocalDate
import java.time.format.DateTimeParseException

private const val MAX_PAST_ACTIVE_DAYS = 13

/**
 * The days the user can pick for the evaluation: [today] (always, even without entries) followed
 * by the [MAX_PAST_ACTIVE_DAYS] most recent earlier days that have at least one entry, most
 * recent first.
 */
fun selectableDays(entries: List<MovementEntry>, today: LocalDate): List<LocalDate> {
    val pastActiveDays = entries
        .mapNotNull { entry -> parseDateOrNull(entry.date) }
        .filter { it < today }
        .distinct()
        .sortedDescending()
        .take(MAX_PAST_ACTIVE_DAYS)
    return listOf(today) + pastActiveDays
}

internal fun parseDateOrNull(isoDate: String): LocalDate? =
    try {
        LocalDate.parse(isoDate)
    } catch (e: DateTimeParseException) {
        null
    }
