package com.famdoc.app.ui.screens.vault

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.data.models.FolderItem
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FolderActionBottomSheet(
    folder: FolderItem,
    onOpen: () -> Unit,
    onMove: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
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
                    onDismiss()
                    onOpen()
                }
            )
            ListItem(
                headlineContent = { Text("Move Folder") },
                leadingContent = { Icon(Icons.AutoMirrored.Filled.DriveFileMove, contentDescription = null, tint = MintPrimaryLight) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onMove()
                }
            )
            ListItem(
                headlineContent = { Text("Rename Folder") },
                leadingContent = { Icon(Icons.Default.Edit, contentDescription = null, tint = MintSecondary) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onRename()
                }
            )
            ListItem(
                headlineContent = { Text("Move to Recycle Bin", color = MaterialTheme.colorScheme.error) },
                leadingContent = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onDelete()
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FileActionBottomSheet(
    file: FileItem,
    onPreview: () -> Unit,
    onDownload: () -> Unit,
    onMove: () -> Unit,
    onShare: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
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
                    onDismiss()
                    onPreview()
                }
            )
            ListItem(
                headlineContent = { Text("Download") },
                leadingContent = { Icon(Icons.Default.Download, contentDescription = null, tint = BrandSuccess) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onDownload()
                }
            )
            ListItem(
                headlineContent = { Text("Move to Folder") },
                leadingContent = { Icon(Icons.AutoMirrored.Filled.DriveFileMove, contentDescription = null, tint = MintSecondary) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onMove()
                }
            )
            ListItem(
                headlineContent = { Text("Share Public Link") },
                leadingContent = { Icon(Icons.Default.Share, contentDescription = null, tint = BrandAccent) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onShare()
                }
            )
            ListItem(
                headlineContent = { Text("Rename File") },
                leadingContent = { Icon(Icons.Default.Edit, contentDescription = null) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onRename()
                }
            )
            ListItem(
                headlineContent = { Text("Move to Recycle Bin", color = MaterialTheme.colorScheme.error) },
                leadingContent = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                modifier = Modifier.bounceClick {
                    onDismiss()
                    onDelete()
                }
            )
        }
    }
}
