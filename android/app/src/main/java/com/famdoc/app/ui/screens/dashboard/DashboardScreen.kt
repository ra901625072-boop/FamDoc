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
import com.famdoc.app.ui.animation.rotatingRefresh
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
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.rotatingRefresh(isRotating = statsState is Resource.Loading)
                        )
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
        // 1. Statistics Cards Grid (4 Cards: 2x2 layout)
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 0),
                verticalArrangement = Arrangement.spacedBy(Dimens.Spacing8)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
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
                        title = "Folders",
                        value = stats.totalFolders.toString(),
                        icon = Icons.Default.Folder,
                        iconColor = CategoryDocColor,
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToVault
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing8)
                ) {
                    StatCard(
                        title = "Space Used",
                        value = FileUtils.formatBytes(stats.totalSizeBytes),
                        icon = Icons.Default.Storage,
                        iconColor = MintSecondary,
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToStorage
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
        }

        // 2. Storage Category Distribution Breakdown Card
        item {
            val totalBytes = stats.storageQuotaBytes.coerceAtLeast(1L)
            val usedBytes = stats.totalSizeBytes
            val freeBytes = (totalBytes - usedBytes).coerceAtLeast(0L)
            val percentUsed = ((usedBytes.toFloat() / totalBytes) * 100).toInt().coerceIn(0, 100)

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
                    // Header
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
                                    Icons.Default.PieChart,
                                    contentDescription = null,
                                    tint = MintSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(Dimens.Spacing10))
                            Column {
                                Text(
                                    text = "Storage Breakdown",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                                )
                                Text(
                                    text = "${FileUtils.formatBytes(usedBytes)} of ${FileUtils.formatBytes(totalBytes)} ($percentUsed%)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = MintSecondary.copy(alpha = 0.15f),
                            onClick = onNavigateToStorage,
                            modifier = Modifier.bounceClick(scaleDown = 0.92f, onClick = onNavigateToStorage)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Pool →",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = MintSecondary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(Dimens.Spacing14))

                    // Multi-segment Colored Category Progress Bar
                    val breakdown = stats.storageBreakdown ?: emptyMap()
                    val categories = listOf(
                        Triple("image", "Images", CategoryImageColor),
                        Triple("pdf", "PDFs", CategoryPdfColor),
                        Triple("document", "Docs", CategoryDocColor),
                        Triple("sheet", "Sheets", CategorySheetColor),
                        Triple("text", "Text", CategoryTextColor),
                        Triple("other", "Other", CategoryOtherColor)
                    )

                    var animationTrigger by remember { mutableStateOf(false) }
                    LaunchedEffect(Unit) { animationTrigger = true }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        var totalWeight = 0f
                        categories.forEach { (key, _, color) ->
                            val catSize = breakdown[key]?.size ?: 0L
                            if (catSize > 0) {
                                val weight = (catSize.toFloat() / totalBytes).coerceIn(0.01f, 1f)
                                val animatedWeight by animateFloatAsState(
                                    targetValue = if (animationTrigger) weight else 0f,
                                    animationSpec = tween(1000, easing = FastOutSlowInEasing),
                                    label = "catWeight_$key"
                                )
                                if (animatedWeight > 0f) {
                                    totalWeight += animatedWeight
                                    Box(
                                        modifier = Modifier
                                            .weight(animatedWeight)
                                            .fillMaxHeight()
                                            .background(color)
                                    )
                                }
                            }
                        }
                        val remaining = (1f - totalWeight).coerceAtLeast(0.001f)
                        Box(
                            modifier = Modifier
                                .weight(remaining)
                                .fillMaxHeight()
                                .background(Color.Transparent)
                        )
                    }

                    Spacer(modifier = Modifier.height(Dimens.Spacing12))

                    // 2-Column Category Chips Grid
                    Column(verticalArrangement = Arrangement.spacedBy(Dimens.Spacing6)) {
                        for (i in categories.indices step 2) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing8)
                            ) {
                                CategoryChip(
                                    label = categories[i].second,
                                    color = categories[i].third,
                                    sizeBytes = breakdown[categories[i].first]?.size ?: 0L,
                                    count = breakdown[categories[i].first]?.count ?: 0,
                                    modifier = Modifier.weight(1f)
                                )
                                if (i + 1 < categories.size) {
                                    CategoryChip(
                                        label = categories[i + 1].second,
                                        color = categories[i + 1].third,
                                        sizeBytes = breakdown[categories[i + 1].first]?.size ?: 0L,
                                        count = breakdown[categories[i + 1].first]?.count ?: 0,
                                        modifier = Modifier.weight(1f)
                                    )
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Quick Actions Toolbar
        item {
            Column(modifier = Modifier.staggeredEntrance(index = 2)) {
                Text(
                    text = "Quick Actions",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.height(Dimens.Spacing10))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing8)
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
                        Icon(Icons.Default.FolderOpen, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Vault", fontWeight = FontWeight.Bold, fontSize = 12.sp)
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
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Invite", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    OutlinedButton(
                        onClick = onNavigateToStorage,
                        modifier = Modifier
                            .weight(1f)
                            .height(Dimens.SecondaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f, onClick = onNavigateToStorage),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MintSecondary),
                        border = ButtonDefaults.outlinedButtonBorder(enabled = true)
                    ) {
                        Icon(Icons.Default.CloudQueue, contentDescription = null, modifier = Modifier.size(16.dp), tint = MintSecondary)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Storage", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MintSecondary)
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

@Composable
private fun CategoryChip(
    label: String,
    color: Color,
    sizeBytes: Long,
    count: Int,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(Dimens.RadiusMedium),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(color)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Column {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1
                )
                Text(
                    text = "${FileUtils.formatBytes(sizeBytes)} ($count)",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }
        }
    }
}
