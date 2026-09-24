package com.bewegungserinnerung.app.data

import android.content.Context
import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

private const val DATABASE_NAME = "bewegungserinnerung.db"

@Database(
    entities = [MovementEntry::class, HydrationEntry::class],
    version = 2,
    exportSchema = true,
    autoMigrations = [AutoMigration(from = 1, to = 2)],
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun movementEntryDao(): MovementEntryDao
    abstract fun hydrationEntryDao(): HydrationEntryDao

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
    }
}
