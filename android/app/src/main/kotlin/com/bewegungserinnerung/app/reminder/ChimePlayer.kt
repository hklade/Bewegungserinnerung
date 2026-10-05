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

        // A tone that can't play (no audio output, track failed to initialize) must never break
        // the reminder notification it accompanies — skip the sound instead of throwing.
        if (track.state != AudioTrack.STATE_INITIALIZED) {
            track.release()
            return
        }
        track.write(samples, 0, samples.size)
        track.play()

        val durationMs = samples.size * 1000L / SAMPLE_RATE
        Handler(Looper.getMainLooper()).postDelayed({ track.release() }, durationMs + RELEASE_GRACE_MS)
    }
}
