package com.bewegungserinnerung.app.reminder

import android.content.Intent

private const val EXTRA_TONE_ENABLED = "tone_enabled"
private const val EXTRA_TONE_SEQUENCE = "tone_sequence"

/**
 * The tone setting a scheduled alarm fires with. It travels with the alarm (like the slot time)
 * because [ReminderAlarmReceiver] runs synchronously and can't read the settings row; saving the
 * settings re-schedules the alarm, so the carried choice is always the saved one.
 */
data class ToneChoice(val enabled: Boolean, val sequence: ToneSequence)

internal fun Intent.putToneChoice(choice: ToneChoice): Intent =
    putExtra(EXTRA_TONE_ENABLED, choice.enabled).putExtra(EXTRA_TONE_SEQUENCE, choice.sequence.name)

/** Falls back to the defaults for alarms scheduled before the tone setting existed. */
fun Intent.toneChoice(): ToneChoice = ToneChoice(
    enabled = getBooleanExtra(EXTRA_TONE_ENABLED, ReminderDefaults.TONE_ENABLED),
    sequence = ToneSequence.entries.firstOrNull { it.name == getStringExtra(EXTRA_TONE_SEQUENCE) }
        ?: ReminderDefaults.TONE_SEQUENCE,
)
