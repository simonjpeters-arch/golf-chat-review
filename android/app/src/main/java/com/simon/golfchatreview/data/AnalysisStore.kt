package com.simon.golfchatreview.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("golf_skip_store")

class AnalysisStore(private val context: Context) {
    private val gson = Gson()
    private val key = stringPreferencesKey("snapshot_json")

    fun loadSeed(): Snapshot {
        val json = context.assets.open("seed-data.json").bufferedReader().use { it.readText() }
        return gson.fromJson(json, Snapshot::class.java)
    }

    val snapshotFlow: Flow<Snapshot?> = context.dataStore.data.map { prefs ->
        prefs[key]?.let { gson.fromJson(it, Snapshot::class.java) }
    }

    suspend fun save(snapshot: Snapshot) {
        context.dataStore.edit { it[key] = gson.toJson(snapshot) }
    }
}
