package com.bewegungserinnerung.app.ui.quickentry

import com.bewegungserinnerung.app.data.MovementEntry
import com.bewegungserinnerung.app.data.MovementEntryDao
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private val ZONE = ZoneId.of("Europe/Vienna")
private val DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZONE)
private val TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(ZONE)
private val WEEKDAY_FORMATTER = DateTimeFormatter.ofPattern("EEEE", Locale.GERMAN).withZone(ZONE)
private val TIMESTAMP_FORMATTER = DateTimeFormatter.ISO_INSTANT

class QuickEntryViewModel(
    private val dao: MovementEntryDao,
    private val clock: Clock,
    private val currentSlotTime: Instant,
) {
    private val _uiState = MutableStateFlow(QuickEntryUiState())
    val uiState: StateFlow<QuickEntryUiState> = _uiState.asStateFlow()

    fun selectLevel(level: ActivityLevel) {
        _uiState.value = _uiState.value.copy(selectedLevel = level, hasError = false)
    }

    fun updateNote(note: String) {
        _uiState.value = _uiState.value.copy(note = note, hasError = false)
    }

    suspend fun save(): SaveResult {
        val state = _uiState.value
        val date = DATE_FORMATTER.format(currentSlotTime)
        val reminderTime = TIME_FORMATTER.format(currentSlotTime)

        return try {
            val existingCount = dao.entriesForSlot(date = date, reminderTime = reminderTime).size
            val now = clock.instant()

            val entry = MovementEntry(
                date = date,
                weekday = WEEKDAY_FORMATTER.format(currentSlotTime),
                reminderTime = reminderTime,
                responseTime = TIME_FORMATTER.format(now),
                delayMinutes = Duration.between(currentSlotTime, now).toMinutes().toInt(),
                value = state.selectedLevel.value,
                description = state.note.ifBlank { state.selectedLevel.label },
                durationMinutes = null,
                isAdditionalBreak = existingCount > 0,
                entryType = "planned_break_response",
                note = state.note,
                createdAt = TIMESTAMP_FORMATTER.format(now),
            )
            dao.insert(entry)

            _uiState.value = state.copy(note = "", hasError = false)
            SaveResult.Success
        } catch (t: Throwable) {
            _uiState.value = state.copy(hasError = true)
            SaveResult.Failure(t)
        }
    }
}
