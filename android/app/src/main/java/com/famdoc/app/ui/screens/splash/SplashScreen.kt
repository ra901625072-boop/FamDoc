package com.famdoc.app.ui.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.ui.components.BrandElectricBlue
import com.famdoc.app.ui.components.BrandNavySlate
import com.famdoc.app.ui.components.BrandRoyalBlue
import com.famdoc.app.ui.components.FamDocCrest
import com.famdoc.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun SplashScreen(
    isLoggedIn: Boolean,
    onNavigateToDashboard: () -> Unit,
    onNavigateToLanding: () -> Unit
) {
    val isDark = MaterialTheme.colorScheme.background == DarkAmoledBackground

    // Stage 1: Brand Crest Scale & Fade
    val crestScale = remember { Animatable(0.90f) }
    val crestAlpha = remember { Animatable(0f) }

    // Stage 2: Typography & Tagline Fade & Slide-up
    val textAlpha = remember { Animatable(0f) }
    val textOffsetY = remember { Animatable(18f) }

    // Subtle background ambient ring
    val auraAlpha = remember { Animatable(0f) }
    val auraScale = remember { Animatable(0.7f) }

    LaunchedEffect(Unit) {
        // Coordinated parallel animations for smooth 60/120fps entrance
        launch {
            auraAlpha.animateTo(
                targetValue = 0.35f,
                animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing)
            )
        }
        launch {
            auraScale.animateTo(
                targetValue = 1.3f,
                animationSpec = tween(durationMillis = 900, easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f))
            )
        }
        launch {
            crestAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 400, easing = LinearOutSlowInEasing)
            )
        }
        launch {
            crestScale.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 450, easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f))
            )
        }

        // Slight offset before text entrance
        delay(180)

        launch {
            textAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 350, easing = FastOutSlowInEasing)
            )
        }
        launch {
            textOffsetY.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 350, easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f))
            )
        }

        // Minimum polished visual hold (fast & responsive)
        delay(650)

        if (isLoggedIn) {
            onNavigateToDashboard()
        } else {
            onNavigateToLanding()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                        MaterialTheme.colorScheme.background
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Subtle ambient blue glow ring
        Box(
            modifier = Modifier
                .size(260.dp)
                .scale(auraScale.value)
                .alpha(auraAlpha.value)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            BrandRoyalBlue.copy(alpha = 0.25f),
                            BrandElectricBlue.copy(alpha = 0.10f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 24.dp)
        ) {
            // FamDoc Reference Logo Crest
            Box(
                modifier = Modifier
                    .scale(crestScale.value)
                    .alpha(crestAlpha.value)
            ) {
                FamDocCrest(
                    size = 100.dp,
                    isElevated = true,
                    showGlowRing = true
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Brand Title & Tagline matching reference logo
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .alpha(textAlpha.value)
                    .offset(y = textOffsetY.value.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Fam",
                        style = MaterialTheme.typography.displayLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 38.sp,
                            letterSpacing = (-0.5).sp,
                            color = if (isDark) Color.White else BrandNavySlate
                        )
                    )
                    Text(
                        text = "Doc",
                        style = MaterialTheme.typography.displayLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 38.sp,
                            letterSpacing = (-0.5).sp,
                            color = BrandRoyalBlue
                        )
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .width(22.dp)
                            .height(1.5.dp)
                            .background(BrandElectricBlue)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Family Document Vault",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Medium,
                            letterSpacing = 0.4.sp,
                            fontSize = 13.sp
                        ),
                        color = if (isDark) Color.White.copy(alpha = 0.75f) else Color(0xFF334155)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .width(22.dp)
                            .height(1.5.dp)
                            .background(BrandElectricBlue)
                    )
                }
            }
        }
    }
}
