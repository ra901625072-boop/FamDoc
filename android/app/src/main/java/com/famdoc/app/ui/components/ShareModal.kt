package com.famdoc.app.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.data.models.ShareLink
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.theme.Dimens

@Composable
fun ShareModal(
    file: FileItem,
    existingLinks: List<ShareLink>,
    onCreateLink: (password: String?, expiresAt: String?, maxDownloads: Int?) -> Unit,
    onRevokeLink: (token: String) -> Unit,
    onDismiss: () -> Unit
) {
    var password by remember { mutableStateOf("") }
    var hasPassword by remember { mutableStateOf(false) }
    var maxDownloadsStr by remember { mutableStateOf("") }
    val clipboardManager = LocalClipboardManager.current

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(Dimens.RadiusLarge),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .animateContentSize()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Share File",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // File Preview Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FileThumbnail(
                        file = file,
                        variant = ThumbnailVariant.ListCompact,
                        isSelected = false,
                        showExtensionBadge = false,
                        showSelectionBadge = false,
                        showSharedBadge = false
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = file.filename,
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                            maxLines = 1,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = file.categoryLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                // Create new share link section
                Text(
                    text = "Generate Share Link",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = hasPassword, onCheckedChange = { hasPassword = it })
                    Text("Password Protected", style = MaterialTheme.typography.bodyMedium)
                }

                AnimatedVisibility(
                    visible = hasPassword,
                    enter = expandVertically() + fadeIn(),
                    exit = shrinkVertically() + fadeOut()
                ) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium)
                    )
                }

                OutlinedTextField(
                    value = maxDownloadsStr,
                    onValueChange = { if (it.all { char -> char.isDigit() }) maxDownloadsStr = it },
                    label = { Text("Max Downloads (Optional)") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(Dimens.RadiusMedium)
                )

                Button(
                    onClick = {
                        val maxDl = maxDownloadsStr.toIntOrNull()
                        val pwd = if (hasPassword && password.isNotBlank()) password else null
                        onCreateLink(pwd, null, maxDl)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .bounceClick(scaleDown = 0.96f) {
                            val maxDl = maxDownloadsStr.toIntOrNull()
                            val pwd = if (hasPassword && password.isNotBlank()) password else null
                            onCreateLink(pwd, null, maxDl)
                        },
                    shape = RoundedCornerShape(Dimens.RadiusMedium)
                ) {
                    Text("Create Link", fontWeight = FontWeight.Bold)
                }

                if (existingLinks.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Active Share Links",
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                    )
                    existingLinks.forEach { link ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            shape = RoundedCornerShape(Dimens.RadiusMedium),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = link.shareLink,
                                        style = MaterialTheme.typography.bodySmall,
                                        maxLines = 1
                                    )
                                    Text(
                                        text = "Downloads: ${link.downloadCount}/${link.maxDownloads ?: "∞"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                IconButton(
                                    onClick = { clipboardManager.setText(AnnotatedString(link.shareLink)) },
                                    modifier = Modifier.bounceClick(scaleDown = 0.88f) {
                                        clipboardManager.setText(AnnotatedString(link.shareLink))
                                    }
                                ) {
                                    Icon(
                                        Icons.Default.ContentCopy,
                                        contentDescription = "Copy Link",
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .align(Alignment.End)
                        .bounceClick(scaleDown = 0.95f, onClick = onDismiss)
                ) {
                    Text("Close")
                }
            }
        }
    }
}
