package com.bewegungserinnerung.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class HydrationEntryDaoTest {

    private lateinit var database: AppDatabase
    private lateinit var dao: HydrationEntryDao

    @Before
    fun createDatabase() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
        dao = database.hydrationEntryDao()
    }

    @After
    fun closeDatabase() {
        database.close()
    }

    @Test
    fun `Tagesmenge ist der neueste Eintrag des Tages, nicht die Summe`() = runBlocking {
        dao.insert(HydrationEntry(date = "2026-09-10", hydrationMl = 500, createdAt = "2026-09-10T07:00:00Z"))
        dao.insert(HydrationEntry(date = "2026-09-10", hydrationMl = 750, createdAt = "2026-09-10T08:00:00Z"))
        dao.insert(HydrationEntry(date = "2026-09-10", hydrationMl = 250, createdAt = "2026-09-10T09:00:00Z"))

        assertEquals(250, dao.amountForDate("2026-09-10"))
    }

    @Test
    fun `Einträge anderer Tage zählen nicht zur Tagesmenge`() = runBlocking {
        dao.insert(HydrationEntry(date = "2026-09-09", hydrationMl = 2000, createdAt = "2026-09-09T20:00:00Z"))
        dao.insert(HydrationEntry(date = "2026-09-10", hydrationMl = 250, createdAt = "2026-09-10T07:00:00Z"))
        dao.insert(HydrationEntry(date = "2026-09-11", hydrationMl = 1500, createdAt = "2026-09-11T07:00:00Z"))

        assertEquals(250, dao.amountForDate("2026-09-10"))
    }

    @Test
    fun `Ohne Eintrag für den Tag gibt es keine Tagesmenge`() = runBlocking {
        dao.insert(HydrationEntry(date = "2026-09-09", hydrationMl = 500, createdAt = "2026-09-09T07:00:00Z"))

        assertNull(dao.amountForDate("2026-09-10"))
    }
}
