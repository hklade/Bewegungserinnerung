package com.bewegungserinnerung.app.ui.settings

import com.bewegungserinnerung.app.data.AppSettings
import com.bewegungserinnerung.app.data.SettingsDao
import com.bewegungserinnerung.app.data.currentSettings
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Edits a draft of the settings row and persists it only on an explicit [save] — never on each
 * change. [onSaved] runs after a successful save with the now-active settings, so consumers that
 * don't observe the row (alarm scheduling) can apply them immediately.
 */
class SettingsViewModel(
    private val dao: SettingsDao,
    private val onSaved: (AppSettings) -> Unit = {},
) {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    suspend fun load() {
        _uiState.value = SettingsUiState(draft = dao.currentSettings())
    }

    fun edit(change: (AppSettings) -> AppSettings) {
        _uiState.value = _uiState.value.copy(draft = change(_uiState.value.draft), saveStatus = SaveStatus.Idle)
    }

    fun setHydrationGoalInput(input: String) {
        _uiState.value = _uiState.value.copy(hydrationGoalInput = input, saveStatus = SaveStatus.Idle)
    }

    suspend fun save() {
        val state = _uiState.value
        val settings = state.draft.copy(hydrationGoalMl = parseGoalLitersToMl(state.hydrationGoalInput))
        try {
            dao.save(settings)
        } catch (e: CancellationException) {
            throw e
        } catch (t: Throwable) {
            // The previously saved row stays active; the draft stays in the form for a retry.
            _uiState.value = state.copy(saveStatus = SaveStatus.Failed)
            return
        }
        _uiState.value = SettingsUiState(draft = settings, saveStatus = SaveStatus.Saved)
        onSaved(settings)
    }
}
