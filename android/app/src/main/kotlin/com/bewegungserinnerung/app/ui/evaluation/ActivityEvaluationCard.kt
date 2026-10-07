package com.bewegungserinnerung.app.ui.evaluation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.reminder.ZONE
import com.bewegungserinnerung.app.ui.history.formatGermanDate
import com.bewegungserinnerung.app.ui.history.formatRelativeGermanDate
import java.time.Instant
import java.time.LocalDate
import java.util.Locale

const val DAY_PICKER_TAG = "evaluation-day-picker"
const val DAY_OPTION_TAG = "evaluation-day-option"
const val HOUR_BAR_TAG = "evaluation-hour-bar"
const val HEATMAP_DAY_TAG = "evaluation-heatmap-day"
const val HEATMAP_CELL_TAG = "evaluation-heatmap-cell"
const val HEATMAP_EMPTY_CELL_TAG = "evaluation-heatmap-empty-cell"

/** Highest activity level (`ActivityLevel.Active`), i.e. full intensity. */
private const val MAX_ACTIVITY_VALUE = 4.0
private val BAR_MAX_HEIGHT = 80.dp

/**
 * Day picker, per-day statistics and hourly bar chart for the selected day, plus the 7-day
 * heatmap over [slots] (the configured reminder times).
 */
@Composable
fun ActivityEvaluationCard(
    entries: List<MovementEntry>,
    slots: List<String>,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
    today: LocalDate = todayOf(now),
) {
    val days = selectableDays(entries, today)
    var selectedDay by remember { mutableStateOf(today) }
    val day = selectedDay.takeIf { it in days } ?: today

    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Aktivitätsauswertung", style = MaterialTheme.typography.labelLarge)
                DayPicker(days = days, selected = day, now = now, onSelect = { selectedDay = it })
            }
            DayStatsRow(dayStats(entries, day))
            HourlyChart(hourlyActivity(entries, day))
            Heatmap(weekHeatmap(entries, slots))
        }
    }
}

private fun todayOf(now: Instant): LocalDate =
    now.atZone(ZONE).toLocalDate()

@Composable
private fun DayPicker(days: List<LocalDate>, selected: LocalDate, now: Instant, onSelect: (LocalDate) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { open = true }, modifier = Modifier.testTag(DAY_PICKER_TAG)) {
            Text(formatRelativeGermanDate(selected.toString(), now))
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
private fun DayStatsRow(stats: DayStats) {
    val delay = stats.averageDelayMinutes?.let { String.format(Locale.GERMAN, "%.1f min", it) } ?: "–"
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text("Geplant: ${stats.primaryCount}", style = MaterialTheme.typography.bodyMedium)
        Text("Zusätzlich: ${stats.additionalCount}", style = MaterialTheme.typography.bodyMedium)
        Text("Nicht beantwortet: ${stats.unansweredCount}", style = MaterialTheme.typography.bodyMedium)
        Text("Ø Verzögerung: $delay", style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun HourlyChart(hours: List<HourlyActivity>) {
    if (hours.isEmpty()) {
        Text("Keine Einträge für diesen Tag", style = MaterialTheme.typography.bodyMedium)
        return
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        hours.forEach { hour ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .testTag(HOUR_BAR_TAG)
                        .width(20.dp)
                        .height(BAR_MAX_HEIGHT * intensity(hour.averageValue).coerceAtLeast(0.05f))
                        .background(MaterialTheme.colorScheme.primary),
                )
                Text("%02d".format(hour.hour), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun Heatmap(heatmap: WeekHeatmap) {
    if (heatmap.days.isEmpty()) return
    var inspected by remember { mutableStateOf<Triple<LocalDate, String, HeatmapCell>?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text("Letzte aktive Tage", style = MaterialTheme.typography.labelMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(modifier = Modifier.width(44.dp))
            heatmap.days.forEach { day ->
                Text(
                    "%02d.%02d.".format(day.dayOfMonth, day.monthValue),
                    modifier = Modifier.testTag(HEATMAP_DAY_TAG).width(CELL_SIZE),
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
        heatmap.slots.forEach { slot ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(slot, modifier = Modifier.width(44.dp), style = MaterialTheme.typography.labelSmall)
                heatmap.days.forEach { day ->
                    val cell = heatmap.cell(day, slot)
                    if (cell == null) {
                        Box(
                            modifier = Modifier
                                .testTag(HEATMAP_EMPTY_CELL_TAG)
                                .size(CELL_SIZE)
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .testTag(HEATMAP_CELL_TAG)
                                .size(CELL_SIZE)
                                .background(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.15f + 0.85f * intensity(cell.averageValue)),
                                )
                                .clickable { inspected = Triple(day, slot, cell) },
                        )
                    }
                }
            }
        }
        inspected?.let { (day, slot, cell) ->
            Text(
                "${formatGermanDate(day.toString())} $slot: ${cell.count} ${if (cell.count == 1) "Eintrag" else "Einträge"}, " +
                    "Ø Wert ${String.format(Locale.GERMAN, "%.1f", cell.averageValue)}",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

private val CELL_SIZE = 32.dp

private fun intensity(value: Double): Float = (value / MAX_ACTIVITY_VALUE).toFloat().coerceIn(0f, 1f)
