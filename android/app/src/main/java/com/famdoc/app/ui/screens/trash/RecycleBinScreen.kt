package com.famdoc.app.ui.screens.trash

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
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.core.utils.DateFormatter
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.User
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.rotatingRefresh
import com.famdoc.app.ui.components.*
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.RecycleBinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecycleBinScreen(
    recycleBinViewModel: RecycleBinViewModel,
    currentUser: User?,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onOpenDrawer: () -> Unit
) {
    val recycleBinState by recycleBinViewModel.recycleBinState.collectAsState()
    val actionMessage by recycleBinViewModel.actionMessage.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var itemToPurge by remember { mutableStateOf<Pair<String, Int>?>(null) }

    LaunchedEffect(Unit) {
        recycleBinViewModel.loadRecycleBin()
    }

    LaunchedEffect(actionMessage) {
        actionMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            recycleBinViewModel.clearActionMessage()
        }
    }

    Scaffold(
        topBar = {
            FamDocAppBar(
                title = "Recycle Bin",
                subtitle = "Recover or permanently purge deleted items",
                navigationIcon = Icons.Default.Menu,
                onNavigationClick = onOpenDrawer,
                actions = {
                    IconButton(
                        onClick = { recycleBinViewModel.loadRecycleBin() },
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { recycleBinViewModel.loadRecycleBin() }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.rotatingRefresh(isRotating = recycleBinState is Resource.Loading)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            WakeupBanner(serverStatus = serverStatus, isOffline = isOffline)

            when (val state = recycleBinState) {
                is Resource.Loading -> {
                    LoadingSkeletonView(itemCount = 5)
                }

                is Resource.Error -> {
                    ErrorRetryView(
                        message = state.message,
                        onRetry = { recycleBinViewModel.loadRecycleBin() }
                    )
                }

                is Resource.Success -> {
                    val files = state.data.files
                    val folders = state.data.folders

                    if (files.isEmpty() && folders.isEmpty()) {
                        EmptyStateView(
                            title = "Recycle Bin is Empty",
                            subtitle = "No deleted files or folders found in your family vault.",
                            icon = Icons.Default.DeleteOutline
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing16),
                            verticalArrangement = Arrangement.spacedBy(Dimens.Spacing10)
                        ) {
                            if (folders.isNotEmpty()) {
                                item {
                                    Text(
                                        text = "Deleted Folders (${folders.size})",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                        modifier = Modifier.padding(vertical = Dimens.Spacing4)
                                    )
                                }
                                items(
                                    items = folders,
                                    key = { "del_folder_${it.id}" },
                                    contentType = { "deleted_folder" }
                                ) { folder ->
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .animateItem()
                                            .border(
                                                Dimens.BorderThin,
                                                MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                                RoundedCornerShape(Dimens.RadiusLarge)
                                            ),
                                        shape = RoundedCornerShape(Dimens.RadiusLarge),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(Dimens.Spacing14),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(42.dp)
                                                    .clip(CircleShape)
                                                    .background(BrandAccent.copy(alpha = 0.15f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Folder,
                                                    contentDescription = null,
                                                    tint = BrandAccent
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(Dimens.Spacing14))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = folder.name,
                                                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                                                    color = MaterialTheme.colorScheme.onSurface
                                                )
                                                Spacer(modifier = Modifier.height(Dimens.Spacing2))
                                                Text(
                                                    text = "Deleted ${DateFormatter.formatDateOnly(folder.deletedAt)}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                            IconButton(
                                                onClick = { recycleBinViewModel.restoreItem("folder", folder.id) },
                                                modifier = Modifier.bounceClick(scaleDown = 0.9f) { recycleBinViewModel.restoreItem("folder", folder.id) }
                                            ) {
                                                Icon(Icons.Default.Restore, contentDescription = "Restore folder", tint = MintPrimary)
                                            }
                                            IconButton(
                                                onClick = { itemToPurge = "folder" to folder.id },
                                                modifier = Modifier.bounceClick(scaleDown = 0.9f) { itemToPurge = "folder" to folder.id }
                                            ) {
                                                Icon(Icons.Default.DeleteForever, contentDescription = "Permanently purge", tint = MaterialTheme.colorScheme.error)
                                            }
                                        }
                                    }
                                }
                            }

                            if (files.isNotEmpty()) {
                                item {
                                    Text(
                                        text = "Deleted Files (${files.size})",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                        modifier = Modifier.padding(top = Dimens.Spacing8, bottom = Dimens.Spacing4)
                                    )
                                }
                                items(
                                    items = files,
                                    key = { "del_file_${it.id}" },
                                    contentType = { "deleted_file" }
                                ) { file ->
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .animateItem()
                                            .border(
                                                Dimens.BorderThin,
                                                MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                                RoundedCornerShape(Dimens.RadiusLarge)
                                            ),
                                        shape = RoundedCornerShape(Dimens.RadiusLarge),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(Dimens.Spacing14),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            // Muted visual thumbnail / icon
                                            FileThumbnail(
                                                file = file,
                                                variant = ThumbnailVariant.RecycleMuted,
                                                isSelected = false,
                                                showExtensionBadge = false,
                                                showSelectionBadge = false,
                                                showSharedBadge = false
                                            )
                                            Spacer(modifier = Modifier.width(Dimens.Spacing14))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = file.filename,
                                                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                                                    color = MaterialTheme.colorScheme.onSurface
                                                )
                                                Spacer(modifier = Modifier.height(Dimens.Spacing2))
                                                Text(
                                                    text = "${FileUtils.formatBytes(file.sizeBytes)} • Deleted ${DateFormatter.formatDateOnly(file.deletedAt)}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                            IconButton(
                                                onClick = { recycleBinViewModel.restoreItem("file", file.id) },
                                                modifier = Modifier.bounceClick(scaleDown = 0.9f) { recycleBinViewModel.restoreItem("file", file.id) }
                                            ) {
                                                Icon(Icons.Default.Restore, contentDescription = "Restore file", tint = MintPrimary)
                                            }
                                            IconButton(
                                                onClick = { itemToPurge = "file" to file.id },
                                                modifier = Modifier.bounceClick(scaleDown = 0.9f) { itemToPurge = "file" to file.id }
                                            ) {
                                                Icon(Icons.Default.DeleteForever, contentDescription = "Permanently purge", tint = MaterialTheme.colorScheme.error)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Resource.Idle -> {}
            }
        }

        // Purge Confirmation Dialog
        if (itemToPurge != null) {
            val (type, id) = itemToPurge!!
            ConfirmDialog(
                title = "Permanently Delete",
                message = "This item will be irrevocably purged from the vault. This action cannot be undone.",
                confirmText = "Purge Forever",
                isDestructive = true,
                onConfirm = {
                    recycleBinViewModel.purgeItem(type, id)
                    itemToPurge = null
                },
                onDismiss = { itemToPurge = null }
            )
        }
    }
}
