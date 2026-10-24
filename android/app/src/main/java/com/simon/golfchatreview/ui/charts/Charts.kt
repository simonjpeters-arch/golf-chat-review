package com.simon.golfchatreview.ui.charts

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.dp
import com.simon.golfchatreview.ui.theme.Both
import com.simon.golfchatreview.ui.theme.Gaythan
import com.simon.golfchatreview.ui.theme.Simon
import kotlin.math.min

@Composable
fun DonutChart(
    slices: List<Pair<Color, Float>>,
    centerLabel: String,
    modifier: Modifier = Modifier.height(180.dp),
) {
    Canvas(modifier.fillMaxWidth()) {
        val total = slices.sumOf { it.second.toDouble() }.toFloat().coerceAtLeast(1f)
        val r = min(size.width, size.height) * 0.38f
        val cx = size.width / 2
        val cy = size.height / 2 - 8f
        var a = -90f
        slices.forEach { (color, value) ->
            val sweep = value / total * 360f
            drawArc(
                color = color,
                startAngle = a,
                sweepAngle = sweep,
                useCenter = true,
                topLeft = Offset(cx - r, cy - r),
                size = Size(r * 2, r * 2),
            )
            a += sweep
        }
        drawCircle(Color(0xFF0F1419), radius = r * 0.55f, center = Offset(cx, cy))
        val p = android.graphics.Paint().apply {
            color = android.graphics.Color.WHITE
            textAlign = android.graphics.Paint.Align.CENTER
            textSize = 40f
            isFakeBoldText = true
        }
        drawContext.canvas.nativeCanvas.drawText(centerLabel, cx, cy + 14f, p)
    }
}

@Composable
fun StackedBars(
    labels: List<String>,
    series: List<Triple<Float, Float, Float>>,
    modifier: Modifier = Modifier.height(200.dp),
) {
    Canvas(modifier.fillMaxWidth()) {
        if (series.isEmpty()) return@Canvas
        val padL = 16f
        val padB = 36f
        val max = series.maxOf { it.first + it.second + it.third }.coerceAtLeast(1f)
        val slot = (size.width - padL) / series.size
        val barW = slot * 0.62f
        series.forEachIndexed { i, (s, g, b) ->
            val x = padL + i * slot + (slot - barW) / 2
            var y = size.height - padB
            fun stack(v: Float, c: Color) {
                if (v <= 0f) return
                val h = v / max * (size.height - padB - 12f)
                drawRect(c, Offset(x, y - h), Size(barW, h))
                y -= h
            }
            stack(s, Simon)
            stack(g, Gaythan)
            stack(b, Both)
            val paint = android.graphics.Paint().apply {
                color = android.graphics.Color.parseColor("#8B9CB3")
                textAlign = android.graphics.Paint.Align.CENTER
                textSize = 22f
            }
            drawContext.canvas.nativeCanvas.drawText(labels.getOrElse(i) { "" }, x + barW / 2, size.height - 8f, paint)
        }
    }
}

@Composable
fun CumulativeLines(
    simon: List<Float>,
    gaythan: List<Float>,
    modifier: Modifier = Modifier.height(200.dp),
) {
    Canvas(modifier.fillMaxWidth()) {
        val n = maxOf(simon.size, gaythan.size)
        if (n < 2) return@Canvas
        val pad = 16f
        val maxY = maxOf(simon.maxOrNull() ?: 1f, gaythan.maxOrNull() ?: 1f).coerceAtLeast(1f)
        fun pts(vals: List<Float>) = vals.mapIndexed { i, v ->
            Offset(
                pad + i / (n - 1).toFloat() * (size.width - pad * 2),
                size.height - pad - v / maxY * (size.height - pad * 2),
            )
        }
        fun line(vals: List<Float>, c: Color) {
            val p = Path()
            pts(vals).forEachIndexed { i, o -> if (i == 0) p.moveTo(o.x, o.y) else p.lineTo(o.x, o.y) }
            drawPath(p, c, style = Stroke(width = 6f, cap = StrokeCap.Round))
        }
        line(simon, Simon)
        line(gaythan, Gaythan)
    }
}

@Composable
fun NoticeBars(
    buckets: Map<String, Int>,
    modifier: Modifier = Modifier.height(180.dp),
) {
    val order = listOf(
        "After start / none", "<2 hours", "Same day (2-6h)", "Same day (6h+)",
        "Previous day", "2-3 days", "3+ days", "Unknown",
    )
    val items = order.mapNotNull { k -> buckets[k]?.let { k to it } }.ifEmpty { buckets.entries.map { it.key to it.value } }
    StackedBars(
        labels = items.map { it.first.take(8) },
        series = items.map { Triple(it.second.toFloat(), 0f, 0f) },
        modifier = modifier,
    )
}
