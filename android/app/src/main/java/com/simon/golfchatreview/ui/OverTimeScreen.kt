package com.simon.golfchatreview.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simon.golfchatreview.data.Snapshot
import com.simon.golfchatreview.ui.charts.CumulativeLines
import com.simon.golfchatreview.ui.charts.NoticeBars
import com.simon.golfchatreview.ui.charts.StackedBars
import com.simon.golfchatreview.ui.theme.Muted
import java.time.LocalDate

@Composable
fun OverTimeScreen(snap: Snapshot) {
    data class Q(val key: String, var s: Float = 0f, var g: Float = 0f, var b: Float = 0f)
    val quarters = linkedMapOf<String, Q>()
    var runS = 0f
    var runG = 0f
    val simonLine = mutableListOf<Float>()
    val gayLine = mutableListOf<Float>()
    snap.confirmed.sortedBy { parseLoose(it.date) }.forEach { row ->
        val d = parseLoose(row.date) ?: return@forEach
        val q = d.year.toString() + "-Q" + ((d.monthValue - 1) / 3 + 1)
        val bucket = quarters.getOrPut(q) { Q(q) }
        when (row.whoSkipped) {
            "Simon" -> { bucket.s += 1; runS += 1 }
            "Gaythan" -> { bucket.g += 1; runG += 1 }
            "Both" -> bucket.b += 1
        }
        simonLine += runS
        gayLine += runG
    }
    val qList = quarters.values.toList()
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Over time", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("Same ${snap.stats.confirmedTotal} confirmed rows as Audit — not a second count.", color = Muted, fontSize = 13.sp)
        }
        item {
            CardBlock("Quarterly volume") {
                StackedBars(
                    labels = qList.map { it.key.takeLast(2) + it.key.substringAfter("-") },
                    series = qList.map { Triple(it.s, it.g, it.b) },
                )
                Text("Blue Simon · coral Gaythan · purple Both", color = Muted, fontSize = 12.sp)
            }
        }
        item {
            CardBlock("Cumulative skips") {
                CumulativeLines(simonLine, gayLine)
                Text("Running total: Simon vs Gaythan", color = Muted, fontSize = 12.sp)
            }
        }
        item {
            CardBlock("Notice buckets") {
                NoticeBars(snap.analytics.noticeBuckets)
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

private fun parseLoose(s: String): LocalDate? {
    val m = Regex("""(\d{1,2})/(\d{1,2})/(\d{2,4})""").find(s) ?: return null
    var y = m.groupValues[3].toInt()
    if (y < 100) y += 2000
    return LocalDate.of(y, m.groupValues[1].toInt(), m.groupValues[2].toInt())
}
