package com.bewegungserinnerung.app.ui.quickentry

import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ActivityLevelSelectorTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun `Standardauswahl ist Mini-Pause`() {
        var selected = ActivityLevel.default
        composeRule.setContent {
            ActivityLevelSelector(selected = selected, onSelect = { selected = it })
        }

        composeRule.onNodeWithText("Mini-Pause").assertIsSelected()
    }

    @Test
    fun `Antippen einer anderen Option ändert die Auswahl`() {
        var selected = ActivityLevel.default
        composeRule.setContent {
            ActivityLevelSelector(selected = selected, onSelect = { selected = it })
        }

        composeRule.onNodeWithText("Bewegung").performClick()

        assert(selected == ActivityLevel.Movement) {
            "expected selection to change to Movement, was $selected"
        }
    }
}
