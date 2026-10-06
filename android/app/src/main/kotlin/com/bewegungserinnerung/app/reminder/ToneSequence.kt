package com.bewegungserinnerung.app.reminder

import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.roundToInt
import kotlin.math.sin

private const val ATTACK_MS = 45
private const val TAIL_MS = 30

enum class Waveform { Sine, Triangle }

/** One note of a tone sequence; [peak] is its loudest amplitude as a fraction of full scale. */
data class ChimeNote(
    val offsetMs: Int,
    val frequencyHz: Double,
    val durationMs: Int,
    val peak: Double,
    val waveform: Waveform = Waveform.Sine,
)

/**
 * The selectable reminder tone sequences (design D13), shown in settings under [label].
 * [Aufwaerts] reproduces the web app's Web Audio note plan (`src/lib/reminderTone.ts`) so the
 * reminder sounds the same on both; its peaks keep the web app's 2:3 loudness ratio.
 */
enum class ToneSequence(val label: String, val notes: List<ChimeNote>) {
    Aufwaerts(
        "Aufwärts",
        listOf(
            ChimeNote(offsetMs = 0, frequencyHz = 784.0, durationMs = 500, peak = 0.4),
            ChimeNote(offsetMs = 600, frequencyHz = 659.0, durationMs = 500, peak = 0.4),
            ChimeNote(offsetMs = 1100, frequencyHz = 988.0, durationMs = 1000, peak = 0.6, waveform = Waveform.Triangle),
        ),
    ),
    Doppelschlag(
        "Doppelschlag",
        listOf(
            ChimeNote(offsetMs = 0, frequencyHz = 880.0, durationMs = 180, peak = 0.55, waveform = Waveform.Triangle),
            ChimeNote(offsetMs = 320, frequencyHz = 880.0, durationMs = 180, peak = 0.55, waveform = Waveform.Triangle),
        ),
    ),
    WeicherGong(
        "Weicher Gong",
        listOf(ChimeNote(offsetMs = 0, frequencyHz = 523.25, durationMs = 1800, peak = 0.5)),
    ),
}

/**
 * Renders [notes] to mono 16-bit PCM: each note ramps up linearly over the attack, then fades
 * exponentially to near silence by its end (like the web app's gain ramps). Silence between
 * notes stays exactly zero.
 */
fun renderPcm(notes: List<ChimeNote>, sampleRate: Int): ShortArray {
    val totalMs = notes.maxOf { it.offsetMs + it.durationMs } + TAIL_MS
    val mix = DoubleArray(totalMs * sampleRate / 1000)

    for (note in notes) {
        val start = note.offsetMs * sampleRate / 1000
        val length = note.durationMs * sampleRate / 1000
        val attack = ATTACK_MS * sampleRate / 1000
        val decayRate = ln(1000.0) / (length - attack).coerceAtLeast(1)

        for (i in 0 until length) {
            val envelope = if (i < attack) note.peak * i / attack else note.peak * exp(-decayRate * (i - attack))
            val phase = 2 * PI * note.frequencyHz * i / sampleRate
            val wave = when (note.waveform) {
                Waveform.Sine -> sin(phase)
                Waveform.Triangle -> 2 / PI * asin(sin(phase))
            }
            mix[start + i] += envelope * wave
        }
    }

    return ShortArray(mix.size) { (mix[it].coerceIn(-1.0, 1.0) * Short.MAX_VALUE).roundToInt().toShort() }
}
