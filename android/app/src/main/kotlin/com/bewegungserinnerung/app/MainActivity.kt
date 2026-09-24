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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.reminder.ReminderAlarmReceiver
import com.bewegungserinnerung.app.reminder.ReminderBackfillWorker
import com.bewegungserinnerung.app.reminder.ReminderScheduler
import com.bewegungserinnerung.app.reminder.currentSlotInstant
import com.bewegungserinnerung.app.reminder.isExactAlarmPermissionGranted
import com.bewegungserinnerung.app.reminder.isNotificationPermissionGranted
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryScreen
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryViewModel
import com.bewegungserinnerung.app.ui.theme.BewegungserinnerungTheme
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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

        // Same recompute-and-re-arm work as ReminderAlarmReceiver runs after an alarm fires,
        // enqueued (not called directly) so there is exactly one code path for this bookkeeping
        // (D4) rather than a second one that bypasses WorkManager's retry/Doze-safety guarantees.
        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            ReminderAlarmReceiver.REARM_WORK_NAME,
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<ReminderBackfillWorker>().build(),
        )
        ReminderScheduler.ensurePeriodicBackfillScheduled(applicationContext)
        val exactAlarmPermissionGranted = isExactAlarmPermissionGranted(applicationContext)

        if (!isNotificationPermissionGranted(applicationContext)) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val clock = Clock.systemDefaultZone()
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = clock,
            slotResolver = { now -> currentSlotInstant(now) },
        )

        // The activity outlives slot boundaries (it stays open, or is resumed after the reminder
        // notification), so the current slot is re-evaluated on every resume and at each full
        // minute while resumed rather than only once in onCreate.
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.RESUMED) {
                while (true) {
                    viewModel.refreshCurrentSlot()
                    delay(untilNextFullMinute(clock.instant()).toMillis())
                }
            }
        }

        setContent {
            BewegungserinnerungTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    val currentSlot by viewModel.currentSlot.collectAsState()
                    QuickEntryScreen(
                        viewModel = viewModel,
                        currentSlotLabel = currentSlot?.let { SLOT_LABEL_FORMATTER.format(it) },
                        exactAlarmPermissionGranted = exactAlarmPermissionGranted,
                        dao = database.movementEntryDao(),
                    )
                }
            }
        }
    }
}

private fun untilNextFullMinute(now: Instant): Duration =
    Duration.between(now, now.truncatedTo(ChronoUnit.MINUTES).plus(1, ChronoUnit.MINUTES))
