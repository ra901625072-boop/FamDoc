package com.famdoc.app.ui.screens.vault

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
                                    .background(MintSecondary.copy(alpha = 0.15f))
                                    .border(1.dp, MintSecondary.copy(alpha = 0.35f), RoundedCornerShape(Dimens.RadiusExtraLarge)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = when {
                                        isPdf -> Icons.Default.PictureAsPdf
                                        extension in listOf("doc", "docx") -> Icons.Default.Description
                                        extension in listOf("xls", "xlsx") -> Icons.Default.TableChart
                                        else -> Icons.AutoMirrored.Filled.InsertDriveFile
                                    },
                                    contentDescription = null,
                                    tint = MintSecondary,
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
                            text = "Tap below to download and view this document in your device's native app.",
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
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
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
                            Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null)
                            Spacer(modifier = Modifier.width(Dimens.Spacing8))
                            Text("Open in System Viewer", fontWeight = FontWeight.Bold)
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

