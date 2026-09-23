package com.bewegungserinnerung.app.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import java.time.Instant

private const val DEFAULT_VISIBLE_COUNT = 5
private const val EXPANDED_VISIBLE_COUNT = 20

@Composable
fun ActivityHistoryScreen(
    entries: List<ActivityHistoryEntry>,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now(),
) {
    var expanded by remember { mutableStateOf(false) }
    val visibleCount = if (expanded) EXPANDED_VISIBLE_COUNT else DEFAULT_VISIBLE_COUNT
    val visibleEntries = entries.take(visibleCount)
    val canExpand = entries.size > DEFAULT_VISIBLE_COUNT

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        visibleEntries.forEach { entry -> ActivityHistoryRow(entry, now) }

        if (canExpand) {
            TextButton(onClick = { expanded = !expanded }) {
                Text(if (expanded) "Weniger anzeigen" else "Mehr anzeigen")
            }
        }
    }
}

@Composable
private fun ActivityHistoryRow(entry: ActivityHistoryEntry, now: Instant) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("activity-history-row"),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(text = entry.firstLineText(now), style = MaterialTheme.typography.bodyMedium)
            Text(
                text = "Verzögerung: ${entry.delayMinutes?.let { "$it min" } ?: "–"} · " +
                    "Wert: ${entry.value} · ${entry.type.label()}",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

private fun ActivityEntryType.label(): String = when (this) {
    ActivityEntryType.Primary -> "Geplant"
    ActivityEntryType.Additional -> "Zusätzlich"
    ActivityEntryType.Unanswered -> "Nicht beantwortet"
}
