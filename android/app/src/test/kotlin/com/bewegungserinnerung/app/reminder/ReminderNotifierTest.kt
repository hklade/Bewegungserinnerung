package com.bewegungserinnerung.app.reminder

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ReminderNotifierTest {

    @Test
    fun `Test-Ton spielt ohne eine Notification-Berechtigung oder Datenbank zu benötigen`() {
        val context = ApplicationProvider.getApplicationContext<Context>()

        // playTestTone only vibrates - it takes no DAO/database and shows no notification, so
        // this call must succeed on its own without any other side effect being wired up.
        ReminderNotifier.playTestTone(context)
    }
}
