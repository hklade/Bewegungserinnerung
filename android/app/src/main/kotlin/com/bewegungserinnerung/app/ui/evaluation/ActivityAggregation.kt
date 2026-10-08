package com.bewegungserinnerung.app.ui.evaluation

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import java.time.LocalDate

private const val HEATMAP_DAYS = 7

data class HourlyActivity(val hour: Int, val averageValue: Double)

data class HeatmapCell(val averageValue: Double, val count: Int)

/** Rows are [slots] (reminder times), columns are [days] (oldest first). */
data class WeekHeatmap(
    val days: List<LocalDate>,
    val slots: List<String>,
    private val cells: Map<Pair<LocalDate, String>, HeatmapCell>,
) {
    /** `null` when nothing was logged for that day/slot — distinct from a logged value of 0. */
    fun cell(day: LocalDate, slot: String): HeatmapCell? = cells[day to slot]
}

/** Logged activity only: backfilled "unanswered" rows carry no activity value. */
private fun List<MovementEntry>.loggedActivity() = filter { it.entryType != UNANSWERED_ENTRY_TYPE }

/** Average activity value per hour of [date], for hours that have entries only, in hour order. */
fun hourlyActivity(entries: List<MovementEntry>, date: LocalDate): List<HourlyActivity> =
    entries
        .filter { it.date == date.toString() }
        .loggedActivity()
        .groupBy { it.reminderTime.substringBefore(':').toInt() }
        .map { (hour, hourEntries) -> HourlyActivity(hour, hourEntries.map { it.value }.average()) }
        .sortedBy { it.hour }

/** The most recent [HEATMAP_DAYS] days with logged activity, by [slots], from [entries]. */
fun weekHeatmap(entries: List<MovementEntry>, slots: List<String>): WeekHeatmap {
    val activity = entries.loggedActivity().mapNotNull { entry -> parseDateOrNull(entry.date)?.let { it to entry } }
    val days = activity.map { it.first }.distinct().sortedDescending().take(HEATMAP_DAYS).sorted()
    val cells = activity
        .filter { (date, entry) -> date in days && entry.reminderTime in slots }
        .groupBy({ (date, entry) -> date to entry.reminderTime }, { (_, entry) -> entry.value })
        .mapValues { (_, values) -> HeatmapCell(averageValue = values.average(), count = values.size) }
    return WeekHeatmap(days, slots, cells)
}
