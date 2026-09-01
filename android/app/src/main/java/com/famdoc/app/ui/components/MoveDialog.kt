package com.famdoc.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.famdoc.app.data.models.FolderItem
import com.famdoc.app.ui.theme.BrandPrimary

@Composable
fun MoveDialog(
    itemName: String,
    allFolders: List<FolderItem>,
    sourceFolderId: Int? = null,
    movingFolderId: Int? = null,
    onConfirmMove: (targetFolderId: Int?) -> Unit,
    onDismiss: () -> Unit
) {
    // Collect all descendant folder IDs to prevent circular hierarchy
    val invalidFolderIds = remember(movingFolderId, allFolders) {
        val set = mutableSetOf<Int>()
        if (movingFolderId != null) {
            set.add(movingFolderId)
            var changed = true
            while (changed) {
                changed = false
                allFolders.forEach { f ->
                    if (f.parentId != null && set.contains(f.parentId) && !set.contains(f.id)) {
                        set.add(f.id)
                        changed = true
                    }
                }
            }
        }
        set
    }

    // Helper to construct path: "Finance / Invoices"
    fun getFolderPath(folderId: Int): String {
        val folder = allFolders.find { it.id == folderId } ?: return "Folder"
        return if (folder.parentId == null) {
            folder.name
        } else {
            "${getFolderPath(folder.parentId)} / ${folder.name}"
        }
    }

    val eligibleFolders = remember(allFolders, invalidFolderIds) {
        allFolders.filter { !invalidFolderIds.contains(it.id) }
    }

    var selectedTargetId by remember { mutableStateOf<Int?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text(
                    text = "Move Item",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Select destination for \"$itemName\"",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        text = {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 320.dp),
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().padding(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Root Destination
                    item {
                        DestinationRow(
                            name = "Root Vault (Top Level)",
                            path = "/",
                            isRoot = true,
                            isSelected = selectedTargetId == null,
                            isCurrent = sourceFolderId == null && movingFolderId == null,
                            onClick = { selectedTargetId = null }
                        )
                    }

                    // Eligible Folders
                    items(eligibleFolders) { folder ->
                        DestinationRow(
                            name = folder.name,
                            path = getFolderPath(folder.id),
                            isRoot = false,
                            isSelected = selectedTargetId == folder.id,
                            isCurrent = sourceFolderId == folder.id,
                            onClick = { selectedTargetId = folder.id }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirmMove(selectedTargetId) },
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
            ) {
                Text("Move Here")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun DestinationRow(
    name: String,
    path: String,
    isRoot: Boolean,
    isSelected: Boolean,
    isCurrent: Boolean,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (isRoot) Icons.Default.Home else Icons.Default.Folder,
                contentDescription = null,
                tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium),
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                )
                if (!isRoot) {
                    Text(
                        text = path,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
