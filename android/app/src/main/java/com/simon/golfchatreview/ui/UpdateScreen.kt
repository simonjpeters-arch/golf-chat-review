package com.simon.golfchatreview.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simon.golfchatreview.UiState
import com.simon.golfchatreview.ui.theme.Accent
import com.simon.golfchatreview.ui.theme.Gaythan
import com.simon.golfchatreview.ui.theme.Muted

@Composable
fun UpdateScreen(state: UiState, onPickFile: () -> Unit) {
    val meta = state.snapshot?.meta
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Update analysis", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        CardBlock("WhatsApp cannot auto-download chats") {
            Text(
                "There is no official API for a third-party app to pull a personal 1:1 chat. Export the chat Without media, then import the .txt or .zip here.",
                color = Muted,
            )
        }
        Button(
            onClick = onPickFile,
            enabled = !state.importing,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Accent),
        ) {
            Text("Import WhatsApp export", fontWeight = FontWeight.Bold)
        }
        if (state.importing) CircularProgressIndicator()
        Text(state.status, color = Muted)
        state.error?.let { Text(it, color = Gaythan) }
        CardBlock("Last import") {
            if (meta == null) {
                Text("None yet — showing bundled snapshot from the dated CSV tables.", color = Muted)
            } else {
                Text("File: ${meta.fileName}")
                Text("Messages: ${meta.messageCount}")
                Text("Range: ${meta.dateRange}")
                Text("Golf mentions: ${meta.golfMentions}")
                Text("SHA-256: ${meta.sha256.take(24)}…", color = Muted, fontSize = 12.sp)
            }
        }
        CardBlock("Android export steps") {
            Text("1. Open the Gaythan chat in WhatsApp", color = Muted)
            Text("2. ⋮ → More → Export chat", color = Muted)
            Text("3. Without media", color = Muted)
            Text("4. Save to Files / Drive, then Import above", color = Muted)
        }
        Spacer(Modifier.height(24.dp))
    }
}
