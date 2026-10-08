package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import java.time.LocalDate
import java.time.format.DateTimeParseException

private const val WINDOW_DAYS = 14

/**
 * The days the user can pick for the evaluation: [today] (always, even without entries) plus
 * every other day of the last [WINDOW_DAYS] calendar days that has at least one entry, most
 * recent first.
 */
fun selectableDays(entries: List<MovementEntry>, today: LocalDate): List<LocalDate> {
    val oldest = today.minusDays(WINDOW_DAYS - 1L)
    val activeDays = entries
        .mapNotNull { entry -> parseDateOrNull(entry.date) }
        .filter { it < today && it >= oldest }
        .distinct()
        .sortedDescending()
    return listOf(today) + activeDays
}

internal fun parseDateOrNull(isoDate: String): LocalDate? =
    try {
        LocalDate.parse(isoDate)
    } catch (e: DateTimeParseException) {
        null
    }
