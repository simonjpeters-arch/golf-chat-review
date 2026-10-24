package com.simon.golfchatreview.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Bg = Color(0xFF0F1419)
val Surface = Color(0xFF1A2332)
val Surface2 = Color(0xFF243044)
val Text = Color(0xFFE8EDF4)
val Muted = Color(0xFF8B9CB3)
val Accent = Color(0xFF3DD68C)
val Simon = Color(0xFF5B9FD4)
val Gaythan = Color(0xFFE07A5F)
val Both = Color(0xFFB48EAD)
val Warn = Color(0xFFF0A090)
val Fizzled = Color(0xFFF2CC60)

private val scheme = darkColorScheme(
    primary = Accent,
    onPrimary = Color(0xFF052010),
    background = Bg,
    onBackground = Text,
    surface = Surface,
    onSurface = Text,
    surfaceVariant = Surface2,
    onSurfaceVariant = Muted,
    error = Gaythan,
)

@Composable
fun GolfTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, content = content)
}

fun whoColor(who: String): Color {
    val w = who.lowercase()
    return when {
        w.contains("both") -> Both
        w.contains("simon") && !w.contains("gaythan") -> Simon
        w.contains("gaythan") -> Gaythan
        else -> Muted
    }
}
