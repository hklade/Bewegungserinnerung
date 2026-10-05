package com.bewegungserinnerung.app.reminder

import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ReminderNotifierTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val played = mutableListOf<ToneSequence>()
    private val recordingPlayer: (Context, ToneSequence) -> Unit = { _, sequence -> played += sequence }

    @Test
    fun `Test-Ton spielt ohne eine Notification-Berechtigung oder Datenbank zu benötigen`() {
        // playTestTone takes no DAO/database and shows no notification, so this call must
        // succeed on its own without any other side effect being wired up.
        ReminderNotifier.playTestTone(context, ToneSequence.Aufwaerts, play = recordingPlayer)

        assertEquals(listOf(ToneSequence.Aufwaerts), played)
    }

    @Test
    fun `Erinnerung spielt die gewählte Tonfolge, wenn der Ton eingeschaltet ist`() {
        ReminderNotifier.showReminderNotification(
            context,
            toneEnabled = true,
            toneSequence = ToneSequence.Doppelschlag,
            play = recordingPlayer,
        )

        assertEquals(listOf(ToneSequence.Doppelschlag), played)
    }

    @Test
    fun `Bei ausgeschaltetem Ton erscheint die Erinnerung ohne Tonfolge`() {
        ReminderNotifier.showReminderNotification(
            context,
            toneEnabled = false,
            toneSequence = ToneSequence.WeicherGong,
            play = recordingPlayer,
        )

        assertTrue(played.isEmpty())
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        assertEquals(1, manager.activeNotifications.size)
    }

    @Test
    fun `Der Benachrichtigungskanal spielt keinen eigenen Systemton`() {
        ReminderNotifier.showReminderNotification(
            context,
            toneEnabled = true,
            toneSequence = ToneSequence.Aufwaerts,
            play = recordingPlayer,
        )

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = manager.notificationChannels.single()
        assertNull(channel.sound)
    }
}
