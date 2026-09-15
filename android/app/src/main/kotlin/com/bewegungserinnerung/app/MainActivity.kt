package com.bewegungserinnerung.app

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.reminder.ReminderScheduler
import com.bewegungserinnerung.app.reminder.currentSlotInstant
import com.bewegungserinnerung.app.reminder.isExactAlarmPermissionGranted
import com.bewegungserinnerung.app.reminder.isNotificationPermissionGranted
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryScreen
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryViewModel
import com.bewegungserinnerung.app.ui.theme.BewegungserinnerungTheme
import java.time.Clock
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val SLOT_LABEL_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Europe/Vienna"))

class MainActivity : ComponentActivity() {

    // Must be registered before onCreate's content is set (a hard requirement of
    // ActivityResultRegistry), which is why this isn't inside a @Composable.
    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* Nothing to do either way: the notifier already checks the permission on every fire. */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val database = AppDatabase.getInstance(applicationContext)

        ReminderScheduler.scheduleNextAlarm(applicationContext)
        ReminderScheduler.ensurePeriodicBackfillScheduled(applicationContext)
        val exactAlarmPermissionGranted = isExactAlarmPermissionGranted(applicationContext)

        if (!isNotificationPermissionGranted(applicationContext)) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val clock = Clock.systemDefaultZone()
        val currentSlot = currentSlotInstant(clock.instant())
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = clock,
            currentSlotTime = currentSlot ?: clock.instant(),
        )

        setContent {
            BewegungserinnerungTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    QuickEntryScreen(
                        viewModel = viewModel,
                        currentSlotLabel = currentSlot?.let { SLOT_LABEL_FORMATTER.format(it) },
                        exactAlarmPermissionGranted = exactAlarmPermissionGranted,
                    )
                }
            }
        }
    }
}
