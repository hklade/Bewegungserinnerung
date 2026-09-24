package com.bewegungserinnerung.app.ui.hydration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

const val HYDRATION_PROGRESS_TAG = "hydration-progress"
const val HYDRATION_OVERFLOW_TAG = "hydration-overflow"

@Composable
fun HydrationCard(viewModel: HydrationViewModel, modifier: Modifier = Modifier) {
    val state by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    val overflowMl = state.amountMl - state.goalMl

    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Trinkmanager", style = MaterialTheme.typography.labelLarge)
                Text(
                    "${state.amountMl} ml / ${state.goalMl} ml",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilledTonalButton(
                    onClick = { scope.launch { viewModel.decrement() } },
                    enabled = state.canDecrement,
                    modifier = Modifier.semantics { contentDescription = "250 ml entfernen" },
                ) {
                    Text("−")
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    LinearProgressIndicator(
                        progress = { (state.amountMl.toFloat() / state.goalMl).coerceIn(0f, 1f) },
                        modifier = Modifier.fillMaxWidth().testTag(HYDRATION_PROGRESS_TAG),
                    )
                    if (overflowMl > 0) {
                        LinearProgressIndicator(
                            progress = { (overflowMl.toFloat() / state.goalMl).coerceIn(0f, 1f) },
                            color = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.fillMaxWidth().testTag(HYDRATION_OVERFLOW_TAG),
                        )
                    }
                }
                Button(
                    onClick = { scope.launch { viewModel.increment() } },
                    modifier = Modifier.semantics { contentDescription = "250 ml hinzufügen" },
                ) {
                    Text("+")
                }
            }

            if (overflowMl > 0) {
                Text(
                    "+$overflowMl ml über dem Ziel",
                    color = MaterialTheme.colorScheme.tertiary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            if (state.hasError) {
                Text(
                    "Trinkmenge konnte nicht gespeichert werden.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
