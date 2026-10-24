package com.simon.golfchatreview.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.options.IFramePlayerOptions
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView
import com.simon.golfchatreview.ui.theme.Bg
import com.simon.golfchatreview.ui.theme.Muted
import kotlinx.coroutines.delay

private const val TRUMP_ROLL = "dCUXNAeB7RE"

@Composable
fun TrumpRickrollScreen(onBack: () -> Unit) {
    var flipped by remember { mutableStateOf(false) }
    val rot by animateFloatAsState(if (flipped) 0f else 90f, tween(800), label = "flip")
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(Unit) {
        delay(40)
        flipped = true
    }
    Box(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .graphicsLayer {
                rotationY = rot
                cameraDistance = 18f * density
            },
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                YouTubePlayerView(context).apply {
                    enableAutomaticInitialization = false
                    lifecycle.addObserver(this)
                    val opts = IFramePlayerOptions.Builder()
                        .controls(0)
                        .rel(0)
                        .ivLoadPolicy(3)
                        .build()
                    initialize(object : AbstractYouTubePlayerListener() {
                        override fun onReady(youTubePlayer: YouTubePlayer) {
                            youTubePlayer.loadVideo(TRUMP_ROLL, 0f)
                        }
                    }, opts)
                }
            },
            onRelease = { view ->
                lifecycle.removeObserver(view)
                view.release()
            },
        )
        TextButton(onClick = onBack, modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp)) {
            Text("Close", color = Muted)
        }
    }
}
