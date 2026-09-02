package com.famdoc.app.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.utils.DateFormatter
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.theme.*

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FileItemRow(
    file: FileItem,
    modifier: Modifier = Modifier,
    isSelected: Boolean = false,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
    onMoreClick: () -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing4)
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .border(
                width = if (isSelected) Dimens.BorderFocused else Dimens.BorderThin,
                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                shape = RoundedCornerShape(Dimens.RadiusLarge)
            ),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isSelected) 3.dp else Dimens.CardElevation)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(Dimens.Spacing12),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Visual File Thumbnail / Category Icon
            FileThumbnail(
                file = file,
                variant = ThumbnailVariant.ListCompact,
                isSelected = isSelected,
                showExtensionBadge = false,
                showSelectionBadge = true,
                showSharedBadge = false
            )

            Spacer(modifier = Modifier.width(Dimens.Spacing14))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = file.filename,
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(Dimens.Spacing2))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = FileUtils.formatBytes(file.sizeBytes),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = " • ",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = DateFormatter.formatDateOnly(file.uploadDate),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (file.isShared) {
                        Spacer(modifier = Modifier.width(Dimens.Spacing8))
                        Surface(
                            shape = CircleShape,
                            color = BrandSecondary.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = "Shared",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                ),
                                color = BrandSecondary,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            IconButton(
                onClick = onMoreClick,
                modifier = Modifier.bounceClick(scaleDown = 0.9f)
            ) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "File actions",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

fun getFileIconAndGradients(file: FileItem): Triple<ImageVector, Color, List<Color>> {
    return when {
        file.isPdf -> Triple(
            Icons.Default.PictureAsPdf,
            BrandError,
            listOf(Color(0xFFEF4444), Color(0xFFDC2626))
        )
        file.isImage -> Triple(
            Icons.Default.Image,
            BrandSecondary,
            listOf(Color(0xFF0D9488), Color(0xFF059669))
        )
        file.isWord -> Triple(
            Icons.Default.Description,
            BrandPrimaryLight,
            listOf(Color(0xFF3B82F6), Color(0xFF1D4ED8))
        )
        file.isExcel -> Triple(
            Icons.Default.TableChart,
            BrandSuccess,
            listOf(Color(0xFF10B981), Color(0xFF047857))
        )
        file.isText -> Triple(
            Icons.AutoMirrored.Filled.Article,
            BrandAccent,
            listOf(Color(0xFFF59E0B), Color(0xFFD97706))
        )
        else -> Triple(
            Icons.AutoMirrored.Filled.InsertDriveFile,
            Color(0xFF64748B),
            listOf(Color(0xFF64748B), Color(0xFF475569))
        )
    }
}
