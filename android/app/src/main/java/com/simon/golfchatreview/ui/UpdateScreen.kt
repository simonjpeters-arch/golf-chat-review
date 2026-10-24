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
fun UpdateScreen(
    state: UiState,
    onPickTxt: () -> Unit,
    onPickAny: () -> Unit,
) {
    val meta = state.snapshot?.meta
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Update from a text file", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        val phone = state.phone
        if (phone != null) {
            CardBlock(phone.banner) {
                Text(phone.summary, fontWeight = FontWeight.SemiBold)
                Text("Detected from: ${phone.howDetected}", color = Muted)
                if (phone.userName.isNotBlank()) Text("User: ${phone.userName}", color = Muted, fontSize = 12.sp)
                if (phone.googleHint.isNotBlank()) Text("Google: ${phone.googleHint}", color = Muted, fontSize = 12.sp)
                if (phone.deviceName.isNotBlank()) Text("Device name: ${phone.deviceName}", color = Muted, fontSize = 12.sp)
                Text("Android ID: ${phone.androidId}", color = Muted, fontSize = 12.sp)
                Text(
                    "No tap needed. Google Pixel or a profile/account with “simon” → Simon. Anything else → Gaythan.",
                    color = Muted,
                )
            }
        }
        CardBlock("Use a chat .txt already on this phone") {
            Text(
                "WhatsApp cannot push chats into this app automatically. Put the export in Files (or Downloads), then pick it here. The dashboard, audit trail, and charts rebuild from that file.",
                color = Muted,
            )
        }
        Button(
            onClick = onPickTxt,
            enabled = !state.importing,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Accent),
        ) {
            Text("Choose .txt from phone", fontWeight = FontWeight.Bold)
        }
        Button(
            onClick = onPickAny,
            enabled = !state.importing,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text("Browse any file (.txt or .zip)")
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
        CardBlock("How to get the file onto the phone") {
            Text("1. WhatsApp → Gaythan chat → ⋮ → More → Export chat", color = Muted)
            Text("2. Without media (saves a .txt, sometimes inside a .zip)", color = Muted)
            Text("3. Save to Files / Downloads", color = Muted)
            Text("4. Tap Choose .txt from phone, or open the file and Share → Golf Skips", color = Muted)
        }
        Spacer(Modifier.height(24.dp))
    }
}
