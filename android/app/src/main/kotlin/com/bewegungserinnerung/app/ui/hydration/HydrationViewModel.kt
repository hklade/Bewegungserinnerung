package com.bewegungserinnerung.app.ui.hydration

import com.bewegungserinnerung.app.data.HydrationEntry
import com.bewegungserinnerung.app.data.HydrationEntryDao
import com.bewegungserinnerung.app.reminder.ZONE
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.Clock
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/** Used until `add-android-settings-configuration` provides a configured daily goal. */
const val DEFAULT_HYDRATION_GOAL_ML = 2000
const val HYDRATION_STEP_ML = 250

class HydrationViewModel(
    private val dao: HydrationEntryDao,
    private val clock: Clock,
    private val zone: ZoneId = ZONE,
    goalMl: Int = DEFAULT_HYDRATION_GOAL_ML,
) {
    private val _uiState = MutableStateFlow(HydrationUiState(goalMl = goalMl))
    val uiState: StateFlow<HydrationUiState> = _uiState.asStateFlow()

    /** The last amount known to be in storage — what a failed save rolls the display back to. */
    private var persistedAmountMl = 0

    /** The day [persistedAmountMl] belongs to; a change starts the new day from its own total. */
    private var loadedDate: String? = null

    suspend fun load() {
        val date = today()
        persistedAmountMl = dao.amountForDate(date) ?: 0
        loadedDate = date
        _uiState.value = _uiState.value.copy(amountMl = persistedAmountMl)
    }

    suspend fun increment() {
        loadIfDayChanged()
        logAmount(_uiState.value.amountMl + HYDRATION_STEP_ML)
    }

    suspend fun decrement() {
        loadIfDayChanged()
        if (!_uiState.value.canDecrement) return
        logAmount(_uiState.value.amountMl - HYDRATION_STEP_ML)
    }

    private suspend fun loadIfDayChanged() {
        if (loadedDate != today()) load()
    }

    /** Shows [newAmount] immediately, then persists it; a failed persist restores the last saved amount. */
    private suspend fun logAmount(newAmount: Int) {
        _uiState.value = _uiState.value.copy(amountMl = newAmount, hasError = false)
        try {
            dao.insert(
                HydrationEntry(
                    date = today(),
                    hydrationMl = newAmount,
                    createdAt = DateTimeFormatter.ISO_INSTANT.format(clock.instant()),
                ),
            )
            persistedAmountMl = newAmount
        } catch (e: CancellationException) {
            throw e
        } catch (t: Throwable) {
            _uiState.value = _uiState.value.copy(amountMl = persistedAmountMl, hasError = true)
        }
    }

    private fun today(): String = ZonedDateTime.ofInstant(clock.instant(), zone).toLocalDate().toString()
}
