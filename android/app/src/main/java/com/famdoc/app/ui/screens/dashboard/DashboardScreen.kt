package com.famdoc.app.ui.screens.dashboard

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.core.utils.DateFormatter
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.DashboardStats
import com.famdoc.app.data.models.User
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.*
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    dashboardViewModel: DashboardViewModel,
    currentUser: User?,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onOpenDrawer: () -> Unit,
    onNavigateToVault: () -> Unit,
    onNavigateToFamily: () -> Unit,
    onNavigateToStorage: () -> Unit,
    onNavigateToFilePreview: (fileId: Int, filename: String, fileType: String) -> Unit
) {
    val statsState by dashboardViewModel.statsState.collectAsState()

    LaunchedEffect(Unit) {
        dashboardViewModel.loadStats()
    }

    Scaffold(
        topBar = {
            FamDocAppBar(
                title = "FamDoc Vault",
                subtitle = "Good day, ${currentUser?.username ?: "Family"}",
                navigationIcon = Icons.Default.Menu,
                onNavigationClick = onOpenDrawer,
                showBrandBadge = true,
                actions = {
                    IconButton(
                        onClick = { dashboardViewModel.loadStats() },
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { dashboardViewModel.loadStats() }
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            WakeupBanner(serverStatus = serverStatus, isOffline = isOffline)

            when (val state = statsState) {
                is Resource.Loading -> {
                    LoadingSkeletonView(itemCount = 4)
                }

                is Resource.Error -> {
                    ErrorRetryView(
                        message = state.message,
                        onRetry = { dashboardViewModel.loadStats() }
                    )
                }

                is Resource.Success -> {
                    DashboardContent(
                        stats = state.data,
                        currentUser = currentUser,
                        onNavigateToVault = onNavigateToVault,
                        onNavigateToFamily = onNavigateToFamily,
                        onNavigateToStorage = onNavigateToStorage,
                        onNavigateToFilePreview = onNavigateToFilePreview
                    )
                }

                Resource.Idle -> {}
            }
        }
    }
}

@Composable
private fun DashboardContent(
    stats: DashboardStats,
    currentUser: User?,
    onNavigateToVault: () -> Unit,
    onNavigateToFamily: () -> Unit,
    onNavigateToStorage: () -> Unit,
    onNavigateToFilePreview: (fileId: Int, filename: String, fileType: String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing16),
        verticalArrangement = Arrangement.spacedBy(Dimens.Spacing16)
    ) {
        // 1. Statistics Cards Row with Staggered Entrance
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 0),
                horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing8)
            ) {
                StatCard(
                    title = "Total Files",
                    value = stats.totalFiles.toString(),
                    icon = Icons.AutoMirrored.Filled.InsertDriveFile,
                    iconColor = MintPrimaryLight,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToVault
                )
                StatCard(
                    title = "Space Used",
                    value = FileUtils.formatBytes(stats.totalSizeBytes),
                    icon = Icons.Default.Storage,
                    iconColor = MintSecondary,
                    modifier = Modifier.weight(1f),
                    onClick = if (currentUser?.isAdmin == true) onNavigateToStorage else onNavigateToVault
                )
                StatCard(
                    title = "Members",
                    value = stats.totalMembers.toString(),
                    icon = Icons.Default.People,
                    iconColor = BrandAccent,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToFamily
                )
            }
        }

        // 2. Storage Quota Progress Meter with Smooth Dynamic Animation
        item {
            val targetProgress = if (stats.storageQuotaBytes > 0) {
                (stats.totalSizeBytes.toFloat() / stats.storageQuotaBytes).coerceIn(0f, 1f)
            } else 0f

            var progressTrigger by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) {
                progressTrigger = true
            }

            val animatedProgress by animateFloatAsState(
                targetValue = if (progressTrigger) targetProgress else 0f,
                animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
                label = "storageProgress"
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 1)
                    .border(
                        Dimens.BorderThin,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                        RoundedCornerShape(Dimens.RadiusLarge)
                    ),
                shape = RoundedCornerShape(Dimens.RadiusLarge),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
            ) {
                Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(MintSecondary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.CloudQueue,
                                    contentDescription = null,
                                    tint = MintSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(Dimens.Spacing10))
                            Text(
                                text = "Storage Pool Usage",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = MintSecondary.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = stats.storageProvider.uppercase(),
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold),
                                color = MintSecondary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(Dimens.Spacing14))

                    LinearProgressIndicator(
                        progress = { animatedProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = if (animatedProgress > 0.9f) BrandError else MintSecondary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    Spacer(modifier = Modifier.height(Dimens.Spacing8))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Used ${FileUtils.formatBytes(stats.totalSizeBytes)}",
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "Limit ${FileUtils.formatBytes(stats.storageQuotaBytes)}",
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // 3. Quick Actions
        item {
            Column(modifier = Modifier.staggeredEntrance(index = 2)) {
                Text(
                    text = "Quick Actions",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.height(Dimens.Spacing10))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing10)
                ) {
                    Button(
                        onClick = onNavigateToVault,
                        modifier = Modifier
                            .weight(1f)
                            .height(Dimens.SecondaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f, onClick = onNavigateToVault),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Icon(Icons.Default.FolderOpen, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(Dimens.Spacing8))
                        Text("Browse Vault", fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = onNavigateToFamily,
                        modifier = Modifier
                            .weight(1f)
                            .height(Dimens.SecondaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f, onClick = onNavigateToFamily),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                        border = ButtonDefaults.outlinedButtonBorder(enabled = true)
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(Dimens.Spacing8))
                        Text("Invite Member", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // 4. Recent Uploads Header & List
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 3),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Recent Vault Uploads",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
                TextButton(
                    onClick = onNavigateToVault,
                    modifier = Modifier.bounceClick(scaleDown = 0.95f, onClick = onNavigateToVault)
                ) {
                    Text("View All →", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }
        }

        if (stats.recentUploads.isEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .staggeredEntrance(index = 4),
                    shape = RoundedCornerShape(Dimens.RadiusLarge),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = CardDefaults.outlinedCardBorder()
                ) {
                    Text(
                        text = "No files uploaded yet. Add your first family document in the Vault.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(Dimens.Spacing20)
                    )
                }
            }
        } else {
            items(
                items = stats.recentUploads,
                key = { "recent_file_${it.id}" },
                contentType = { "file" }
            ) { file ->
                FileItemRow(
                    file = file,
                    modifier = Modifier.animateItem(),
                    onClick = { onNavigateToFilePreview(file.id, file.filename, file.fileType) },
                    onLongClick = {},
                    onMoreClick = { onNavigateToFilePreview(file.id, file.filename, file.fileType) }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(Dimens.Spacing24)) }
    }
}
