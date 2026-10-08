package com.bewegungserinnerung.app.ui.evaluation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.ZONE
import com.bewegungserinnerung.app.ui.history.formatRelativeGermanDate
import java.time.Instant
import java.time.LocalDate

const val DAY_PICKER_TAG = "evaluation-day-picker"
const val DAY_OPTION_TAG = "evaluation-day-option"
const val HOUR_BAR_TAG = "evaluation-hour-bar"
const val STAT_ANSWERED_TAG = "evaluation-stat-answered"
const val STAT_EXTRA_TAG = "evaluation-stat-extra"
const val STAT_MISSED_TAG = "evaluation-stat-missed"

private val BAR_MAX_HEIGHT = 48.dp

/** Bar colour per activity level 0–4 (none … active), matching the mockup's tones. */
private val LEVEL_COLORS = listOf(
    Color(0xFFB14D43),
    Color(0xFF99661F),
    Color(0xFFE37D2D),
    Color(0xFF375FD7),
    Color(0xFF086142),
)

/**
 * Compact day evaluation: day picker, per-day statistics and the hourly bar chart for the
 * selected day. [onOpenHeatmap] opens the separate week heatmap screen.
 */
@Composable
fun ActivityEvaluationCard(
    entries: List<MovementEntry>,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
    today: LocalDate = now.atZone(ZONE).toLocalDate(),
    onOpenHeatmap: (() -> Unit)? = null,
) {
    val days = selectableDays(entries, today)
    var selectedDay by remember { mutableStateOf(today) }
    val day = selectedDay.takeIf { it in days } ?: today
    val stats = dayStats(entries, day)

    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Aktivitätsauswertung",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelMedium,
                    letterSpacing = TITLE_LETTER_SPACING,
                )
                if (onOpenHeatmap != null) {
                    TextButton(
                        onClick = onOpenHeatmap,
                        modifier = Modifier.semantics { contentDescription = "Letzte aktive Tage" },
                    ) {
                        Text("📅", style = MaterialTheme.typography.titleMedium)
                    }
                }
                DayPicker(days = days, selected = day, now = now, onSelect = { selectedDay = it })
            }
            Row(modifier = Modifier.fillMaxWidth()) {
                Stat(STAT_ANSWERED_TAG, stats.primaryCount, "Beantwortet", MaterialTheme.colorScheme.primary)
                Stat(STAT_EXTRA_TAG, stats.additionalCount, "Extra", MaterialTheme.colorScheme.onSurface)
                Stat(STAT_MISSED_TAG, stats.unansweredCount, "Verpasst", MaterialTheme.colorScheme.error)
            }
            HourlyChart(hourlyActivity(entries, day))
        }
    }
}

private val TITLE_LETTER_SPACING = 1.sp

@Composable
private fun DayPicker(days: List<LocalDate>, selected: LocalDate, now: Instant, onSelect: (LocalDate) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        TextButton(onClick = { open = true }, modifier = Modifier.testTag(DAY_PICKER_TAG)) {
            Text(
                formatRelativeGermanDate(selected.toString(), now),
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
            )
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            days.forEach { day ->
                DropdownMenuItem(
                    text = { Text(formatRelativeGermanDate(day.toString(), now)) },
                    modifier = Modifier.testTag(DAY_OPTION_TAG),
                    onClick = {
                        onSelect(day)
                        open = false
                    },
                )
            }
        }
    }
}

@Composable
private fun RowScope.Stat(tag: String, count: Int, label: String, color: Color) {
    Column(
        modifier = Modifier
            .weight(1f)
            .testTag(tag)
            .semantics(mergeDescendants = true) {},
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(count.toString(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun HourlyChart(hours: List<HourlyActivity>) {
    if (hours.isEmpty()) {
        Text(
            "Keine Einträge für diesen Tag",
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyMedium,
        )
        return
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.Bottom,
    ) {
        hours.forEach { hour ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .testTag(HOUR_BAR_TAG)
                        .width(24.dp)
                        .height(BAR_MAX_HEIGHT * intensity(hour.averageValue).coerceAtLeast(0.1f))
                        .background(levelColor(hour.averageValue), RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp)),
                )
                Text("%02d".format(hour.hour), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

private fun levelColor(value: Double): Color = LEVEL_COLORS[Math.round(value).toInt().coerceIn(0, LEVEL_COLORS.lastIndex)]

private const val MAX_ACTIVITY_VALUE = 4.0

private fun intensity(value: Double): Float = (value / MAX_ACTIVITY_VALUE).toFloat().coerceIn(0f, 1f)
