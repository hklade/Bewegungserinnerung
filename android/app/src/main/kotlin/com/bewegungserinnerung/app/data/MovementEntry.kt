package com.bewegungserinnerung.app.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "movement_entries")
data class MovementEntry(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val date: String,
    val weekday: String,
    @ColumnInfo(name = "reminder_time")
    val reminderTime: String,
    @ColumnInfo(name = "response_time")
    val responseTime: String?,
    @ColumnInfo(name = "delay_minutes")
    val delayMinutes: Int?,
    val value: Int,
    val description: String,
    @ColumnInfo(name = "duration_minutes")
    val durationMinutes: Int?,
    @ColumnInfo(name = "is_additional_break")
    val isAdditionalBreak: Boolean,
    @ColumnInfo(name = "entry_type")
    val entryType: String,
    val note: String,
    @ColumnInfo(name = "created_at")
    val createdAt: String,
)
