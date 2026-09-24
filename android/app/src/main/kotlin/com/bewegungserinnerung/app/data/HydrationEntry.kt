package com.bewegungserinnerung.app.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * One Trinkmanager log entry: [hydrationMl] is the absolute amount for [date] after the change,
 * not a delta — so the day's total is the latest entry for that date, never a sum.
 */
@Entity(tableName = "hydration_entries")
data class HydrationEntry(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val date: String,
    @ColumnInfo(name = "hydration_ml")
    val hydrationMl: Int,
    @ColumnInfo(name = "created_at")
    val createdAt: String,
)
