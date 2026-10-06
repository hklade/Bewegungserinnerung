package com.bewegungserinnerung.app.reminder

import android.app.AlarmManager
import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.AppSettings
import com.bewegungserinnerung.app.data.MovementEntryDao
import com.bewegungserinnerung.app.data.SettingsDao
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class ReminderBackfillWorkerTest {

    @Test
    fun `Worker läuft erfolgreich durch und meldet Erfolg`() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()

        // A uniquely-built in-memory database, injected by overriding movementEntryDao() on a
        // test subclass — never touches (or races with) the app's real on-disk database, and
        // needs no global AppDatabase.setInstanceForTest/clearInstanceForTest test hook.
        val database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()

        try {
            val worker = TestListenableWorkerBuilder<TestableReminderBackfillWorker>(context)
                .setWorkerFactory(FakeWorkerFactory(database.movementEntryDao(), database.settingsDao()))
                .build()

            val result = worker.doWork()

            assertEquals(ListenableWorker.Result.success(), result)
        } finally {
            database.close()
        }
    }

    @Test
    fun `Worker stellt den Alarm nach den gespeicherten Einstellungen`() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()

        try {
            database.settingsDao().save(AppSettings(remindersEnabled = false))
            val worker = TestListenableWorkerBuilder<TestableReminderBackfillWorker>(context)
                .setWorkerFactory(FakeWorkerFactory(database.movementEntryDao(), database.settingsDao()))
                .build()

            worker.doWork()

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            assertTrue(shadowOf(alarmManager).scheduledAlarms.isEmpty())
        } finally {
            database.close()
        }
    }

    private class TestableReminderBackfillWorker(
        context: Context,
        params: WorkerParameters,
        private val dao: MovementEntryDao,
        private val settings: SettingsDao,
    ) : ReminderBackfillWorker(context, params) {
        override fun movementEntryDao(): MovementEntryDao = dao
        override fun settingsDao(): SettingsDao = settings
    }

    private class FakeWorkerFactory(
        private val dao: MovementEntryDao,
        private val settings: SettingsDao,
    ) : androidx.work.WorkerFactory() {
        override fun createWorker(
            appContext: Context,
            workerClassName: String,
            workerParameters: WorkerParameters,
        ) = TestableReminderBackfillWorker(appContext, workerParameters, dao, settings)
    }
}
