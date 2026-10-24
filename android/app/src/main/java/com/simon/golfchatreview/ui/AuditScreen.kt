package com.simon.golfchatreview.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simon.golfchatreview.data.AnalysisEngine
import com.simon.golfchatreview.data.Snapshot
import com.simon.golfchatreview.ui.theme.Accent
import com.simon.golfchatreview.ui.theme.Muted
import com.simon.golfchatreview.ui.theme.Surface
import com.simon.golfchatreview.ui.theme.Warn
import com.simon.golfchatreview.ui.theme.whoColor

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AuditScreen(snap: Snapshot, onVerify: () -> Unit) {
    var filter by rememberSaveable { mutableStateOf("All") }
    val all = AnalysisEngine.auditItems(snap)
    val rows = all.filter { item ->
        when (filter) {
            "Simon" -> item.who == "Simon"
            "Gaythan" -> item.who == "Gaythan"
            "Both" -> item.who == "Both"
            "Short notice" -> (item.noticeHours ?: 99.0) < 2
            else -> true
        }
    }
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text("Audit trail", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(
                "${rows.size} of ${all.size}  ·  counts match dashboard (${snap.stats.confirmedTotal} confirmed)",
                color = Muted,
                fontSize = 13.sp,
            )
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All", "Simon", "Gaythan", "Both", "Short notice").forEach { chip ->
                    FilterChip(
                        selected = filter == chip,
                        onClick = { filter = chip },
                        label = { Text(chip) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Accent.copy(alpha = 0.25f),
                            selectedLabelColor = Accent,
                        ),
                    )
                }
            }
        }
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(rows, key = { it.date + it.who + it.quote.take(20) }) { item ->
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Surface)
                        .padding(14.dp),
                ) {
                    Text(
                        "${item.date}  ·  ${item.who}",
                        color = whoColor(item.who),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                    Text(item.planned, color = Muted, fontSize = 13.sp)
                    Spacer(Modifier.height(6.dp))
                    Text(item.quote, fontSize = 14.sp)
                    val h = item.noticeHours
                    val notice = when {
                        h == null -> "Notice unknown"
                        h < 0 -> "${"%.1f".format(-h)}h after inferred start"
                        else -> "${"%.1f".format(h)}h notice"
                    }
                    Text("$notice  ·  ${item.category}", color = Accent, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
                    if (item.outcome.isNotBlank()) Text(item.outcome, color = Muted, fontSize = 12.sp)
                }
            }
            item {
                TextButton(onClick = onVerify, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("Verify evidence", color = Warn, fontSize = 16.sp)
                }
                Text(
                    "The list above is the real ledger. Verify is optional comedy for Nathan.",
                    color = Muted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 24.dp),
                )
            }
        }
    }
}
