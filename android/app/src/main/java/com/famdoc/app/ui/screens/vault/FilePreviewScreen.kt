package com.famdoc.app.ui.screens.vault

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.famdoc.app.FamDocApplication
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.ui.animation.bounceClick
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

    DisposableEffect(Unit) {
        onDispose {
            pdfBitmaps.forEach { bitmap ->
                if (!bitmap.isRecycled) {
                    bitmap.recycle()
                }
            }
        }
    }

    // Load PDF or Text in the background
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
                                val pageCount = minOf(renderer.pageCount, 10)

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
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(
                            color = MintPrimary,
                            strokeWidth = 3.dp
                        )
                        Spacer(modifier = Modifier.height(Dimens.Spacing14))
                        Text(
                            text = "Loading document preview...",
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
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
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
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
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(previewUrl)
                                .crossfade(true)
                                .listener(
                                    onError = { _, _ ->
                                        imageLoadFailed = true
                                    }
                                )
                                .build(),
                            contentDescription = filename,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize()
                        )
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
                                    .animateItem()
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
                            Text(
                                text = previewTextContent ?: "Empty file",
                                fontFamily = FontFamily.Monospace,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(Dimens.Spacing16)
                            )
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
                                .size(80.dp)
                                .clip(RoundedCornerShape(Dimens.RadiusExtraLarge))
                                .background(MintSecondary.copy(alpha = 0.12f)),
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
                                modifier = Modifier.size(44.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(Dimens.Spacing20))
                        Text(
                            text = filename,
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        if (loadError != null) {
                            Spacer(modifier = Modifier.height(Dimens.Spacing8))
                            Text(
                                text = loadError!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Spacer(modifier = Modifier.height(Dimens.Spacing12))
                        Text(
                            text = "Tap below to download and view this document in your device's native app.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
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
