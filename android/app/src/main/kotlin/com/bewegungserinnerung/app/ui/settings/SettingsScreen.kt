package com.bewegungserinnerung.app.ui.settings

import android.app.TimePickerDialog
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.bewegungserinnerung.app.reminder.ToneSequence
import com.bewegungserinnerung.app.reminder.parseTimeToMinutes
import kotlinx.coroutines.launch

/**
 * The "Optionen" screen. Every control edits [SettingsViewModel]'s draft only; nothing takes
 * effect until "Speichern" succeeds, which returns via [onBack]. The play
 * arrow next to each tone sequence is the test action: [onTestTone] plays that sequence without
 * touching any setting.
 */
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit,
    onTestTone: (ToneSequence) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsState()
    val draft = state.draft
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val pickExportLocation = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            // Keeps write access to the chosen folder across restarts, for the later export.
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
            viewModel.edit { it.copy(exportLocationUri = uri.toString()) }
        }
    }

    fun pickTime(current: String, onPicked: (String) -> Unit) {
        val minutes = parseTimeToMinutes(current) ?: 0
        TimePickerDialog(
            context,
            { _, hour, minute -> onPicked("%02d:%02d".format(hour, minute)) },
            minutes / 60,
            minutes % 60,
            true,
        ).show()
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(
                onClick = onBack,
                modifier = Modifier.semantics { contentDescription = "Zurück" },
            ) {
                Icon(BackArrow, contentDescription = null, modifier = Modifier.size(21.dp))
            }
            Text("Optionen", style = MaterialTheme.typography.titleLarge)
        }

        SettingsCard("Erinnerungen") {
            SwitchRow("Stündliche Erinnerung", draft.remindersEnabled) { enabled ->
                viewModel.edit { it.copy(remindersEnabled = enabled) }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("Zeitfenster", modifier = Modifier.weight(1f))
                OutlinedButton(onClick = { pickTime(draft.startTime) { t -> viewModel.edit { it.copy(startTime = t) } } }) {
                    Text(draft.startTime)
                }
                Text("bis")
                OutlinedButton(onClick = { pickTime(draft.endTime) { t -> viewModel.edit { it.copy(endTime = t) } } }) {
                    Text(draft.endTime)
                }
            }
            SwitchRow("Nur Werktage", draft.weekdaysOnly) { weekdaysOnly ->
                viewModel.edit { it.copy(weekdaysOnly = weekdaysOnly) }
            }
        }

        SettingsCard("Trinkmanager") {
            OutlinedTextField(
                value = state.hydrationGoalInput,
                onValueChange = viewModel::setHydrationGoalInput,
                label = { Text("Tagesziel in Litern") },
                supportingText = { Text("Standard 2 Liter") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        SettingsCard("Ton") {
            SwitchRow("Akustische Erinnerung", draft.toneEnabled) { enabled ->
                viewModel.edit { it.copy(toneEnabled = enabled) }
            }
            ToneSequence.entries.forEach { sequence ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .weight(1f)
                            .selectable(
                                selected = draft.toneSequence == sequence,
                                role = Role.RadioButton,
                                onClick = { viewModel.edit { it.copy(toneSequence = sequence) } },
                            ),
                    ) {
                        RadioButton(selected = draft.toneSequence == sequence, onClick = null)
                        Text(sequence.label, modifier = Modifier.padding(start = 8.dp))
                    }
                    IconButton(
                        // Stays enabled with the tone off, so sequences can be tried out before
                        // turning the acoustic reminder on.
                        onClick = { onTestTone(sequence) },
                        modifier = Modifier.semantics { contentDescription = "${sequence.label} anhören" },
                    ) {
                        Text("▶")
                    }
                }
            }
        }

        SettingsCard("Verlauf") {
            SwitchRow("Verpasste Erinnerungen ausblenden", draft.hideMissedReminders) { hide ->
                viewModel.edit { it.copy(hideMissedReminders = hide) }
            }
        }

        SettingsCard("Export") {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Speicherort")
                    Text(exportLocationLabel(draft.exportLocationUri), style = MaterialTheme.typography.bodySmall)
                }
                OutlinedButton(onClick = { pickExportLocation.launch(null) }) {
                    Text("Ordner wählen")
                }
            }
            if (draft.exportLocationUri != null) {
                TextButton(onClick = { viewModel.edit { it.copy(exportLocationUri = null) } }) {
                    Text("Downloads verwenden")
                }
            }
        }

        if (state.saveStatus == SaveStatus.Failed) {
            Text(
                "Speichern fehlgeschlagen. Die bisherigen Einstellungen bleiben aktiv.",
                color = MaterialTheme.colorScheme.error,
            )
        }

        Button(
            onClick = {
                scope.launch {
                    viewModel.save()
                    if (viewModel.uiState.value.saveStatus == SaveStatus.Saved) {
                        // Returning to quick-entry is the confirmation; no separate message.
                        onBack()
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Speichern")
        }
    }
}

/**
 * Material's "arrow back" shape, drawn as a vector rather than the "←" text glyph: a glyph sits
 * wherever its font places it within the line box (low, next to the title), while a vector is
 * symmetric in its box and so lines up with the middle of the title. No icon library needed.
 */
private val BackArrow: ImageVector = ImageVector.Builder(
    name = "BackArrow",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.Black)) {
        moveTo(20f, 11f)
        horizontalLineTo(7.83f)
        lineTo(13.42f, 5.41f)
        lineTo(12f, 4f)
        lineTo(4f, 12f)
        lineTo(12f, 20f)
        lineTo(13.41f, 18.59f)
        lineTo(7.83f, 13f)
        horizontalLineTo(20f)
        close()
    }
}.build()

/** No chosen folder means export uses the public Downloads directory (D10). */
private fun exportLocationLabel(uri: String?): String =
    if (uri == null) {
        "Downloads (Standard)"
    } else {
        uri.toUri().lastPathSegment?.substringAfter(':')?.ifBlank { null } ?: uri
    }

@Composable
private fun SettingsCard(title: String, content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(title, style = MaterialTheme.typography.labelLarge)
            content()
        }
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .toggleable(value = checked, role = Role.Switch, onValueChange = onCheckedChange),
    ) {
        Text(label, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = null)
    }
}
