package com.bewegungserinnerung.app.reminder

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class ToneSequenceTest {

    @Test
    fun `Aufwärts entspricht dem bestehenden Drei-Ton-Signal der Web-App`() {
        val notes = ToneSequence.Aufwaerts.notes

        assertEquals(listOf(784.0, 659.0, 988.0), notes.map { it.frequencyHz })
        assertEquals(listOf(0, 600, 1100), notes.map { it.offsetMs })
        assertEquals(listOf(500, 500, 1000), notes.map { it.durationMs })
    }

    @Test
    fun `Doppelschlag besteht aus zwei kurzen gleichen Schlägen`() {
        val notes = ToneSequence.Doppelschlag.notes

        assertEquals(2, notes.size)
        assertEquals(notes[0].frequencyHz, notes[1].frequencyHz, 0.0)
        assertEquals(notes[0].durationMs, notes[1].durationMs)
        assertTrue(notes.all { it.durationMs <= 250 })
        assertTrue(notes[1].offsetMs > notes[0].offsetMs + notes[0].durationMs)
    }

    @Test
    fun `Weicher Gong ist ein einzelner langer, tieferer Ton`() {
        val notes = ToneSequence.WeicherGong.notes

        assertEquals(1, notes.size)
        assertTrue(notes.single().durationMs >= 1500)
        assertTrue(notes.single().frequencyHz < ToneSequence.Aufwaerts.notes.first().frequencyHz)
    }

    @Test
    fun `Synthese erzeugt hörbare Samples über die gesamte Tonfolge`() {
        val sampleRate = 8000
        for (sequence in ToneSequence.entries) {
            val samples = renderPcm(sequence.notes, sampleRate)
            val lastNoteEndMs = sequence.notes.maxOf { it.offsetMs + it.durationMs }

            assertTrue("$sequence", samples.size >= lastNoteEndMs * sampleRate / 1000)
            assertTrue("$sequence", samples.any { abs(it.toInt()) > 1000 })
            assertEquals("$sequence beginnt leise", 0, samples.first().toInt())
        }
    }

    @Test
    fun `Zwischen den Schlägen des Doppelschlags ist es still`() {
        val sampleRate = 8000
        val notes = ToneSequence.Doppelschlag.notes
        val samples = renderPcm(notes, sampleRate)
        val gapStartMs = notes[0].offsetMs + notes[0].durationMs
        val gapEndMs = notes[1].offsetMs

        val gap = samples.slice(gapStartMs * sampleRate / 1000 until gapEndMs * sampleRate / 1000)

        assertTrue(gap.isNotEmpty())
        assertTrue(gap.all { it.toInt() == 0 })
    }
}
