package com.bewegungserinnerung.app.ui.evaluation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.ui.history.formatGermanDate
import java.time.LocalDate
import java.util.Locale

const val HEATMAP_DAY_TAG = "evaluation-heatmap-day"
const val HEATMAP_CELL_TAG = "evaluation-heatmap-cell"
const val HEATMAP_EMPTY_CELL_TAG = "evaluation-heatmap-empty-cell"

private val CELL_SIZE = 32.dp
private const val MAX_ACTIVITY_VALUE = 4.0

/**
 * The "Letzte aktive Tage" screen: the 7-day heatmap by reminder [slots]. Like the other
 * screens, it relies on its host (or a scrollable parent) for scrolling.
 */
@Composable
fun WeekHeatmapScreen(
    entries: List<MovementEntry>,
    slots: List<String>,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val heatmap = weekHeatmap(entries, slots)
    var inspected by remember { mutableStateOf<Triple<LocalDate, String, HeatmapCell>?>(null) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Zurück" }) {
                Text("←", style = MaterialTheme.typography.titleLarge)
            }
            Text("Letzte aktive Tage", style = MaterialTheme.typography.titleLarge)
        }

        if (heatmap.days.isEmpty()) {
            Text("Noch keine aktiven Tage")
            return@Column
        }

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
                        val alpha = 0.15f + 0.85f * (cell.averageValue / MAX_ACTIVITY_VALUE).toFloat().coerceIn(0f, 1f)
                        Box(
                            modifier = Modifier
                                .testTag(HEATMAP_CELL_TAG)
                                .size(CELL_SIZE)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = alpha))
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
