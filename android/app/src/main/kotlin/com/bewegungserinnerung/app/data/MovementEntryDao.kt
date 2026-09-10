package com.bewegungserinnerung.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface MovementEntryDao {

    @Insert
    suspend fun insert(entry: MovementEntry): Long

    @Query("SELECT * FROM movement_entries ORDER BY id ASC")
    fun observeAll(): Flow<List<MovementEntry>>

    @Query(
        "SELECT * FROM movement_entries WHERE date = :date AND reminder_time = :reminderTime ORDER BY id ASC",
    )
    suspend fun entriesForSlot(date: String, reminderTime: String): List<MovementEntry>
}
