package com.bewegungserinnerung.app.ui.history

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.UNANSWERED_ENTRY_TYPE
import com.bewegungserinnerung.app.reminder.ZONE
import java.time.Instant
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

private val GERMAN_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.GERMAN)

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

/**
 * Combines the relative/German-formatted date, planned time, and description/note into one line,
 * with no trailing whitespace when the description/note is blank. The description/note portion is
 * rendered bold; the date/time portion is not.
 */
fun ActivityHistoryEntry.firstLineText(now: Instant = Instant.now()): AnnotatedString {
    val descriptionOrNote = description.ifBlank { note }
    return buildAnnotatedString {
        append("${formatRelativeGermanDate(date, now)} $reminderTime")
        if (descriptionOrNote.isNotBlank()) {
            append(" · ")
            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                append(descriptionOrNote)
            }
        }
    }
}

/** Converts an ISO (`yyyy-MM-dd`) date string to German display format (`dd.MM.yyyy`); falls back to the original string if it isn't a parseable ISO date. */
fun formatGermanDate(isoDate: String): String =
    try {
        GERMAN_DATE_FORMATTER.format(LocalDate.parse(isoDate))
    } catch (e: DateTimeParseException) {
        isoDate
    }

/**
 * Converts an ISO (`yyyy-MM-dd`) date string to "Heute"/"Gestern" when it matches the current or
 * previous calendar day in [ZONE], falling back to [formatGermanDate] otherwise.
 */
fun formatRelativeGermanDate(isoDate: String, now: Instant = Instant.now()): String {
    val today = ZonedDateTime.ofInstant(now, ZONE).toLocalDate()
    return try {
        when (LocalDate.parse(isoDate)) {
            today -> "Heute"
            today.minusDays(1) -> "Gestern"
            else -> formatGermanDate(isoDate)
        }
    } catch (e: DateTimeParseException) {
        isoDate
    }
}

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
