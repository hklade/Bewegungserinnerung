package com.bewegungserinnerung.app.ui.quickentry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun QuickEntryScreen(
    viewModel: QuickEntryViewModel,
    currentSlotLabel: String?,
    modifier: Modifier = Modifier,
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = currentSlotLabel ?: "Keine aktive Erinnerung",
            style = MaterialTheme.typography.titleMedium,
        )

        ActivityLevelSelector(
            selected = uiState.selectedLevel,
            onSelect = viewModel::selectLevel,
        )

        OutlinedTextField(
            value = uiState.note,
            onValueChange = viewModel::updateNote,
            label = { Text("Notiz") },
            modifier = Modifier.fillMaxWidth(),
        )

        if (uiState.hasError) {
            Text(
                text = "Speichern fehlgeschlagen. Bitte erneut versuchen.",
                color = MaterialTheme.colorScheme.error,
            )
        }

        Button(
            onClick = { scope.launch { viewModel.save() } },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Speichern")
        }
    }
}
