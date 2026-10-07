package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.ui.history.ActivityEntryType
import com.bewegungserinnerung.app.ui.history.toActivityHistory
import java.time.LocalDate

data class DayStats(
    val primaryCount: Int,
    val additionalCount: Int,
    val unansweredCount: Int,
    /** Over answered slots only — `null` when the day has none. */
    val averageDelayMinutes: Double?,
)

/**
 * Counts per outcome for [date]. The outcome of each entry comes from the slot classification
 * already persisted with it (see [toActivityHistory]) — it is not re-derived here.
 */
fun dayStats(entries: List<MovementEntry>, date: LocalDate): DayStats {
    val dayEntries = toActivityHistory(entries.filter { it.date == date.toString() })
    val answered = dayEntries.filter { it.type != ActivityEntryType.Unanswered }
    return DayStats(
        primaryCount = dayEntries.count { it.type == ActivityEntryType.Primary },
        additionalCount = dayEntries.count { it.type == ActivityEntryType.Additional },
        unansweredCount = dayEntries.count { it.type == ActivityEntryType.Unanswered },
        averageDelayMinutes = answered.mapNotNull { it.delayMinutes }.average().takeUnless { it.isNaN() },
    )
}
