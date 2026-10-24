package com.simon.golfchatreview.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simon.golfchatreview.data.Snapshot
import com.simon.golfchatreview.ui.charts.DonutChart
import com.simon.golfchatreview.ui.theme.Accent
import com.simon.golfchatreview.ui.theme.Both
import com.simon.golfchatreview.ui.theme.Gaythan
import com.simon.golfchatreview.ui.theme.Muted
import com.simon.golfchatreview.ui.theme.Simon
import com.simon.golfchatreview.ui.theme.Surface
import com.simon.golfchatreview.ui.theme.Warn
import com.simon.golfchatreview.ui.theme.whoColor

@Composable
fun DashboardScreen(snap: Snapshot) {
    val s = snap.stats
    val ns = snap.analytics.noticeSummary
    val pct = if (ns.knownCount > 0) (ns.sameDay * 100 / ns.knownCount) else 0
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Golf skips", fontSize = 26.sp, fontWeight = FontWeight.Bold)
            Text(
                snap.meta?.let { "Updated ${it.fileName} · ${it.messageCount} msgs · ${it.dateRange}" }
                    ?: "Bundled snapshot (import an export to refresh)",
                color = Muted,
                fontSize = 13.sp,
            )
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Kpi("Confirmed", "${s.confirmedTotal}", Accent, Modifier.weight(1f))
                Kpi("Simon", "${s.simon}", Simon, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Kpi("Gaythan", "${s.gaythan}", Gaythan, Modifier.weight(1f))
                Kpi("Both", "${s.both}", Both, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Kpi("Median notice", ns.medianHours?.let { "${it}h" } ?: "—", Accent, Modifier.weight(1f))
                Kpi("Same-day", "$pct%", Warn, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Kpi("<2 hours", "${ns.under2h}", Warn, Modifier.weight(1f))
                Kpi("After start", "${ns.afterStart}", Warn, Modifier.weight(1f))
            }
        }
        item {
            CardBlock("Who skipped") {
                DonutChart(
                    listOf(Simon to s.simon.toFloat(), Gaythan to s.gaythan.toFloat(), Both to s.both.toFloat()),
                    "${s.confirmedTotal}",
                )
            }
        }
        item {
            CardBlock("Top 5 excuses") {
                snap.analytics.topExcuses.forEach { e ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("#${e.rank}  ${e.category}", fontSize = 15.sp)
                        Text("${e.count}", color = Accent, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }
                }
            }
        }
        item {
            CardBlock("Worst notice") {
                snap.analytics.worstNotice.take(5).forEach { w ->
                    val h = w.noticeHours
                    val label = when {
                        h == null -> "—"
                        h < 0 -> "${"%.1f".format(-h)}h after start"
                        else -> "${"%.1f".format(h)}h before"
                    }
                    Text(
                        "${w.date}  ${w.who}  ·  $label",
                        color = whoColor(w.who),
                        fontSize = 14.sp,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )
                    Text(w.note.take(90), color = Muted, fontSize = 12.sp)
                    Spacer(Modifier.height(6.dp))
                }
            }
        }
        item {
            CardBlock("Bottom line") {
                Text("• Gaythan has more confirmed skips (${s.gaythan} vs Simon ${s.simon}).", color = Muted)
                Spacer(Modifier.height(6.dp))
                Text("• Simon’s median notice ${ns.simonMedian ?: "?"}h; Gaythan ${ns.gaythanMedian ?: "?"}h.", color = Muted)
                Spacer(Modifier.height(6.dp))
                Text("• ${ns.under2h} skips gave under 2 hours; ${ns.afterStart} after start.", color = Muted)
                Spacer(Modifier.height(6.dp))
                Text("• Weekday plans often die by the weekend (${s.weekdayConfirmed} confirmed failures).", color = Muted)
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
fun Kpi(label: String, value: String, color: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Surface)
            .padding(14.dp),
    ) {
        Text(value, color = color, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Text(label, color = Muted, fontSize = 12.sp)
    }
}

@Composable
fun CardBlock(title: String, content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Surface)
            .padding(14.dp),
    ) {
        Text(title, color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(Modifier.height(8.dp))
        content()
    }
}
