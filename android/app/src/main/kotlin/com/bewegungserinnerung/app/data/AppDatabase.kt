package com.bewegungserinnerung.app.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [MovementEntry::class], version = 1, exportSchema = true)
abstract class AppDatabase : RoomDatabase() {
    abstract fun movementEntryDao(): MovementEntryDao
}
