package com.bewegungserinnerung.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

private const val DATABASE_NAME = "bewegungserinnerung.db"

@Database(entities = [MovementEntry::class], version = 1, exportSchema = true)
abstract class AppDatabase : RoomDatabase() {
    abstract fun movementEntryDao(): MovementEntryDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        /** The shared app-wide database instance, created on first access and reused after. */
        fun getInstance(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(context, AppDatabase::class.java, DATABASE_NAME)
                    .build()
                    .also { instance = it }
            }

        /** Test-only: overrides the shared instance, e.g. with an in-memory database. */
        fun setInstanceForTest(database: AppDatabase) {
            instance = database
        }

        /** Test-only: clears an override set via [setInstanceForTest]. */
        fun clearInstanceForTest() {
            instance = null
        }
    }
}
