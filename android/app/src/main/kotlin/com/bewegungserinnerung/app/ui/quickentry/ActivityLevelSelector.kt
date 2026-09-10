package com.bewegungserinnerung.app.ui.quickentry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ActivityLevelSelector(
    selected: ActivityLevel,
    onSelect: (ActivityLevel) -> Unit,
    modifier: Modifier = Modifier,
) {
    val levels = ActivityLevel.entries
    val firstRow = levels.take(3)
    val secondRow = levels.drop(3)

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        LevelRow(levels = firstRow, selected = selected, onSelect = onSelect)
        LevelRow(levels = secondRow, selected = selected, onSelect = onSelect)
    }
}

@Composable
private fun LevelRow(
    levels: List<ActivityLevel>,
    selected: ActivityLevel,
    onSelect: (ActivityLevel) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        levels.forEach { level ->
            FilterChip(
                selected = level == selected,
                onClick = { onSelect(level) },
                label = { Text(level.label) },
            )
        }
    }
}
