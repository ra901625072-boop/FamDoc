package com.famdoc.app.ui.screens.share

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.famdoc.app.FamDocApplication
import com.famdoc.app.core.utils.DateFormatter
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.DownloadSharedFileRequest
import com.famdoc.app.data.models.PublicShareInfo
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.components.ErrorRetryView
import com.famdoc.app.ui.components.FamDocAppBar
import com.famdoc.app.ui.components.FamDocCrest
import com.famdoc.app.ui.components.LoadingSkeletonView
import com.famdoc.app.ui.theme.Dimens
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

@Composable
fun PublicShareScreen(
    token: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val apiClient = FamDocApplication.instance.apiClient

    var shareInfo by remember { mutableStateOf<PublicShareInfo?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    var password by remember { mutableStateOf("") }
    var isDownloading by remember { mutableStateOf(false) }
    var downloadError by remember { mutableStateOf<String?>(null) }

    fun loadInfo() {
        isLoading = true
        errorMessage = null
        scope.launch {
            try {
                val response = apiClient.shareApi.getPublicShareInfo(token)
                if (response.isSuccessful && response.body() != null) {
                    shareInfo = response.body()
                } else {
                    errorMessage = "Shared link is invalid or expired."
                }
            } catch (e: Exception) {
                errorMessage = e.localizedMessage ?: "Failed to load shared document."
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(token) {
        loadInfo()
    }

    fun downloadFile() {
        isDownloading = true
        downloadError = null
        scope.launch(Dispatchers.IO) {
            try {
                val req = if (password.isNotBlank()) DownloadSharedFileRequest(password) else null
                val response = apiClient.shareApi.downloadPublicSharedFile(token, req)
                if (response.isSuccessful && response.body() != null) {
                    val info = shareInfo!!
                    val downloadsDir = File(context.cacheDir, "shared_downloads").apply { mkdirs() }
                    val targetFile = File(downloadsDir, info.filename)

                    response.body()!!.byteStream().use { input ->
                        FileOutputStream(targetFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    withContext(Dispatchers.Main) {
                        FileUtils.openFileWithSystemViewer(context, targetFile, info.fileType)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        downloadError = if (response.code() == 403) "Incorrect password." else "Download failed (${response.code()})"
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    downloadError = e.localizedMessage ?: "Download failed."
                }
            } finally {
                withContext(Dispatchers.Main) {
                    isDownloading = false
                }
            }
        }
    }

    Scaffold(
        topBar = {
            FamDocAppBar(
                title = "Shared Document",
                subtitle = "FamDoc Vault Link",
                onNavigationClick = onBack
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(Dimens.FormPaddingHorizontal),
            contentAlignment = Alignment.Center
        ) {
            when {
                isLoading -> LoadingSkeletonView(itemCount = 2)

                errorMessage != null -> {
                    ErrorRetryView(
                        message = errorMessage!!,
                        onRetry = { loadInfo() }
                    )
                }

                shareInfo != null -> {
                    val info = shareInfo!!
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(
                                Dimens.BorderThin,
                                MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                                RoundedCornerShape(Dimens.RadiusLarge)
                            ),
                        shape = RoundedCornerShape(Dimens.RadiusLarge),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
                    ) {
                        Column(
                            modifier = Modifier.padding(Dimens.Spacing24),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            FamDocCrest(size = 56.dp)

                            Spacer(modifier = Modifier.height(Dimens.Spacing16))

                            Text(
                                text = info.filename,
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                            )
                            Spacer(modifier = Modifier.height(Dimens.Spacing4))
                            Text(
                                text = "${FileUtils.formatBytes(info.sizeBytes)} • Shared ${DateFormatter.formatDateOnly(info.createdAt)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            if (downloadError != null) {
                                Spacer(modifier = Modifier.height(Dimens.Spacing12))
                                Text(
                                    text = downloadError!!,
                                    color = MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }

                            if (info.requiresPassword) {
                                Spacer(modifier = Modifier.height(Dimens.Spacing16))
                                OutlinedTextField(
                                    value = password,
                                    onValueChange = { password = it; downloadError = null },
                                    label = { Text("Password Required") },
                                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                                    visualTransformation = PasswordVisualTransformation(),
                                    singleLine = true,
                                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }

                            Spacer(modifier = Modifier.height(Dimens.Spacing24))

                            Button(
                                onClick = { downloadFile() },
                                enabled = !isDownloading && (!info.requiresPassword || password.isNotBlank()),
                                shape = RoundedCornerShape(Dimens.RadiusMedium),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(Dimens.PrimaryButtonHeight)
                                    .bounceClick(scaleDown = 0.96f) { downloadFile() }
                            ) {
                                if (isDownloading) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                                } else {
                                    Icon(Icons.Default.Download, contentDescription = null)
                                    Spacer(modifier = Modifier.width(Dimens.Spacing8))
                                    Text("Download Document", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
