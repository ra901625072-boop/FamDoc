package com.famdoc.app.ui.screens.vault

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.widget.Toast
import android.widget.VideoView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import coil.request.ImageRequest
import com.famdoc.app.FamDocApplication
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.pulsingAura
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.PreviewLoadingAnimation
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.VaultViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilePreviewScreen(
    fileId: Int,
    filename: String,
    fileType: String,
    vaultViewModel: VaultViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val downloadState by vaultViewModel.downloadState.collectAsState()

    val apiClient = FamDocApplication.instance.apiClient
    val previewUrl = apiClient.getPreviewUrl(fileId)

    val extension = filename.substringAfterLast('.', "").lowercase()
    val isImage = fileType.contains("image", ignoreCase = true) ||
            listOf("jpg", "jpeg", "png", "webp", "gif", "svg").contains(extension)
    val isVideo = fileType.contains("video", ignoreCase = true) ||
            listOf("mp4", "m4v", "webm", "mkv", "mov", "qt", "avi", "wmv", "flv", "3gp", "ts", "ogv", "vob", "asf", "rm", "rmvb").contains(extension)
    val isPdf = fileType.contains("pdf", ignoreCase = true) || extension == "pdf"
    val isText = fileType.contains("text", ignoreCase = true) ||
            listOf("txt", "md", "json", "log", "xml", "csv").contains(extension)

    var previewTextContent by remember { mutableStateOf<String?>(null) }
    var pdfBitmaps by remember { mutableStateOf<List<Bitmap>>(emptyList()) }
    var cachedDownloadedFile by remember { mutableStateOf<File?>(null) }
    var isContentLoading by remember { mutableStateOf(isText || isPdf) }
    var loadError by remember { mutableStateOf<String?>(null) }

    // Image Zoom & Pan State
    var zoomScale by remember { mutableFloatStateOf(1f) }
    var zoomOffset by remember { mutableStateOf(Offset.Zero) }

    val transformableState = rememberTransformableState { zoomChange, offsetChange, _ ->
        zoomScale = (zoomScale * zoomChange).coerceIn(1f, 5f)
        if (zoomScale > 1f) {
            zoomOffset += offsetChange
        } else {
            zoomOffset = Offset.Zero
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            pdfBitmaps.forEach { bitmap ->
                if (!bitmap.isRecycled) {
                    bitmap.recycle()
                }
            }
        }
    }

    // Load PDF or Text in background (non-blocking, immediate stream decode)
    LaunchedEffect(fileId) {
        if (isText || isPdf) {
            isContentLoading = true
            loadError = null
            scope.launch(Dispatchers.IO) {
                try {
                    val response = apiClient.filesApi.downloadFile(fileId)
                    if (response.isSuccessful && response.body() != null) {
                        val tempFile = File(context.cacheDir, "preview_$filename")
                        response.body()!!.byteStream().use { input ->
                            FileOutputStream(tempFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                        cachedDownloadedFile = tempFile

                        if (isText) {
                            val text = tempFile.readText()
                            withContext(Dispatchers.Main) {
                                previewTextContent = text
                            }
                        } else if (isPdf) {
                            try {
                                val pfd = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY)
                                val renderer = PdfRenderer(pfd)
                                val pages = mutableListOf<Bitmap>()
                                val pageCount = minOf(renderer.pageCount, 15)

                                val maxPageWidth = (context.resources.displayMetrics.widthPixels).coerceAtLeast(720)

                                for (i in 0 until pageCount) {
                                    val page = renderer.openPage(i)
                                    val scale = (maxPageWidth.toFloat() / page.width.toFloat()).coerceIn(0.5f, 1.5f)
                                    val targetWidth = (page.width * scale).toInt().coerceAtLeast(1)
                                    val targetHeight = (page.height * scale).toInt().coerceAtLeast(1)

                                    val bitmap = Bitmap.createBitmap(
                                        targetWidth,
                                        targetHeight,
                                        Bitmap.Config.RGB_565
                                    )
                                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                                    pages.add(bitmap)
                                    page.close()
                                }
                                renderer.close()
                                pfd.close()

                                withContext(Dispatchers.Main) {
                                    pdfBitmaps = pages
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    loadError = "Could not render PDF pages directly. Tap 'Open in System Viewer' below."
                                }
                            }
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            loadError = "Failed to load document (${response.code()})"
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        loadError = e.localizedMessage ?: "Failed to load preview."
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        isContentLoading = false
                    }
                }
            }
        }
    }

    LaunchedEffect(downloadState) {
        if (downloadState is Resource.Success) {
            val downloadedFile = (downloadState as Resource.Success<File>).data
            Toast.makeText(context, "Downloaded to ${downloadedFile.name}", Toast.LENGTH_SHORT).show()
            FileUtils.openFileWithSystemViewer(context, downloadedFile, fileType)
            vaultViewModel.clearDownloadState()
        } else if (downloadState is Resource.Error) {
            Toast.makeText(context, (downloadState as Resource.Error).message, Toast.LENGTH_LONG).show()
            vaultViewModel.clearDownloadState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = filename,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            maxLines = 1
                        )
                        Text(
                            text = fileType.ifBlank { extension.uppercase() },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { onBack() }
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (isImage && zoomScale > 1.05f) {
                        IconButton(
                            onClick = {
                                zoomScale = 1f
                                zoomOffset = Offset.Zero
                            },
                            modifier = Modifier.bounceClick(scaleDown = 0.9f) {
                                zoomScale = 1f
                                zoomOffset = Offset.Zero
                            }
                        ) {
                            Icon(Icons.Default.ZoomOutMap, contentDescription = "Reset Zoom")
                        }
                    }
                    IconButton(
                        onClick = {
                            val fileItem = FileItem(
                                id = fileId,
                                filename = filename,
                                fileType = fileType,
                                sizeBytes = 0L
                            )
                            vaultViewModel.downloadFile(fileItem)
                        },
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) {
                            val fileItem = FileItem(
                                id = fileId,
                                filename = filename,
                                fileType = fileType,
                                sizeBytes = 0L
                            )
                            vaultViewModel.downloadFile(fileItem)
                        }
                    ) {
                        Icon(Icons.Default.Download, contentDescription = "Download")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentAlignment = Alignment.Center
        ) {
            when {
                isContentLoading -> {
                    // Zero-delay dynamic preview loading skeleton
                    PreviewLoadingAnimation(
                        filename = filename,
                        fileType = fileType
                    )
                }

                isImage -> {
                    var imageLoadFailed by remember { mutableStateOf(false) }
                    if (imageLoadFailed) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(Dimens.Spacing32)
                        ) {
                            Icon(
                                imageVector = Icons.Default.BrokenImage,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(56.dp)
                            )
                            Spacer(modifier = Modifier.height(Dimens.Spacing16))
                            Text(
                                text = "File Unavailable on Server",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                            Spacer(modifier = Modifier.height(Dimens.Spacing8))
                            Text(
                                text = "The server reported that this file's physical content is missing from the temporary disk. Link Google Drive under Storage Settings to ensure all uploads are saved permanently in cloud storage.",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(Dimens.Spacing20))
                            Button(
                                onClick = {
                                    val fileItem = FileItem(id = fileId, filename = filename, fileType = fileType, sizeBytes = 0L)
                                    vaultViewModel.downloadFile(fileItem)
                                },
                                shape = RoundedCornerShape(Dimens.RadiusMedium),
                                modifier = Modifier.bounceClick(scaleDown = 0.95f) {
                                    val fileItem = FileItem(id = fileId, filename = filename, fileType = fileType, sizeBytes = 0L)
                                    vaultViewModel.downloadFile(fileItem)
                                }
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null)
                                Spacer(modifier = Modifier.width(Dimens.Spacing8))
                                Text("Retry Download", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        val token = remember { FamDocApplication.instance.secureTokenManager.getToken() }
                        val imageRequest = remember(previewUrl, token) {
                            ImageRequest.Builder(context)
                                .data(previewUrl)
                                .apply {
                                    if (!token.isNullOrBlank()) {
                                        addHeader("Authorization", "Bearer $token")
                                    }
                                }
                                .crossfade(250)
                                .listener(
                                    onError = { _, _ -> imageLoadFailed = true }
                                )
                                .build()
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .pointerInput(Unit) {
                                    detectTapGestures(
                                        onDoubleTap = {
                                            if (zoomScale > 1f) {
                                                zoomScale = 1f
                                                zoomOffset = Offset.Zero
                                            } else {
                                                zoomScale = 2.5f
                                            }
                                        }
                                    )
                                }
                                .transformable(state = transformableState),
                            contentAlignment = Alignment.Center
                        ) {
                            SubcomposeAsyncImage(
                                model = imageRequest,
                                contentDescription = filename,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .graphicsLayer {
                                        scaleX = zoomScale
                                        scaleY = zoomScale
                                        translationX = zoomOffset.x
                                        translationY = zoomOffset.y
                                    },
                                loading = {
                                    // Zero-delay preview loading animation
                                    PreviewLoadingAnimation(
                                        filename = filename,
                                        fileType = fileType
                                    )
                                },
                                success = {
                                    SubcomposeAsyncImageContent(
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Fit
                                    )
                                }
                            )

                            // Floating zoom hint pill when zoomed
                            AnimatedVisibility(
                                visible = zoomScale > 1.05f,
                                enter = fadeIn(),
                                exit = fadeOut(),
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = Dimens.Spacing24)
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(Dimens.RadiusFull),
                                    color = Color.Black.copy(alpha = 0.7f),
                                    modifier = Modifier.bounceClick {
                                        zoomScale = 1f
                                        zoomOffset = Offset.Zero
                                    }
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.ZoomOutMap,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "${(zoomScale * 100).toInt()}% • Tap to Reset",
                                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                isPdf && pdfBitmaps.isNotEmpty() -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing16),
                        verticalArrangement = Arrangement.spacedBy(Dimens.Spacing16),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        itemsIndexed(
                            items = pdfBitmaps,
                            key = { index, _ -> "pdf_page_$index" }
                        ) { index, bitmap ->
                            Card(
                                shape = RoundedCornerShape(Dimens.RadiusMedium),
                                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .staggeredEntrance(index = index, baseDelayMs = 40L)
                                    .border(
                                        Dimens.BorderThin,
                                        MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                        RoundedCornerShape(Dimens.RadiusMedium)
                                    )
                            ) {
                                Column {
                                    Image(
                                        bitmap = bitmap.asImageBitmap(),
                                        contentDescription = "Page ${index + 1}",
                                        modifier = Modifier.fillMaxWidth(),
                                        contentScale = ContentScale.FillWidth
                                    )
                                    Text(
                                        text = "Page ${index + 1} of ${pdfBitmaps.size}",
                                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                                        modifier = Modifier
                                            .align(Alignment.CenterHorizontally)
                                            .padding(6.dp),
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(Dimens.Spacing8))
                            Button(
                                onClick = {
                                    cachedDownloadedFile?.let { file ->
                                        FileUtils.openFileWithSystemViewer(context, file, "application/pdf")
                                    } ?: run {
                                        val fileItem = FileItem(id = fileId, filename = filename, fileType = fileType, sizeBytes = 0L)
                                        vaultViewModel.downloadFile(fileItem)
                                    }
                                },
                                shape = RoundedCornerShape(Dimens.RadiusMedium),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(Dimens.SecondaryButtonHeight)
                                    .bounceClick(scaleDown = 0.96f) {
                                        cachedDownloadedFile?.let { file ->
                                            FileUtils.openFileWithSystemViewer(context, file, "application/pdf")
                                        } ?: run {
                                            val fileItem = FileItem(id = fileId, filename = filename, fileType = fileType, sizeBytes = 0L)
                                            vaultViewModel.downloadFile(fileItem)
                                        }
                                    }
                            ) {
                                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null)
                                Spacer(modifier = Modifier.width(Dimens.Spacing8))
                                Text("Open in PDF Reader App", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                isText && previewTextContent != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(Dimens.Spacing16)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusMedium),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = Dimens.Spacing16)
                        ) {
                            Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${previewTextContent?.lines()?.size ?: 0} lines",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    IconButton(
                                        onClick = {
                                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                            val clip = ClipData.newPlainText(filename, previewTextContent ?: "")
                                            clipboard.setPrimaryClip(clip)
                                            Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                                        },
                                        modifier = Modifier.size(28.dp).bounceClick(scaleDown = 0.85f)
                                    ) {
                                        Icon(
                                            Icons.Default.ContentCopy,
                                            contentDescription = "Copy text",
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(Dimens.Spacing8))
                                Text(
                                    text = previewTextContent ?: "Empty file",
                                    fontFamily = FontFamily.Monospace,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    }
                }

                isVideo -> {
                    val token = remember { FamDocApplication.instance.secureTokenManager.getToken() }
                    val videoUri = remember(cachedDownloadedFile, previewUrl, token) {
                        if (cachedDownloadedFile != null) {
                            Uri.fromFile(cachedDownloadedFile)
                        } else {
                            Uri.parse(if (!token.isNullOrBlank()) "$previewUrl?token=$token" else previewUrl)
                        }
                    }

                    VideoPlayerPreviewSection(
                        videoUri = videoUri,
                        filename = filename,
                        onOpenExternal = {
                            cachedDownloadedFile?.let { file ->
                                FileUtils.openFileWithSystemViewer(context, file, fileType)
                            } ?: run {
                                val fileItem = FileItem(
                                    id = fileId,
                                    filename = filename,
                                    fileType = fileType,
                                    sizeBytes = 0L
                                )
                                vaultViewModel.downloadFile(fileItem)
                            }
                        }
                    )
                }

                else -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(Dimens.Spacing32)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(88.dp)
                                .pulsingAura(auraColor = MintSecondary, maxRadiusDp = 16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(76.dp)
                                    .clip(RoundedCornerShape(Dimens.RadiusExtraLarge))
                                    .background(if (isVideo) CategoryVideoColor.copy(alpha = 0.15f) else MintSecondary.copy(alpha = 0.15f))
                                    .border(1.dp, if (isVideo) CategoryVideoColor.copy(alpha = 0.35f) else MintSecondary.copy(alpha = 0.35f), RoundedCornerShape(Dimens.RadiusExtraLarge)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = when {
                                        isVideo -> Icons.Default.Videocam
                                        isPdf -> Icons.Default.PictureAsPdf
                                        extension in listOf("doc", "docx") -> Icons.Default.Description
                                        extension in listOf("xls", "xlsx") -> Icons.Default.TableChart
                                        else -> Icons.AutoMirrored.Filled.InsertDriveFile
                                    },
                                    contentDescription = null,
                                    tint = if (isVideo) CategoryVideoColor else MintSecondary,
                                    modifier = Modifier.size(40.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(Dimens.Spacing20))
                        Text(
                            text = filename,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            textAlign = TextAlign.Center
                        )
                        if (loadError != null) {
                            Spacer(modifier = Modifier.height(Dimens.Spacing8))
                            Text(
                                text = loadError!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                                textAlign = TextAlign.Center
                            )
                        }
                        Spacer(modifier = Modifier.height(Dimens.Spacing12))
                        Text(
                            text = if (isVideo) "Tap below to open and watch this video in your device's video player." else "Tap below to download and view this document in your device's native app.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(Dimens.Spacing24))
                        Button(
                            onClick = {
                                cachedDownloadedFile?.let { file ->
                                    FileUtils.openFileWithSystemViewer(context, file, fileType)
                                } ?: run {
                                    val fileItem = FileItem(
                                        id = fileId,
                                        filename = filename,
                                        fileType = fileType,
                                        sizeBytes = 0L
                                    )
                                    vaultViewModel.downloadFile(fileItem)
                                }
                            },
                            shape = RoundedCornerShape(Dimens.RadiusMedium),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isVideo) CategoryVideoColor else MaterialTheme.colorScheme.primary,
                                contentColor = Color.White
                            ),
                            modifier = Modifier
                                .height(Dimens.SecondaryButtonHeight)
                                .bounceClick(scaleDown = 0.96f) {
                                    cachedDownloadedFile?.let { file ->
                                        FileUtils.openFileWithSystemViewer(context, file, fileType)
                                    } ?: run {
                                        val fileItem = FileItem(
                                            id = fileId,
                                            filename = filename,
                                            fileType = fileType,
                                            sizeBytes = 0L
                                        )
                                        vaultViewModel.downloadFile(fileItem)
                                    }
                                }
                        ) {
                            Icon(if (isVideo) Icons.Default.PlayArrow else Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null)
                            Spacer(modifier = Modifier.width(Dimens.Spacing8))
                            Text(if (isVideo) "Play in Video Player" else "Open in System Viewer", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            if (downloadState is Resource.Loading) {
                Surface(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                    shape = RoundedCornerShape(Dimens.RadiusLarge),
                    shadowElevation = 8.dp,
                    modifier = Modifier.padding(Dimens.Spacing24)
                ) {
                    Row(
                        modifier = Modifier.padding(Dimens.Spacing20),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.5.dp)
                        Spacer(modifier = Modifier.width(Dimens.Spacing16))
                        Text("Downloading document...", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun VideoPlayerPreviewSection(
    videoUri: Uri,
    filename: String,
    onOpenExternal: () -> Unit
) {
    var videoViewRef by remember { mutableStateOf<VideoView?>(null) }
    var isPlaying by remember { mutableStateOf(true) }
    var isFullScreen by remember { mutableStateOf(false) }
    var currentPosMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var isPrepared by remember { mutableStateOf(false) }
    var isBuffering by remember { mutableStateOf(true) }
    var playbackError by remember { mutableStateOf(false) }

    // Periodically update current position and duration
    LaunchedEffect(isPlaying, isPrepared) {
        while (isActive && isPrepared) {
            videoViewRef?.let { vv ->
                if (vv.isPlaying) {
                    currentPosMs = vv.currentPosition.toLong()
                }
                if (vv.duration > 0 && durationMs != vv.duration.toLong()) {
                    durationMs = vv.duration.toLong()
                }
            }
            delay(400)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            try {
                videoViewRef?.stopPlayback()
            } catch (_: Exception) {}
        }
    }

    fun formatDuration(ms: Long): String {
        val totalSecs = (ms / 1000).coerceAtLeast(0)
        val mins = totalSecs / 60
        val secs = totalSecs % 60
        return "%02d:%02d".format(mins, secs)
    }

    val togglePlay: () -> Unit = {
        videoViewRef?.let { vv ->
            if (vv.isPlaying) {
                vv.pause()
                isPlaying = false
            } else {
                vv.start()
                isPlaying = true
            }
        }
    }

    val seekRelative: (Long) -> Unit = { deltaMs ->
        videoViewRef?.let { vv ->
            val maxDur = durationMs.coerceAtLeast(1L)
            val target = (vv.currentPosition + deltaMs).coerceIn(0, maxDur).toInt()
            vv.seekTo(target)
            currentPosMs = target.toLong()
        }
    }

    // Fullscreen Dialog overlay
    if (isFullScreen) {
        Dialog(
            onDismissRequest = { isFullScreen = false },
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false
            )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                AndroidView(
                    factory = { ctx ->
                        VideoView(ctx).apply {
                            videoViewRef = this
                            setVideoURI(videoUri)
                            setOnPreparedListener { mp ->
                                isPrepared = true
                                isBuffering = false
                                durationMs = mp.duration.toLong()
                                seekTo(currentPosMs.toInt())
                                if (isPlaying) start()
                            }
                            setOnCompletionListener {
                                isPlaying = false
                                currentPosMs = durationMs
                            }
                            setOnErrorListener { _, _, _ ->
                                playbackError = true
                                isBuffering = false
                                true
                            }
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Top Exit Fullscreen bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .background(Color.Black.copy(alpha = 0.5f))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = filename,
                        style = MaterialTheme.typography.titleSmall,
                        color = Color.White,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = { isFullScreen = false }) {
                        Icon(Icons.Default.FullscreenExit, contentDescription = "Exit Fullscreen", tint = Color.White)
                    }
                }

                // Bottom Fullscreen controls overlay
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Slider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = formatDuration(currentPosMs),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                        Slider(
                            value = currentPosMs.toFloat().coerceIn(0f, durationMs.toFloat().coerceAtLeast(1f)),
                            onValueChange = { newPos ->
                                currentPosMs = newPos.toLong()
                                videoViewRef?.seekTo(newPos.toInt())
                            },
                            valueRange = 0f..durationMs.toFloat().coerceAtLeast(1f),
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 8.dp),
                            colors = SliderDefaults.colors(
                                thumbColor = CategoryVideoColor,
                                activeTrackColor = CategoryVideoColor,
                                inactiveTrackColor = Color.White.copy(alpha = 0.3f)
                            )
                        )
                        Text(
                            text = formatDuration(durationMs),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }

                    // Action buttons: -10s, Play/Pause, +10s
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { seekRelative(-10000L) }) {
                            Icon(Icons.Default.Replay10, contentDescription = "Rewind 10s", tint = Color.White, modifier = Modifier.size(32.dp))
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        FilledIconButton(
                            onClick = togglePlay,
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = CategoryVideoColor)
                        ) {
                            Icon(
                                if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        IconButton(onClick = { seekRelative(10000L) }) {
                            Icon(Icons.Default.Forward10, contentDescription = "Forward 10s", tint = Color.White, modifier = Modifier.size(32.dp))
                        }
                    }
                }
            }
        }
    }

    // Inline Layout
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing16),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Video Viewport Box
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .clip(RoundedCornerShape(Dimens.RadiusMedium))
                .background(Color.Black)
                .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(Dimens.RadiusMedium)),
            contentAlignment = Alignment.Center
        ) {
            AndroidView(
                factory = { ctx ->
                    VideoView(ctx).apply {
                        videoViewRef = this
                        setVideoURI(videoUri)
                        setOnPreparedListener { mp ->
                            isPrepared = true
                            isBuffering = false
                            durationMs = mp.duration.toLong()
                            start()
                            isPlaying = true
                        }
                        setOnCompletionListener {
                            isPlaying = false
                            currentPosMs = durationMs
                        }
                        setOnErrorListener { _, _, _ ->
                            playbackError = true
                            isBuffering = false
                            true
                        }
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            if (isBuffering && !playbackError) {
                CircularProgressIndicator(
                    color = CategoryVideoColor,
                    modifier = Modifier.size(44.dp)
                )
            }

            if (playbackError) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(Dimens.Spacing16)
                ) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color.White, modifier = Modifier.size(36.dp))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Streaming playback issue. Use external player below.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(Dimens.Spacing12))

        // Progress scrubber with timestamps
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = formatDuration(currentPosMs),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Slider(
                value = currentPosMs.toFloat().coerceIn(0f, durationMs.toFloat().coerceAtLeast(1f)),
                onValueChange = { newPos ->
                    currentPosMs = newPos.toLong()
                    videoViewRef?.seekTo(newPos.toInt())
                },
                valueRange = 0f..durationMs.toFloat().coerceAtLeast(1f),
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = Dimens.Spacing8),
                colors = SliderDefaults.colors(
                    thumbColor = CategoryVideoColor,
                    activeTrackColor = CategoryVideoColor
                )
            )
            Text(
                text = formatDuration(durationMs),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(Dimens.Spacing8))

        // Dedicated Playback Control Row: -10s, Play/Pause, +10s, Fullscreen
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rewind 10s
            FilledTonalIconButton(
                onClick = { seekRelative(-10000L) },
                modifier = Modifier.bounceClick(scaleDown = 0.9f) { seekRelative(-10000L) }
            ) {
                Icon(Icons.Default.Replay10, contentDescription = "Rewind 10 seconds")
            }

            // Play / Pause
            FilledIconButton(
                onClick = togglePlay,
                colors = IconButtonDefaults.filledIconButtonColors(containerColor = CategoryVideoColor),
                modifier = Modifier
                    .size(54.dp)
                    .bounceClick(scaleDown = 0.9f) { togglePlay() }
            ) {
                Icon(
                    if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) "Pause" else "Play",
                    tint = Color.White,
                    modifier = Modifier.size(30.dp)
                )
            }

            // Forward 10s
            FilledTonalIconButton(
                onClick = { seekRelative(10000L) },
                modifier = Modifier.bounceClick(scaleDown = 0.9f) { seekRelative(10000L) }
            ) {
                Icon(Icons.Default.Forward10, contentDescription = "Forward 10 seconds")
            }

            // Fullscreen
            FilledTonalIconButton(
                onClick = { isFullScreen = true },
                modifier = Modifier.bounceClick(scaleDown = 0.9f) { isFullScreen = true }
            ) {
                Icon(Icons.Default.Fullscreen, contentDescription = "Fullscreen")
            }
        }

        Spacer(modifier = Modifier.height(Dimens.Spacing24))

        // Open in System Player fallback
        OutlinedButton(
            onClick = onOpenExternal,
            shape = RoundedCornerShape(Dimens.RadiusMedium),
            border = BorderStroke(1.dp, CategoryVideoColor.copy(alpha = 0.6f)),
            modifier = Modifier
                .fillMaxWidth()
                .height(Dimens.SecondaryButtonHeight)
                .bounceClick(scaleDown = 0.96f) { onOpenExternal() }
        ) {
            Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, tint = CategoryVideoColor)
            Spacer(modifier = Modifier.width(Dimens.Spacing8))
            Text("Open in External Video App", color = CategoryVideoColor, fontWeight = FontWeight.SemiBold)
        }
    }
}


