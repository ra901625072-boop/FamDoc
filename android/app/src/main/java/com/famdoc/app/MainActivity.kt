package com.famdoc.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.famdoc.app.ui.navigation.FamDocNavGraph
import com.famdoc.app.ui.navigation.Screen
import com.famdoc.app.ui.theme.FamDocTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val appConfig = FamDocApplication.instance.appConfig
            val themeMode by appConfig.themeMode.collectAsState()

            FamDocTheme(themeMode = themeMode) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    FamDocNavGraph(navController = navController)

                    // Check for deep link intent
                    LaunchedEffect(intent) {
                        handleDeepLink(intent) { token ->
                            navController.navigate(Screen.PublicShare.createRoute(token))
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun handleDeepLink(intent: Intent?, onTokenFound: (String) -> Unit) {
        val data: Uri? = intent?.data
        if (data != null) {
            val token = data.getQueryParameter("token") ?: data.lastPathSegment
            if (!token.isNullOrBlank()) {
                onTokenFound(token)
            }
        }
    }
}
