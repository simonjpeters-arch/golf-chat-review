package com.simon.golfchatreview

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.simon.golfchatreview.data.AnalysisEngine
import com.simon.golfchatreview.data.AnalysisStore
import com.simon.golfchatreview.data.DeviceIdentity
import com.simon.golfchatreview.data.ImportMeta
import com.simon.golfchatreview.data.PhoneIdentity
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
    val pendingShareImport: Boolean = false,
    val phone: PhoneIdentity? = null,
)

class GolfSkipViewModel(app: Application) : AndroidViewModel(app) {
    private val store = AnalysisStore(app)
    private val seed by lazy { store.loadSeed() }
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    init {
        viewModelScope.launch {
            val saved = store.snapshotFlow.first()
            val registered = store.simonAndroidIdFlow.first()
            val phone = DeviceIdentity.read(getApplication(), registered)
            val snap = AnalysisEngine.presentForViewer(
                saved ?: AnalysisEngine.build(seed, emptyList(), null),
                phone.owner,
            )
            _state.value = UiState(
                snapshot = snap,
                loading = false,
                phone = phone,
                status = if (saved?.meta != null) {
                    "Last import: ${saved.meta.fileName}"
                } else {
                    "Bundled snapshot — import an export to refresh"
                },
            )
        }
    }

    fun registerThisAsSimonPhone() {
        viewModelScope.launch {
            val app = getApplication<Application>()
            val id = DeviceIdentity.read(app, null).androidId
            store.saveSimonAndroidId(id)
            val phone = DeviceIdentity.read(app, id)
            val base = _state.value.snapshot?.let {
                it.copy(confirmed = it.confirmed.filter { row -> row.source != "prank" })
            }
            _state.value = _state.value.copy(
                phone = phone,
                snapshot = base?.let { AnalysisEngine.presentForViewer(it, phone.owner) },
                status = "Registered this Pixel as Simon's phone. Other installs count as Gaythan.",
            )
        }
    }

    fun importUri(uri: Uri) {
        viewModelScope.launch {
            _state.value = _state.value.copy(
                importing = true,
                error = null,
                status = "Reading chat file…",
                pendingShareImport = true,
            )
            try {
                val app = getApplication<Application>()
                val cr = app.contentResolver
                runCatching {
                    cr.takePersistableUriPermission(uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
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
                val phone = DeviceIdentity.read(app, store.simonAndroidIdFlow.first())
                _state.value = UiState(
                    snapshot = AnalysisEngine.presentForViewer(built, phone.owner),
                    loading = false,
                    importing = false,
                    pendingShareImport = false,
                    phone = phone,
                    status = "Kept existing history and added from $name: ${count} messages, ${golf} golf mentions, ${built.stats.confirmedTotal} confirmed (${built.autoNew} new auto).",
                )
            } catch (t: Throwable) {
                _state.value = _state.value.copy(
                    importing = false,
                    pendingShareImport = false,
                    error = t.message ?: t.toString(),
                    status = "Import failed",
                )
            }
        }
    }
}
