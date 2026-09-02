package com.famdoc.app.ui.screens.vault

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.data.models.FolderItem
import com.famdoc.app.data.models.User
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.pulsingAura
import com.famdoc.app.ui.components.*
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.VaultViewModel

enum class ViewMode {
    LIST,
    GRID
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultScreen(
    vaultViewModel: VaultViewModel,
    currentUser: User? = null,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onOpenDrawer: () -> Unit,
    onNavigateToFilePreview: (fileId: Int, filename: String, fileType: String) -> Unit
) {
    val context = LocalContext.current
    val haptic = androidx.compose.ui.platform.LocalHapticFeedback.current
    val currentFolder by vaultViewModel.currentFolder.collectAsState()
    val breadcrumbs by vaultViewModel.breadcrumbs.collectAsState()
    val foldersState by vaultViewModel.foldersState.collectAsState()
    val filesState by vaultViewModel.filesState.collectAsState()
    val uploadState by vaultViewModel.uploadState.collectAsState()
    val shareLinksState by vaultViewModel.shareLinksState.collectAsState()

    val selectedFiles by vaultViewModel.selectedFiles.collectAsState()
    val selectedFolders by vaultViewModel.selectedFolders.collectAsState()
    val isSelectionMode = selectedFiles.isNotEmpty() || selectedFolders.isNotEmpty()

    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var isSearchActive by remember { mutableStateOf(false) }

    // Dual View Mode State (1. List vs 2. Box / Grid)
    var viewMode by remember { mutableStateOf(ViewMode.GRID) }

    // Dialog & Action States
    var showCreateFolderDialog by remember { mutableStateOf(false) }
    var newFolderName by remember { mutableStateOf("") }

    var itemToRename by remember { mutableStateOf<Pair<String, Any>?>(null) }
    var renameText by remember { mutableStateOf("") }

    var itemToDelete by remember { mutableStateOf<Pair<String, Any>?>(null) }
    var fileToShare by remember { mutableStateOf<FileItem?>(null) }

    // Move Dialog States
    var fileToMove by remember { mutableStateOf<FileItem?>(null) }
    var folderToMove by remember { mutableStateOf<FolderItem?>(null) }
    var showBulkMoveDialog by remember { mutableStateOf(false) }

    // Action Menus (Bottom Sheets)
    var selectedActionFile by remember { mutableStateOf<FileItem?>(null) }
    var selectedActionFolder by remember { mutableStateOf<FolderItem?>(null) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris: List<Uri> ->
        uris.forEach { uri ->
            vaultViewModel.uploadFile(uri)
        }
    }

    LaunchedEffect(Unit) {
        vaultViewModel.loadVaultContent()
    }

    val allFoldersList = (foldersState as? Resource.Success)?.data ?: emptyList()

    BackHandler(enabled = currentFolder != null || isSelectionMode || isSearchActive) {
        when {
            isSelectionMode -> {
                vaultViewModel.clearSelection()
            }
            isSearchActive -> {
                isSearchActive = false
                searchQuery = ""
                vaultViewModel.loadVaultContent()
            }
            currentFolder != null -> {
                vaultViewModel.navigateUp()
            }
        }
    }

    Scaffold(
        topBar = {
            AnimatedContent(
                targetState = Triple(isSelectionMode, isSearchActive, currentFolder?.name),
                transitionSpec = {
                    (fadeIn(animationSpec = tween(220, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)) +
                            slideInVertically(animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)) { -it / 3 })
                        .togetherWith(
                            fadeOut(animationSpec = tween(180, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)) +
                                    slideOutVertically(animationSpec = tween(180, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)) { -it / 3 }
                        )
                },
                label = "vaultTopBar"
            ) { (selectionMode, searchActive, folderName) ->
                when {
                    selectionMode -> {
                        TopAppBar(
                            title = {
                                val count = selectedFiles.size + selectedFolders.size
                                Text("$count Selected", fontWeight = FontWeight.Bold)
                            },
                            navigationIcon = {
                                IconButton(
                                    onClick = { vaultViewModel.clearSelection() },
                                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { vaultViewModel.clearSelection() }
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Cancel Selection")
                                }
                            },
                            actions = {
                                IconButton(
                                    onClick = { showBulkMoveDialog = true },
                                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { showBulkMoveDialog = true }
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.DriveFileMove, contentDescription = "Move Selected")
                                }
                                IconButton(
                                    onClick = { vaultViewModel.bulkDelete() },
                                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { vaultViewModel.bulkDelete() }
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete Selected")
                                }
                            },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        )
                    }

                    searchActive -> {
                        SearchBar(
                            query = searchQuery,
                            onQueryChange = {
                                searchQuery = it
                                vaultViewModel.search(it, selectedCategory)
                            },
                            onSearch = { vaultViewModel.search(searchQuery, selectedCategory) },
                            active = true,
                            onActiveChange = { isSearchActive = it },
                            placeholder = { Text("Search files in vault...") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                            trailingIcon = {
                                IconButton(onClick = {
                                    if (searchQuery.isNotEmpty()) {
                                        searchQuery = ""
                                        vaultViewModel.search("", selectedCategory)
                                    } else {
                                        isSearchActive = false
                                        vaultViewModel.loadVaultContent()
                                    }
                                }) {
                                    Icon(Icons.Default.Close, contentDescription = "Close search")
                                }
                            },
                            modifier = Modifier.fillMaxWidth().padding(horizontal = Dimens.Spacing8)
                        ) {
                            CategoryFilterRow(
                                selectedCategory = selectedCategory,
                                onSelectCategory = {
                                    selectedCategory = it
                                    vaultViewModel.search(searchQuery, it)
                                }
                            )
                        }
                    }

                    else -> {
                        FamDocAppBar(
                            title = folderName ?: "Shared Vault",
                            subtitle = if (currentFolder == null) "Root Archive" else "Folder",
                            navigationIcon = if (currentFolder == null) Icons.Default.Menu else Icons.AutoMirrored.Filled.ArrowBack,
                            onNavigationClick = {
                                if (currentFolder != null) {
                                    vaultViewModel.navigateUp()
                                } else {
                                    onOpenDrawer()
                                }
                            },
                            actions = {
                                // Search Action
                                IconButton(
                                    onClick = { isSearchActive = true },
                                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { isSearchActive = true }
                                ) {
                                    Icon(Icons.Default.Search, contentDescription = "Search", tint = MaterialTheme.colorScheme.onPrimary)
                                }

                                // Create Folder Action
                                IconButton(
                                    onClick = { showCreateFolderDialog = true },
                                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { showCreateFolderDialog = true }
                                ) {
                                    Icon(Icons.Default.CreateNewFolder, contentDescription = "New Folder", tint = MaterialTheme.colorScheme.onPrimary)
                                }

                                // Dual View Mode Switcher Action (List vs Box)
                                IconButton(
                                    onClick = {
                                        viewMode = if (viewMode == ViewMode.GRID) ViewMode.LIST else ViewMode.GRID
                                    },
                                    modifier = Modifier.bounceClick(scaleDown = 0.9f) {
                                        viewMode = if (viewMode == ViewMode.GRID) ViewMode.LIST else ViewMode.GRID
                                    }
                                ) {
                                    Icon(
                                        imageVector = if (viewMode == ViewMode.GRID) Icons.Default.ViewList else Icons.Default.GridView,
                                        contentDescription = if (viewMode == ViewMode.GRID) "Switch to List View" else "Switch to Box View",
                                        tint = MaterialTheme.colorScheme.onPrimary
                                    )
                                }
                            }
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            AnimatedVisibility(
                visible = !isSelectionMode,
                enter = scaleIn() + fadeIn(),
                exit = scaleOut() + fadeOut()
            ) {
                FloatingActionButton(
                    onClick = { filePickerLauncher.launch(arrayOf("*/*")) },
                    containerColor = MintPrimary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = RoundedCornerShape(Dimens.RadiusExtraLarge),
                    modifier = Modifier
                        .pulsingAura(auraColor = BrandAccent, maxRadiusDp = 10.dp)
                        .bounceClick(scaleDown = 0.93f) { filePickerLauncher.launch(arrayOf("*/*")) }
                ) {
                    Icon(Icons.Default.CloudUpload, contentDescription = "Upload Files")
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            WakeupBanner(serverStatus = serverStatus, isOffline = isOffline)

            // Breadcrumbs Navigation
            BreadcrumbBar(
                breadcrumbs = breadcrumbs,
                onRootClick = { vaultViewModel.navigateToRoot() },
                onFolderClick = { folder -> vaultViewModel.navigateToFolder(folder) }
            )

            // Filter Chips Bar
            CategoryFilterRow(
                selectedCategory = selectedCategory,
                onSelectCategory = {
                    selectedCategory = it
                    if (it == null) {
                        vaultViewModel.loadFiles(currentFolder?.id)
                    } else {
                        vaultViewModel.search(searchQuery, it)
                    }
                }
            )

            // Main Vault Content
            val filesList = (filesState as? Resource.Success)?.data ?: emptyList()
            val foldersList = allFoldersList.filter {
                if (currentFolder == null) it.parentId == null else it.parentId == currentFolder?.id
            }

            val isLoading = filesState is Resource.Loading || foldersState is Resource.Loading

            if (isLoading && filesList.isEmpty() && foldersList.isEmpty()) {
                LoadingSkeletonView(itemCount = 6)
            } else if (filesState is Resource.Error && filesList.isEmpty()) {
                ErrorRetryView(
                    message = (filesState as Resource.Error).message,
                    onRetry = { vaultViewModel.loadVaultContent() }
                )
            } else if (foldersList.isEmpty() && filesList.isEmpty()) {
                EmptyStateView(
                    title = "This folder is empty",
                    subtitle = "Tap the floating upload button or create a folder to add records.",
                    actionButtonText = "Upload Files",
                    onActionClick = { filePickerLauncher.launch(arrayOf("*/*")) }
                )
            } else {
                // Dual View Mode Content: 1. List View vs 2. Box (Grid) View
                AnimatedContent(
                    targetState = viewMode,
                    transitionSpec = {
                        (fadeIn(animationSpec = tween(220, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)) +
                                scaleIn(initialScale = 0.96f, animationSpec = tween(220, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)))
                            .togetherWith(
                                fadeOut(animationSpec = tween(180, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)) +
                                        scaleOut(targetScale = 0.96f, animationSpec = tween(180, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                            )
                    },
                    label = "vaultViewModeTransition"
                ) { currentMode ->
                    when (currentMode) {
                        ViewMode.GRID -> {
                            // 2. BOX / GRID VIEW MODE
                            LazyVerticalGrid(
                                columns = GridCells.Fixed(2),
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(
                                    start = Dimens.ScreenPaddingHorizontal,
                                    end = Dimens.ScreenPaddingHorizontal,
                                    top = Dimens.Spacing8,
                                    bottom = 80.dp
                                ),
                                horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing10),
                                verticalArrangement = Arrangement.spacedBy(Dimens.Spacing10)
                            ) {
                                // Folders Section Header & Boxes
                                if (foldersList.isNotEmpty()) {
                                    item(span = { GridItemSpan(2) }) {
                                        Text(
                                            text = "Folders (${foldersList.size})",
                                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(top = Dimens.Spacing6, bottom = Dimens.Spacing2)
                                        )
                                    }

                                    items(
                                        items = foldersList,
                                        key = { "folder_grid_${it.id}" }
                                    ) { folder ->
                                        val isSelected = selectedFolders.contains(folder.id)
                                        FolderGridBox(
                                            folder = folder,
                                            isSelected = isSelected,
                                            onClick = {
                                                if (isSelectionMode) {
                                                    vaultViewModel.toggleFolderSelection(folder.id)
                                                } else {
                                                    vaultViewModel.navigateToFolder(folder)
                                                }
                                            },
                                            onLongClick = {
                                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                                vaultViewModel.toggleFolderSelection(folder.id)
                                            },
                                            onMoreClick = {
                                                selectedActionFolder = folder
                                            }
                                        )
                                    }
                                }

                                // Files Section Header & Boxes
                                if (filesList.isNotEmpty()) {
                                    item(span = { GridItemSpan(2) }) {
                                        Text(
                                            text = "Files (${filesList.size})",
                                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(top = Dimens.Spacing10, bottom = Dimens.Spacing2)
                                        )
                                    }

                                    items(
                                        items = filesList,
                                        key = { "file_grid_${it.id}" }
                                    ) { file ->
                                        val isSelected = selectedFiles.contains(file.id)
                                        FileGridBox(
                                            file = file,
                                            isSelected = isSelected,
                                            onClick = {
                                                if (isSelectionMode) {
                                                    vaultViewModel.toggleFileSelection(file.id)
                                                } else {
                                                    onNavigateToFilePreview(file.id, file.filename, file.fileType)
                                                }
                                            },
                                            onLongClick = {
                                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                                vaultViewModel.toggleFileSelection(file.id)
                                            },
                                            onMoreClick = {
                                                selectedActionFile = file
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        ViewMode.LIST -> {
                            // 1. LIST VIEW MODE
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(bottom = 80.dp)
                            ) {
                                // Folders section
                                if (foldersList.isNotEmpty()) {
                                    items(
                                        items = foldersList,
                                        key = { "folder_${it.id}" },
                                        contentType = { "folder" }
                                    ) { folder ->
                                        val isSelected = selectedFolders.contains(folder.id)
                                        FolderItemCard(
                                            folder = folder,
                                            isSelected = isSelected,
                                            modifier = Modifier.animateItem(),
                                            onClick = {
                                                if (isSelectionMode) {
                                                    vaultViewModel.toggleFolderSelection(folder.id)
                                                } else {
                                                    vaultViewModel.navigateToFolder(folder)
                                                }
                                            },
                                            onLongClick = {
                                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                                vaultViewModel.toggleFolderSelection(folder.id)
                                            },
                                            onMoreClick = {
                                                selectedActionFolder = folder
                                            }
                                        )
                                    }
                                }

                                // Files section
                                if (filesList.isNotEmpty()) {
                                    items(
                                        items = filesList,
                                        key = { "file_${it.id}" },
                                        contentType = { "file" }
                                    ) { file ->
                                        val isSelected = selectedFiles.contains(file.id)
                                        FileItemRow(
                                            file = file,
                                            isSelected = isSelected,
                                            modifier = Modifier.animateItem(),
                                            onClick = {
                                                if (isSelectionMode) {
                                                    vaultViewModel.toggleFileSelection(file.id)
                                                } else {
                                                    onNavigateToFilePreview(file.id, file.filename, file.fileType)
                                                }
                                            },
                                            onLongClick = {
                                                haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                                vaultViewModel.toggleFileSelection(file.id)
                                            },
                                            onMoreClick = {
                                                selectedActionFile = file
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Folder Action Menu Modal
        if (selectedActionFolder != null) {
            val folder = selectedActionFolder!!
            ModalBottomSheet(
                onDismissRequest = { selectedActionFolder = null },
                shape = RoundedCornerShape(topStart = Dimens.RadiusExtraLarge, topEnd = Dimens.RadiusExtraLarge)
            ) {
                Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                    Text(
                        text = folder.name,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        modifier = Modifier.padding(bottom = Dimens.Spacing12)
                    )
                    ListItem(
                        headlineContent = { Text("Open Folder") },
                        leadingContent = { Icon(Icons.Default.FolderOpen, contentDescription = null, tint = BrandAccent) },
                        modifier = Modifier.bounceClick {
                            selectedActionFolder = null
                            vaultViewModel.navigateToFolder(folder)
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Move Folder") },
                        leadingContent = { Icon(Icons.AutoMirrored.Filled.DriveFileMove, contentDescription = null, tint = MintPrimaryLight) },
                        modifier = Modifier.bounceClick {
                            selectedActionFolder = null
                            folderToMove = folder
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Rename Folder") },
                        leadingContent = { Icon(Icons.Default.Edit, contentDescription = null, tint = MintSecondary) },
                        modifier = Modifier.bounceClick {
                            selectedActionFolder = null
                            itemToRename = "folder" to folder
                            renameText = folder.name
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Move to Recycle Bin", color = MaterialTheme.colorScheme.error) },
                        leadingContent = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                        modifier = Modifier.bounceClick {
                            selectedActionFolder = null
                            itemToDelete = "folder" to folder
                        }
                    )
                }
            }
        }

        // File Action Menu Modal
        if (selectedActionFile != null) {
            val file = selectedActionFile!!
            ModalBottomSheet(
                onDismissRequest = { selectedActionFile = null },
                shape = RoundedCornerShape(topStart = Dimens.RadiusExtraLarge, topEnd = Dimens.RadiusExtraLarge)
            ) {
                Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                    Text(
                        text = file.filename,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        modifier = Modifier.padding(bottom = Dimens.Spacing12)
                    )
                    ListItem(
                        headlineContent = { Text("Preview / Open") },
                        leadingContent = { Icon(Icons.Default.Visibility, contentDescription = null, tint = MintPrimaryLight) },
                        modifier = Modifier.bounceClick {
                            selectedActionFile = null
                            onNavigateToFilePreview(file.id, file.filename, file.fileType)
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Download") },
                        leadingContent = { Icon(Icons.Default.Download, contentDescription = null, tint = BrandSuccess) },
                        modifier = Modifier.bounceClick {
                            selectedActionFile = null
                            vaultViewModel.downloadFile(file)
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Move to Folder") },
                        leadingContent = { Icon(Icons.AutoMirrored.Filled.DriveFileMove, contentDescription = null, tint = MintSecondary) },
                        modifier = Modifier.bounceClick {
                            selectedActionFile = null
                            fileToMove = file
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Share Public Link") },
                        leadingContent = { Icon(Icons.Default.Share, contentDescription = null, tint = BrandAccent) },
                        modifier = Modifier.bounceClick {
                            selectedActionFile = null
                            fileToShare = file
                            vaultViewModel.loadShareLinks(file.id)
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Rename File") },
                        leadingContent = { Icon(Icons.Default.Edit, contentDescription = null) },
                        modifier = Modifier.bounceClick {
                            selectedActionFile = null
                            itemToRename = "file" to file
                            renameText = file.filename
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Move to Recycle Bin", color = MaterialTheme.colorScheme.error) },
                        leadingContent = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                        modifier = Modifier.bounceClick {
                            selectedActionFile = null
                            itemToDelete = "file" to file
                        }
                    )
                }
            }
        }

        // Single File Move Dialog
        if (fileToMove != null) {
            MoveDialog(
                itemName = fileToMove!!.filename,
                allFolders = allFoldersList,
                sourceFolderId = fileToMove!!.folderId,
                onConfirmMove = { targetFolderId ->
                    vaultViewModel.moveFile(fileToMove!!.id, targetFolderId)
                    fileToMove = null
                },
                onDismiss = { fileToMove = null }
            )
        }

        // Single Folder Move Dialog
        if (folderToMove != null) {
            MoveDialog(
                itemName = folderToMove!!.name,
                allFolders = allFoldersList,
                sourceFolderId = folderToMove!!.parentId,
                movingFolderId = folderToMove!!.id,
                onConfirmMove = { targetFolderId ->
                    vaultViewModel.moveFolder(folderToMove!!.id, targetFolderId)
                    folderToMove = null
                },
                onDismiss = { folderToMove = null }
            )
        }

        // Bulk Move Dialog
        if (showBulkMoveDialog) {
            MoveDialog(
                itemName = "${selectedFiles.size + selectedFolders.size} items",
                allFolders = allFoldersList,
                sourceFolderId = currentFolder?.id,
                onConfirmMove = { targetFolderId ->
                    vaultViewModel.bulkMove(targetFolderId)
                    showBulkMoveDialog = false
                },
                onDismiss = { showBulkMoveDialog = false }
            )
        }

        // Create Folder Dialog
        if (showCreateFolderDialog) {
            AlertDialog(
                onDismissRequest = { showCreateFolderDialog = false },
                title = { Text("Create New Folder", fontWeight = FontWeight.Bold) },
                text = {
                    OutlinedTextField(
                        value = newFolderName,
                        onValueChange = { newFolderName = it },
                        label = { Text("Folder Name") },
                        placeholder = { Text("e.g. Invoices, Medical") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (newFolderName.isNotBlank()) {
                                vaultViewModel.createFolder(newFolderName.trim())
                                newFolderName = ""
                                showCreateFolderDialog = false
                            }
                        },
                        enabled = newFolderName.isNotBlank()
                    ) {
                        Text("Create")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showCreateFolderDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // Rename Dialog
        if (itemToRename != null) {
            val (type, item) = itemToRename!!
            AlertDialog(
                onDismissRequest = { itemToRename = null },
                title = { Text(if (type == "folder") "Rename Folder" else "Rename File", fontWeight = FontWeight.Bold) },
                text = {
                    OutlinedTextField(
                        value = renameText,
                        onValueChange = { renameText = it },
                        label = { Text(if (type == "folder") "Folder Name" else "File Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (renameText.isNotBlank()) {
                                if (type == "folder") {
                                    vaultViewModel.renameFolder((item as FolderItem).id, renameText.trim())
                                } else {
                                    vaultViewModel.renameFile((item as FileItem).id, renameText.trim())
                                }
                                itemToRename = null
                            }
                        },
                        enabled = renameText.isNotBlank()
                    ) {
                        Text("Rename")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { itemToRename = null }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // Delete Confirmation Dialog
        if (itemToDelete != null) {
            val (type, item) = itemToDelete!!
            val name = if (type == "folder") (item as FolderItem).name else (item as FileItem).filename
            ConfirmDialog(
                title = if (type == "folder") "Delete Folder" else "Delete File",
                message = "Are you sure you want to move \"$name\" to the recycle bin? It can be restored later.",
                confirmText = "Move to Recycle Bin",
                isDestructive = true,
                onConfirm = {
                    if (type == "folder") {
                        vaultViewModel.deleteFolder((item as FolderItem).id)
                    } else {
                        vaultViewModel.deleteFile((item as FileItem).id)
                    }
                    itemToDelete = null
                },
                onDismiss = { itemToDelete = null }
            )
        }

        // Share Dialog
        if (fileToShare != null) {
            val file = fileToShare!!
            val shareLinks = (shareLinksState as? Resource.Success)?.data ?: emptyList()

            ShareModal(
                file = file,
                existingLinks = shareLinks,
                onCreateLink = { password, expiresAt, maxDownloads ->
                    vaultViewModel.createShareLink(file.id, password = password, expiresAt = expiresAt, maxDownloads = maxDownloads)
                },
                onRevokeLink = { token ->
                    vaultViewModel.revokeShareLink(token, file.id)
                },
                onDismiss = { fileToShare = null }
            )
        }
    }
}

// Category Filter Chips Row
@Composable
private fun CategoryFilterRow(
    selectedCategory: String?,
    onSelectCategory: (String?) -> Unit
) {
    val categories = listOf(
        null to "All Files",
        "image" to "Images",
        "pdf" to "PDFs",
        "document" to "Docs",
        "sheet" to "Sheets",
        "text" to "Text"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing6),
        horizontalArrangement = Arrangement.spacedBy(Dimens.Spacing6)
    ) {
        categories.forEach { (catKey, catLabel) ->
            val isSelected = selectedCategory == catKey
            FilterChip(
                selected = isSelected,
                onClick = { onSelectCategory(catKey) },
                label = {
                    Text(
                        text = catLabel,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                },
                shape = RoundedCornerShape(Dimens.RadiusMedium)
            )
        }
    }
}
