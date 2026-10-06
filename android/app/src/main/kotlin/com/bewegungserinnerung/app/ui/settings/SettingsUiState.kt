package com.bewegungserinnerung.app.ui.settings

import com.bewegungserinnerung.app.data.AppSettings

enum class SaveStatus { Idle, Saved, Failed }

/**
 * [draft] is what the form shows; it only takes effect once [SettingsViewModel.save] succeeds.
 * The goal is edited as free liters text in [hydrationGoalInput] and only validated on save.
 */
data class SettingsUiState(
    val draft: AppSettings = AppSettings(),
    val hydrationGoalInput: String = formatGoalLiters(draft.hydrationGoalMl),
    val saveStatus: SaveStatus = SaveStatus.Idle,
)
