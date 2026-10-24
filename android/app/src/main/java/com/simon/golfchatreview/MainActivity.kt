package com.simon.golfchatreview

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.FactCheck
import androidx.compose.material.icons.outlined.FileUpload
import androidx.compose.material.icons.outlined.ShowChart
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.simon.golfchatreview.ui.AuditScreen
import com.simon.golfchatreview.ui.DashboardScreen
import com.simon.golfchatreview.ui.OverTimeScreen
import com.simon.golfchatreview.ui.PrankScreen
import com.simon.golfchatreview.ui.UpdateScreen
import com.simon.golfchatreview.ui.theme.Bg
import com.simon.golfchatreview.ui.theme.GolfTheme

class MainActivity : ComponentActivity() {
    private val vm: GolfSkipViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIncomingFile(intent)
        enableEdgeToEdge()
        setContent {
            GolfTheme {
                val state by vm.state.collectAsState()
                val nav = rememberNavController()
                val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
                    if (uri != null) vm.importUri(uri)
                }
                LaunchedEffect(state.pendingShareImport) {
                    if (state.pendingShareImport) {
                        nav.navigate("update") {
                            popUpTo("dash") { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                }
                val snap = state.snapshot
                val route = nav.currentBackStackEntryAsState().value?.destination?.route
                Scaffold(
                    containerColor = Bg,
                    bottomBar = {
                        if (route != "prank") {
                            NavigationBar {
                                data class Tab(val r: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
                                listOf(
                                    Tab("dash", "Dashboard", Icons.Outlined.Assessment),
                                    Tab("audit", "Audit", Icons.Outlined.FactCheck),
                                    Tab("time", "Over time", Icons.Outlined.ShowChart),
                                    Tab("update", "Update", Icons.Outlined.FileUpload),
                                ).forEach { t ->
                                    NavigationBarItem(
                                        selected = route == t.r,
                                        onClick = {
                                            nav.navigate(t.r) {
                                                popUpTo("dash") { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        },
                                        icon = { Icon(t.icon, t.label) },
                                        label = { Text(t.label) },
                                    )
                                }
                            }
                        }
                    },
                ) { pad ->
                    Box(Modifier.fillMaxSize().background(Bg).padding(pad)) {
                        if (state.loading || snap == null) {
                            CircularProgressIndicator(Modifier.align(Alignment.Center))
                        } else {
                            NavHost(nav, startDestination = "dash") {
                                composable("dash") { DashboardScreen(snap) }
                                composable("audit") { AuditScreen(snap) { nav.navigate("prank") } }
                                composable("time") { OverTimeScreen(snap) }
                                composable("update") {
                                    UpdateScreen(
                                        state = state,
                                        onPickTxt = {
                                            picker.launch(arrayOf("text/plain", "text/*"))
                                        },
                                        onPickAny = {
                                            picker.launch(arrayOf("*/*"))
                                        },
                                    )
                                }
                                composable("prank") { PrankScreen { nav.popBackStack() } }
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingFile(intent)
    }

    private fun handleIncomingFile(intent: Intent?) {
        if (intent == null) return
        val uri: Uri? = when (intent.action) {
            Intent.ACTION_VIEW -> intent.data
            Intent.ACTION_SEND -> {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(Intent.EXTRA_STREAM)
            }
            else -> null
        }
        if (uri != null) vm.importUri(uri)
    }
}
