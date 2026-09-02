package com.famdoc.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.size.Precision
import coil.size.Size
import com.famdoc.app.FamDocApplication
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.ui.animation.rememberShimmerBrush
import com.famdoc.app.ui.theme.*

enum class ThumbnailVariant {
    GridLarge,
    ListCompact,
    RecycleMuted
}

/**
 * Universal high-fidelity Document & Image Thumbnail Composable.
 * Implements persistent on-device phone caching (0ms reload from disk),
 * exact downsampling constraints, explicit auth injection, and vibrant fallback gradients.
 */
@Composable
fun FileThumbnail(
    file: FileItem,
    modifier: Modifier = Modifier,
    variant: ThumbnailVariant = ThumbnailVariant.ListCompact,
    isSelected: Boolean = false,
    showExtensionBadge: Boolean = true,
    showSelectionBadge: Boolean = true,
    showSharedBadge: Boolean = true
) {
    val isDark = isSystemInDarkTheme()
    val context = LocalContext.current
    val app = FamDocApplication.instance
    val apiClient = app.apiClient

    val (fallbackIcon, _, gradientColors) = getFileIconAndGradients(file)
    val extension = file.extension.uppercase().ifEmpty {
        when {
            file.isPdf -> "PDF"
            file.isImage -> "IMG"
            file.isWord -> "DOC"
            file.isExcel -> "SHEET"
            file.isText -> "TXT"
            else -> "FILE"
        }
    }

    // Determine if file supports thumbnail streaming
    val isGoogleCloudFile = file.storageProvider == "google" && (file.isImage || file.isPdf)
    val hasServerThumbnail = file.isImage || isGoogleCloudFile

    val cornerRadius: Dp = when (variant) {
        ThumbnailVariant.GridLarge -> Dimens.RadiusMedium
        ThumbnailVariant.ListCompact -> 10.dp
        ThumbnailVariant.RecycleMuted -> 10.dp
    }

    val shape = RoundedCornerShape(cornerRadius)

    val baseModifier = when (variant) {
        ThumbnailVariant.GridLarge -> modifier
            .fillMaxWidth()
            .height(96.dp)
            .clip(shape)
        ThumbnailVariant.ListCompact -> modifier
            .size(48.dp)
            .clip(shape)
        ThumbnailVariant.RecycleMuted -> modifier
            .size(44.dp)
            .clip(shape)
    }

    Box(
        modifier = baseModifier,
        contentAlignment = Alignment.Center
    ) {
        if (hasServerThumbnail) {
            val thumbnailUrl = remember(file.id, file.previewToken) {
                apiClient.getThumbnailUrl(file.id, file.previewToken)
            }

            val token = remember { app.secureTokenManager.getToken() }

            val imageRequest = remember(thumbnailUrl, token, file.id, file.sizeBytes, variant) {
                val targetDim = if (variant == ThumbnailVariant.GridLarge) 320 else 140
                ImageRequest.Builder(context)
                    .data(thumbnailUrl)
                    .diskCacheKey("famdoc_thumb_${file.id}_${file.sizeBytes}")
                    .memoryCacheKey("famdoc_thumb_${file.id}_${file.sizeBytes}")
                    .diskCachePolicy(CachePolicy.ENABLED)
                    .memoryCachePolicy(CachePolicy.ENABLED)
                    .size(Size(targetDim, targetDim))
                    .precision(Precision.INEXACT)
                    .apply {
                        if (!token.isNullOrBlank()) {
                            addHeader("Authorization", "Bearer $token")
                        }
                    }
                    .crossfade(200)
                    .build()
            }

            SubcomposeAsyncImage(
                model = imageRequest,
                contentDescription = file.filename,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    val shimmerBrush = rememberShimmerBrush(isDark = isDark)
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(shimmerBrush),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = fallbackIcon,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.25f),
                            modifier = Modifier.size(if (variant == ThumbnailVariant.GridLarge) 32.dp else 22.dp)
                        )
                    }
                },
                error = {
                    FallbackGradientIconBox(
                        icon = fallbackIcon,
                        gradientColors = gradientColors,
                        iconSize = if (variant == ThumbnailVariant.GridLarge) 38.dp else 24.dp
                    )
                },
                success = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                if (isDark) DarkSurfaceVariant else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                            )
                    ) {
                        this@SubcomposeAsyncImage.SubcomposeAsyncImageContent(
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )

                        // Subtle dark gradient scrim at bottom for contrast in grid mode
                        if (variant == ThumbnailVariant.GridLarge) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(28.dp)
                                    .align(Alignment.BottomCenter)
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.35f))
                                        )
                                    )
                            )
                        }
                    }
                }
            )
        } else {
            // Non-image file: Standard vibrant gradient icon box
            FallbackGradientIconBox(
                icon = fallbackIcon,
                gradientColors = gradientColors,
                iconSize = if (variant == ThumbnailVariant.GridLarge) 38.dp else 24.dp
            )
        }

        // Overlay 1: Top-Left Selection Checkmark Badge
        androidx.compose.animation.AnimatedVisibility(
            visible = showSelectionBadge && isSelected,
            enter = androidx.compose.animation.scaleIn(
                animationSpec = androidx.compose.animation.core.spring(
                    dampingRatio = androidx.compose.animation.core.Spring.DampingRatioMediumBouncy,
                    stiffness = androidx.compose.animation.core.Spring.StiffnessMedium
                )
            ) + androidx.compose.animation.fadeIn(),
            exit = androidx.compose.animation.scaleOut() + androidx.compose.animation.fadeOut(),
            modifier = Modifier.align(Alignment.TopStart)
        ) {
            Box(
                modifier = Modifier
                    .padding(if (variant == ThumbnailVariant.GridLarge) 6.dp else 4.dp)
                    .size(if (variant == ThumbnailVariant.GridLarge) 22.dp else 18.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(if (variant == ThumbnailVariant.GridLarge) 15.dp else 12.dp)
                )
            }
        }

        // Overlay 2: Top-Right Glassmorphic Extension Pill (for Grid Mode)
        if (variant == ThumbnailVariant.GridLarge && showExtensionBadge) {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = Color.Black.copy(alpha = 0.5f),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
            ) {
                Text(
                    text = extension.take(4),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 9.sp,
                        letterSpacing = 0.5.sp
                    ),
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                )
            }
        }

        // Overlay 3: Bottom-Right Shared Badge (for Grid Mode)
        if (variant == ThumbnailVariant.GridLarge && showSharedBadge && file.isShared) {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = BrandSecondary,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(6.dp)
            ) {
                Text(
                    text = "Shared",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp
                    ),
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun FallbackGradientIconBox(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    gradientColors: List<Color>,
    iconSize: Dp
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(gradientColors)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.95f),
            modifier = Modifier.size(iconSize)
        )
    }
}
