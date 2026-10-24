package com.simon.golfchatreview.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simon.golfchatreview.ui.theme.Gaythan
import com.simon.golfchatreview.ui.theme.Muted
import com.simon.golfchatreview.ui.theme.Warn

@Composable
fun PrankScreen(onBack: () -> Unit, onPlayInApp: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .border(3.dp, Gaythan, RoundedCornerShape(8.dp))
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("INDEPENDENT RELIABILITY RATING", color = Warn, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text("Certified finding (banter edition)", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
            Text(
                "Nathan is more unreliable than a North Korean ICBM.",
                color = androidx.compose.ui.graphics.Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(vertical = 16.dp),
            )
            Text(
                "Joke / group-chat energy only — not an intelligence assessment, not a real missile rating, not golf evidence.",
                color = Muted,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
            )
        }
        Button(
            onClick = onPlayInApp,
            modifier = Modifier.fillMaxWidth().padding(top = 20.dp).height(56.dp),
        ) {
            Text("Play verification video")
        }
        TextButton(onClick = onBack, modifier = Modifier.height(48.dp)) {
            Text("Back to the real numbers")
        }
    }
}
