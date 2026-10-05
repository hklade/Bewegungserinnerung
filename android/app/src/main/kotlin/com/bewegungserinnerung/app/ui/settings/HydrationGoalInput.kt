package com.bewegungserinnerung.app.ui.settings

import com.bewegungserinnerung.app.data.DEFAULT_HYDRATION_GOAL_ML
import java.math.BigDecimal
import java.math.RoundingMode

/** Shows a goal in liters the German way: 2000 → "2", 2500 → "2,5". */
internal fun formatGoalLiters(goalMl: Int): String =
    BigDecimal(goalMl).movePointLeft(3).stripTrailingZeros().toPlainString().replace('.', ',')

/**
 * Parses a liters input ("2,5" or "2.5") into ml. Anything non-numeric or not positive falls
 * back to the 2 L default instead of being saved, per the hydration-goal requirement.
 */
internal fun parseGoalLitersToMl(input: String): Int {
    val liters = input.trim().replace(',', '.').toBigDecimalOrNull() ?: return DEFAULT_HYDRATION_GOAL_ML
    val ml = runCatching { liters.movePointRight(3).setScale(0, RoundingMode.HALF_UP).intValueExact() }
        .getOrNull()
    return if (ml != null && ml > 0) ml else DEFAULT_HYDRATION_GOAL_ML
}
