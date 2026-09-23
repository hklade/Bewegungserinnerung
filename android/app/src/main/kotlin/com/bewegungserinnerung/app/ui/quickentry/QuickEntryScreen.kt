package com.bewegungserinnerung.app.ui.quickentry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
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
import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.data.MovementEntryDao
import com.bewegungserinnerung.app.ui.history.ActivityHistoryScreen
import com.bewegungserinnerung.app.ui.history.toActivityHistory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch

@Composable
fun QuickEntryScreen(
    viewModel: QuickEntryViewModel,
    currentSlotLabel: String?,
    modifier: Modifier = Modifier,
    exactAlarmPermissionGranted: Boolean = true,
    dao: MovementEntryDao? = null,
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    val entriesFlow: Flow<List<MovementEntry>> = dao?.observeAll() ?: emptyFlow()
    val entries by entriesFlow.collectAsState(initial = emptyList())

    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = 48.dp, start = 16.dp, end = 16.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (!exactAlarmPermissionGranted) {
            Text(
                text = "Erinnerungen können möglicherweise nicht pünktlich zugestellt werden, " +
                    "da die Berechtigung für exakte Alarme fehlt. Bitte in den Systemeinstellungen aktivieren.",
                color = MaterialTheme.colorScheme.error,
            )
        }

        Text(
            text = currentSlotLabel?.let { "Nächster Alarm: $it" } ?: "Keine aktive Erinnerung",
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

        ActivityHistoryScreen(entries = toActivityHistory(entries))
    }
}
