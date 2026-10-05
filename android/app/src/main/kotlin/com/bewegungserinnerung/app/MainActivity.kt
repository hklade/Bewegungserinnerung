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
import androidx.compose.runtime.LaunchedEffect
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
import com.bewegungserinnerung.app.data.AppSettings
import com.bewegungserinnerung.app.data.observeSettings
import com.bewegungserinnerung.app.reminder.ChimePlayer
import com.bewegungserinnerung.app.reminder.ReminderAlarmReceiver
import com.bewegungserinnerung.app.reminder.ReminderBackfillWorker
import com.bewegungserinnerung.app.reminder.ReminderNotifier
import com.bewegungserinnerung.app.reminder.ReminderScheduler
import com.bewegungserinnerung.app.reminder.currentSlotInstant
import com.bewegungserinnerung.app.reminder.isExactAlarmPermissionGranted
import com.bewegungserinnerung.app.reminder.isNotificationPermissionGranted
import com.bewegungserinnerung.app.ui.AppNavigation
import com.bewegungserinnerung.app.ui.hydration.HydrationViewModel
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryScreen
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryViewModel
import com.bewegungserinnerung.app.ui.settings.SettingsScreen
import com.bewegungserinnerung.app.ui.settings.SettingsViewModel
import com.bewegungserinnerung.app.ui.theme.BewegungserinnerungTheme
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
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
        val activeSettings = database.settingsDao().observeSettings()
            .stateIn(lifecycleScope, SharingStarted.Eagerly, AppSettings())
        val viewModel = QuickEntryViewModel(
            dao = database.movementEntryDao(),
            clock = clock,
            slotResolver = { now -> currentSlotInstant(now, activeSettings.value) },
        )
        val hydrationViewModel = HydrationViewModel(dao = database.hydrationEntryDao(), clock = clock)
        // A saved settings change applies at once, without restart: the shown slot is re-resolved
        // (window, weekdays-only, on/off) and the Trinkmanager picks up the new goal.
        lifecycleScope.launch {
            activeSettings.collect { settings ->
                viewModel.refreshCurrentSlot()
                hydrationViewModel.updateGoal(settings.hydrationGoalMl)
            }
        }
        val settingsViewModel = SettingsViewModel(
            dao = database.settingsDao(),
            // Re-arming right away replaces an alarm that no longer fits the saved settings.
            onSaved = { settings -> ReminderScheduler.scheduleNextAlarm(applicationContext, settings) },
        )

        // The activity outlives slot boundaries (it stays open, or is resumed after the reminder
        // notification), so the current slot is re-evaluated on every resume and at each full
        // minute while resumed rather than only once in onCreate. Today's hydration total is
        // reloaded on every resume for the same reason (the day may have changed meanwhile).
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.RESUMED) {
                hydrationViewModel.load()
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
                    AppNavigation(
                        quickEntry = { openSettings ->
                            val currentSlot by viewModel.currentSlot.collectAsState()
                            val settings by activeSettings.collectAsState()
                            QuickEntryScreen(
                                viewModel = viewModel,
                                currentSlotLabel = currentSlot?.let { SLOT_LABEL_FORMATTER.format(it) },
                                exactAlarmPermissionGranted = exactAlarmPermissionGranted,
                                dao = database.movementEntryDao(),
                                hydrationViewModel = hydrationViewModel,
                                hideMissedReminders = settings.hideMissedReminders,
                                onOpenSettings = openSettings,
                            )
                        },
                        settings = { back ->
                            // Opening the screen always starts from the saved settings, so changes
                            // left unsaved on a previous visit are discarded, not silently kept.
                            LaunchedEffect(Unit) { settingsViewModel.load() }
                            SettingsScreen(
                                viewModel = settingsViewModel,
                                onBack = back,
                                onTestTone = { sequence -> ReminderNotifier.playTestTone(applicationContext, sequence) },
                                onPreviewTone = { sequence -> ChimePlayer.play(applicationContext, sequence) },
                            )
                        },
                    )
                }
            }
        }
    }
}

private fun untilNextFullMinute(now: Instant): Duration =
    Duration.between(now, now.truncatedTo(ChronoUnit.MINUTES).plus(1, ChronoUnit.MINUTES))
