package com.bewegungserinnerung.app.reminder

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import com.bewegungserinnerung.app.data.AppDatabase
import com.bewegungserinnerung.app.data.MovementEntryDao
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

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
                .setWorkerFactory(FakeWorkerFactory(database.movementEntryDao()))
                .build()

            val result = worker.doWork()

            assertEquals(ListenableWorker.Result.success(), result)
        } finally {
            database.close()
        }
    }

    private class TestableReminderBackfillWorker(
        context: Context,
        params: WorkerParameters,
        private val dao: MovementEntryDao,
    ) : ReminderBackfillWorker(context, params) {
        override fun movementEntryDao(): MovementEntryDao = dao
    }

    private class FakeWorkerFactory(
        private val dao: MovementEntryDao,
    ) : androidx.work.WorkerFactory() {
        override fun createWorker(
            appContext: Context,
            workerClassName: String,
            workerParameters: WorkerParameters,
        ) = TestableReminderBackfillWorker(appContext, workerParameters, dao)
    }
}
