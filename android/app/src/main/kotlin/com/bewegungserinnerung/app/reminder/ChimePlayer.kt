package com.bewegungserinnerung.app.reminder

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Handler
import android.os.Looper

private const val SAMPLE_RATE = 44_100
private const val RELEASE_GRACE_MS = 500L

/**
 * Plays a [ToneSequence] once, synthesized on-device (design D13) — no audio assets involved.
 * Does nothing if the device can't provide an audio track.
 */
object ChimePlayer {

    @Suppress("UNUSED_PARAMETER") // Matches the (Context, ToneSequence) player shape callers inject.
    fun play(context: Context, sequence: ToneSequence) {
        val samples = renderPcm(sequence.notes, SAMPLE_RATE)
        val track = runCatching {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build(),
                )
                .setTransferMode(AudioTrack.MODE_STATIC)
                .setBufferSizeInBytes(samples.size * Short.SIZE_BYTES)
                .build()
        }.getOrNull() ?: return

        if (!startStaticPlayback(AudioTrackAdapter(track), samples)) return

        val durationMs = samples.size * 1000L / SAMPLE_RATE
        Handler(Looper.getMainLooper()).postDelayed({ track.release() }, durationMs + RELEASE_GRACE_MS)
    }
}

/** The slice of [AudioTrack] that [startStaticPlayback] needs, so its ordering is unit-testable. */
internal interface PcmTrack {
    val state: Int
    fun write(samples: ShortArray)
    fun play()
    fun release()
}

private class AudioTrackAdapter(private val track: AudioTrack) : PcmTrack {
    override val state: Int get() = track.state
    override fun write(samples: ShortArray) {
        track.write(samples, 0, samples.size)
    }
    override fun play() = track.play()
    override fun release() = track.release()
}

/**
 * Writes [samples] into a `MODE_STATIC` track and starts it. Such a track reports
 * `STATE_NO_STATIC_DATA` until its data is written, so readiness can only be checked *after*
 * writing. A track that still isn't ready (no audio output) is released instead of played, so a
 * missing sound never breaks the reminder notification it accompanies.
 */
internal fun startStaticPlayback(track: PcmTrack, samples: ShortArray): Boolean {
    track.write(samples)
    if (track.state != AudioTrack.STATE_INITIALIZED) {
        track.release()
        return false
    }
    track.play()
    return true
}
