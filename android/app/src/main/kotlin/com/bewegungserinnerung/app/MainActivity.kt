package com.bewegungserinnerung.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.room.Room
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.reminder.currentSlotInstant
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryScreen
import com.bewegungserinnerung.app.ui.quickentry.QuickEntryViewModel
import com.bewegungserinnerung.app.ui.theme.BewegungserinnerungTheme
import java.time.Clock
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val SLOT_LABEL_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Europe/Vienna"))

class MainActivity : ComponentActivity() {

    private lateinit var database: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        database = Room.databaseBuilder(applicationContext, AppDatabase::class.java, "bewegungserinnerung.db")
            .build()

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
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        database.close()
    }
}
