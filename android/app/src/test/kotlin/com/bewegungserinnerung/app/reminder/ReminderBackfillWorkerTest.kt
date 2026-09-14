package com.bewegungserinnerung.app.reminder

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import com.bewegungserinnerung.app.data.AppDatabase
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

        // Use a uniquely-named in-memory database for this test run, so it never touches (or
        // races with) the app's real on-disk database or another test's instance.
        val database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        AppDatabase.setInstanceForTest(database)

        try {
            val worker = TestListenableWorkerBuilder<ReminderBackfillWorker>(context).build()

            val result = worker.doWork()

            assertEquals(ListenableWorker.Result.success(), result)
        } finally {
            database.close()
            AppDatabase.clearInstanceForTest()
        }
    }
}
