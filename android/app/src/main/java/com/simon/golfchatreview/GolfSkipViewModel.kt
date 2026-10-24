package com.simon.golfchatreview

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.simon.golfchatreview.data.AnalysisEngine
import com.simon.golfchatreview.data.AnalysisStore
import com.simon.golfchatreview.data.ImportMeta
import com.simon.golfchatreview.data.Snapshot
import com.simon.golfchatreview.data.WhatsAppParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant

data class UiState(
    val snapshot: Snapshot? = null,
    val loading: Boolean = true,
    val importing: Boolean = false,
    val status: String = "",
    val error: String? = null,
)

class GolfSkipViewModel(app: Application) : AndroidViewModel(app) {
    private val store = AnalysisStore(app)
    private val seed by lazy { store.loadSeed() }
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    init {
        viewModelScope.launch {
            val saved = store.snapshotFlow.first()
            val snap = saved ?: AnalysisEngine.build(seed, emptyList(), null)
            _state.value = UiState(
                snapshot = snap,
                loading = false,
                status = if (saved?.meta != null) {
                    "Last import: ${saved.meta.fileName}"
                } else {
                    "Bundled snapshot — import an export to refresh"
                },
            )
        }
    }

    fun importUri(uri: Uri) {
        viewModelScope.launch {
            _state.value = _state.value.copy(importing = true, error = null, status = "Reading export…")
            try {
                val cr = getApplication<Application>().contentResolver
                val name = cr.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
                    ?.use { c ->
                        val i = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        if (c.moveToFirst() && i >= 0) c.getString(i) else "chat.txt"
                    } ?: "chat.txt"
                val (text, messages) = withContext(Dispatchers.IO) {
                    cr.openInputStream(uri)?.use { WhatsAppParser.readExport(it, name) }
                        ?: error("Could not open file")
                }
                if (messages.isEmpty()) error("No WhatsApp lines parsed. Use Export chat → Without media.")
                val (count, range, golf) = AnalysisEngine.metaFrom(messages)
                val meta = ImportMeta(
                    fileName = name,
                    lastUpdated = Instant.now().toString(),
                    messageCount = count,
                    dateRange = range,
                    golfMentions = golf,
                    sha256 = WhatsAppParser.sha256(text),
                )
                val built = withContext(Dispatchers.Default) {
                    AnalysisEngine.build(seed, messages, meta)
                }
                store.save(built)
                _state.value = UiState(
                    snapshot = built,
                    loading = false,
                    importing = false,
                    status = "Updated: ${count} messages, ${golf} golf mentions, ${built.stats.confirmedTotal} confirmed.",
                )
            } catch (t: Throwable) {
                _state.value = _state.value.copy(
                    importing = false,
                    error = t.message ?: t.toString(),
                    status = "Import failed",
                )
            }
        }
    }
}
