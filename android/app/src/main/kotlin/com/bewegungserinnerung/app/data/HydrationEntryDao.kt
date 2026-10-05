package com.bewegungserinnerung.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface HydrationEntryDao {

    @Insert
    suspend fun insert(entry: HydrationEntry): Long

    /** The day's logged amount: the latest entry for [date], or null if nothing was logged. */
    @Query(
        "SELECT hydration_ml FROM hydration_entries WHERE date = :date ORDER BY created_at DESC, id DESC LIMIT 1",
    )
    suspend fun amountForDate(date: String): Int?
}
