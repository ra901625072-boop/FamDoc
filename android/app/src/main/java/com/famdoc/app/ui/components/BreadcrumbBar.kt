package com.famdoc.app.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.famdoc.app.data.models.FolderItem
import com.famdoc.app.ui.animation.bounceClick

@Composable
fun BreadcrumbBar(
    breadcrumbs: List<FolderItem>,
    onRootClick: () -> Unit,
    onFolderClick: (FolderItem) -> Unit
) {
    val scrollState = rememberScrollState()

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AssistChip(
            onClick = onRootClick,
            label = { Text("Root Vault", fontWeight = FontWeight.SemiBold) },
            shape = RoundedCornerShape(10.dp),
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Home,
                    contentDescription = "Root Vault",
                    modifier = Modifier.size(16.dp)
                )
            },
            modifier = Modifier.bounceClick(scaleDown = 0.95f, onClick = onRootClick)
        )

        breadcrumbs.forEachIndexed { index, folder ->
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Separator",
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.size(18.dp)
            )

            val isLast = index == breadcrumbs.size - 1
            AssistChip(
                onClick = { if (!isLast) onFolderClick(folder) },
                shape = RoundedCornerShape(10.dp),
                label = {
                    Text(
                        text = folder.name,
                        fontWeight = if (isLast) FontWeight.Bold else FontWeight.Medium
                    )
                },
                colors = if (isLast) {
                    AssistChipDefaults.assistChipColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f),
                        labelColor = MaterialTheme.colorScheme.primary
                    )
                } else {
                    AssistChipDefaults.assistChipColors()
                },
                modifier = if (!isLast) Modifier.bounceClick(scaleDown = 0.95f) { onFolderClick(folder) } else Modifier
            )
        }
    }
}
