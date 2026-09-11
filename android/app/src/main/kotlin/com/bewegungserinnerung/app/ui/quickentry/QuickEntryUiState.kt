package com.bewegungserinnerung.app.ui.quickentry

data class QuickEntryUiState(
    val selectedLevel: ActivityLevel = ActivityLevel.default,
    val note: String = "",
    val hasError: Boolean = false,
)

sealed interface SaveResult {
    data object Success : SaveResult
    data class Failure(val cause: Throwable) : SaveResult
}
