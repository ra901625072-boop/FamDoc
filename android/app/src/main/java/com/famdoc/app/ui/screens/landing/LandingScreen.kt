package com.famdoc.app.ui.screens.landing

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.FamDocBrandLogo
import com.famdoc.app.ui.components.LogoOrientation
import com.famdoc.app.ui.theme.*

@Composable
fun LandingScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToJoin: () -> Unit
) {
    val scrollState = rememberScrollState()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(horizontal = Dimens.FormPaddingHorizontal, vertical = Dimens.ScreenPaddingVertical),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            // Hero FamDoc Bespoke Brand Logo
            FamDocBrandLogo(
                modifier = Modifier.staggeredEntrance(index = 0),
                crestSize = 78.dp,
                orientation = LogoOrientation.VERTICAL,
                showTagline = true
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing24))

            Text(
                text = "Gather your family's records in one timeless vault.",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 24.sp,
                    lineHeight = 32.sp,
                    letterSpacing = (-0.3).sp
                ),
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.staggeredEntrance(index = 1)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing12))

            Text(
                text = "Preserve your deeds, certificates, family heirlooms, and documents in a warm, private vault. Built to feel like a timeless keepsake box, not a cold cloud drive.",
                style = MaterialTheme.typography.bodyMedium.copy(
                    lineHeight = 22.sp
                ),
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .staggeredEntrance(index = 2)
                    .padding(horizontal = Dimens.Spacing8)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing28))

            // Action Buttons with tactile bounce & consistent heights
            Button(
                onClick = onNavigateToRegister,
                modifier = Modifier
                    .staggeredEntrance(index = 3)
                    .fillMaxWidth()
                    .height(Dimens.PrimaryButtonHeight)
                    .bounceClick(scaleDown = 0.96f, onClick = onNavigateToRegister),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                Icon(Icons.Default.AddCircleOutline, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(Dimens.Spacing10))
                Text("Create a Family Vault", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing12))

            OutlinedButton(
                onClick = onNavigateToJoin,
                modifier = Modifier
                    .staggeredEntrance(index = 4)
                    .fillMaxWidth()
                    .height(Dimens.PrimaryButtonHeight)
                    .bounceClick(scaleDown = 0.96f, onClick = onNavigateToJoin),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                border = ButtonDefaults.outlinedButtonBorder(enabled = true)
            ) {
                Icon(Icons.Default.VpnKey, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(Dimens.Spacing10))
                Text("Join with Family Code", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing8))

            TextButton(
                onClick = onNavigateToLogin,
                modifier = Modifier
                    .staggeredEntrance(index = 5)
                    .fillMaxWidth()
                    .bounceClick(scaleDown = 0.97f, onClick = onNavigateToLogin)
            ) {
                Text(
                    "Already have a vault? Log In →",
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing32))

            // Feature Highlights
            Column(
                verticalArrangement = Arrangement.spacedBy(Dimens.Spacing12),
                modifier = Modifier.staggeredEntrance(index = 6)
            ) {
                FeatureCard(
                    icon = Icons.Default.Shield,
                    iconGradient = listOf(MintPrimaryLight, MintPrimary),
                    title = "Private & Self-Contained",
                    description = "All uploads are isolated exclusively in your family's dedicated vault. No external third-party access."
                )

                FeatureCard(
                    icon = Icons.Default.ConfirmationNumber,
                    iconGradient = listOf(BrandAccent, Color(0xFFD97706)),
                    title = "Shared Keepsake Code",
                    description = "Invite members using a single physical-looking code. Admins manage rosters effortlessly."
                )

                FeatureCard(
                    icon = Icons.Default.Search,
                    iconGradient = listOf(MintSecondary, Color(0xFF059669)),
                    title = "Instant Document Previews",
                    description = "Filter by type, uploader, date, and keyword with built-in instant PDF, image, and text previews."
                )
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing24))
        }
    }
}

@Composable
private fun FeatureCard(
    icon: ImageVector,
    iconGradient: List<Color>,
    title: String,
    description: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .bounceClick(scaleDown = 0.98f)
            .border(
                Dimens.BorderThin,
                MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                RoundedCornerShape(Dimens.RadiusLarge)
            ),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
    ) {
        Row(
            modifier = Modifier.padding(Dimens.Spacing16),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(Dimens.RadiusMedium))
                    .background(Brush.linearGradient(iconGradient)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(Dimens.Spacing14))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(Dimens.Spacing4))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall.copy(lineHeight = 18.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
