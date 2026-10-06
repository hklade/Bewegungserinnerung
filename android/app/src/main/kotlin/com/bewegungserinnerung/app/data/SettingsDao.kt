package com.bewegungserinnerung.app.data

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Dao
interface SettingsDao {

    /** Always writes the single settings row, replacing whatever was saved before. */
    @Upsert
    suspend fun save(settings: AppSettings)

    @Query("SELECT * FROM settings WHERE id = ${AppSettings.SINGLE_ROW_ID}")
    fun observeRow(): Flow<AppSettings?>

    @Query("SELECT * FROM settings WHERE id = ${AppSettings.SINGLE_ROW_ID}")
    suspend fun getRow(): AppSettings?

    @Query("SELECT COUNT(*) FROM settings")
    suspend fun rowCount(): Int
}

/** The active settings, falling back to the built-in defaults until the user first saves. */
fun SettingsDao.observeSettings(): Flow<AppSettings> = observeRow().map { it ?: AppSettings() }

suspend fun SettingsDao.currentSettings(): AppSettings = getRow() ?: AppSettings()
