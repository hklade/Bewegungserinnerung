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

    /**
     * Whether at least one real (non-backfilled) entry exists for [date] at a `reminder_time`
     * later than [afterReminderTime] — used to tell "the user's workday continued past this
     * slot" apart from "the user was done for the day and just didn't log anything more".
     */
    @Query(
        """
        SELECT EXISTS(
            SELECT 1 FROM movement_entries
            WHERE date = :date
              AND reminder_time > :afterReminderTime
              AND entry_type != 'unanswered'
        )
        """,
    )
    suspend fun hasRealEntryLaterThan(date: String, afterReminderTime: String): Boolean
}
