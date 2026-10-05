package com.bewegungserinnerung.app.ui.hydration

data class HydrationUiState(
    val amountMl: Int = 0,
    val goalMl: Int,
    val hasError: Boolean = false,
) {
    val canDecrement: Boolean get() = amountMl >= HYDRATION_STEP_ML
}
