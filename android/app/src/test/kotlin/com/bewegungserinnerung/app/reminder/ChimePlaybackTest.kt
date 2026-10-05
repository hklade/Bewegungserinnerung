package com.bewegungserinnerung.app.reminder

import android.media.AudioTrack
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChimePlaybackTest {

    /**
     * Mimics a `MODE_STATIC` AudioTrack: right after creation its state is
     * `STATE_NO_STATIC_DATA`, and it only becomes `STATE_INITIALIZED` once samples are written.
     */
    private class FakeStaticTrack(private val initializesOnWrite: Boolean = true) : PcmTrack {
        override var state: Int = AudioTrack.STATE_NO_STATIC_DATA
        val calls = mutableListOf<String>()

        override fun write(samples: ShortArray) {
            calls += "write"
            state = if (initializesOnWrite) AudioTrack.STATE_INITIALIZED else AudioTrack.STATE_UNINITIALIZED
        }

        override fun play() {
            calls += "play"
        }

        override fun release() {
            calls += "release"
        }
    }

    @Test
    fun `Ein statischer Track spielt, nachdem die Samples geschrieben sind`() {
        val track = FakeStaticTrack()

        val started = startStaticPlayback(track, ShortArray(10))

        assertTrue(started)
        assertEquals(listOf("write", "play"), track.calls)
    }

    @Test
    fun `Ein Track, der nicht bereit wird, wird freigegeben statt abgespielt`() {
        val track = FakeStaticTrack(initializesOnWrite = false)

        val started = startStaticPlayback(track, ShortArray(10))

        assertFalse(started)
        assertEquals(listOf("write", "release"), track.calls)
    }
}
