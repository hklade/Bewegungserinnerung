package com.bewegungserinnerung.app.ui.history

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE

enum class ActivityEntryType {
    Primary,
    Additional,
    Unanswered,
}

data class ActivityHistoryEntry(
    val date: String,
    val reminderTime: String,
    val delayMinutes: Int?,
    val value: Int,
    val description: String,
    val note: String,
    val type: ActivityEntryType,
)

private fun MovementEntry.toActivityHistoryEntry() = ActivityHistoryEntry(
    date = date,
    reminderTime = reminderTime,
    delayMinutes = delayMinutes,
    value = value,
    description = description,
    note = note,
    type = when {
        entryType == UNANSWERED_ENTRY_TYPE -> ActivityEntryType.Unanswered
        isAdditionalBreak -> ActivityEntryType.Additional
        else -> ActivityEntryType.Primary
    },
)

/**
 * Maps persisted movement entries to the activity-history display model, including `Unanswered`
 * slots as ordinary rows (they still count in the day/week statistics owned by
 * `android-day-week-evaluation`; this list only formats a display projection, it never mutates
 * the underlying rows those counts read from), ordered most-recent first.
 */
fun toActivityHistory(entries: List<MovementEntry>): List<ActivityHistoryEntry> =
    entries
        .asSequence()
        .map { it.toActivityHistoryEntry() }
        .sortedWith(compareByDescending<ActivityHistoryEntry> { it.date }.thenByDescending { it.reminderTime })
        .toList()
