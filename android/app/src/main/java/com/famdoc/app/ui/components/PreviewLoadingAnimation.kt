package com.famdoc.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.TableChart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.ui.animation.pulsingAura
import com.famdoc.app.ui.animation.rememberShimmerBrush
import com.famdoc.app.ui.theme.*
import kotlinx.coroutines.delay

/**
 * High-performance, zero-latency Preview Loading State Composable.
 * Features an animated document silhouette, rotating glowing gradient ring,
 * dynamic multi-phase status messages, and shimmering wireframe placeholders.
 * 
 * Note: Operates fully asynchronously in Compose without introducing any blocking delay.
 */
@Composable
fun PreviewLoadingAnimation(
    filename: String,
    fileType: String = "",
    modifier: Modifier = Modifier,
    cardHeight: Dp = 380.dp
) {
    val isDark = isSystemInDarkTheme()
    val shimmerBrush = rememberShimmerBrush(isDark = isDark)

    val extension = filename.substringAfterLast('.', "").lowercase()
    val isPdf = fileType.contains("pdf", ignoreCase = true) || extension == "pdf"
    val isImage = fileType.contains("image", ignoreCase = true) ||
            listOf("jpg", "jpeg", "png", "webp", "gif", "svg").contains(extension)
    val isWord = extension in listOf("doc", "docx")
    val isExcel = extension in listOf("xls", "xlsx", "csv")
    val isText = fileType.contains("text", ignoreCase = true) ||
            listOf("txt", "md", "json", "log", "xml").contains(extension)

    val icon: ImageVector = when {
        isPdf -> Icons.Default.PictureAsPdf
        isImage -> Icons.Default.Image
        isWord -> Icons.Default.Description
        isExcel -> Icons.Default.TableChart
        isText -> Icons.AutoMirrored.Filled.Article
        else -> Icons.AutoMirrored.Filled.InsertDriveFile
    }

    val themeColor = when {
        isPdf -> BrandError
        isImage -> MintPrimary
        isWord -> BrandPrimaryLight
        isExcel -> BrandSuccess
        isText -> BrandAccent
        else -> MintPrimary
    }

    // Dynamic non-blocking status message cycling
    val statusMessages = remember(isPdf, isImage, isText) {
        when {
            isPdf -> listOf(
                "Connecting to secure vault...",
                "Decrypting document stream...",
                "Rendering high-resolution PDF pages..."
            )
            isImage -> listOf(
                "Loading image preview...",
                "Decoding full-resolution canvas...",
                "Rendering preview..."
            )
            isText -> listOf(
                "Loading text content...",
                "Parsing code stream...",
                "Formatting document view..."
            )
            else -> listOf(
                "Fetching file from vault...",
                "Preparing document preview...",
                "Almost ready..."
            )
        }
    }

    var currentMessageIndex by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(1600L)
            currentMessageIndex = (currentMessageIndex + 1) % statusMessages.size
        }
    }

    // Continuous rotation for glowing accent ring
    val infiniteTransition = rememberInfiniteTransition(label = "ringRotation")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ringRotateAngle"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(Dimens.Spacing24),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Main Preview Skeleton Card
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .height(cardHeight)
                .clip(RoundedCornerShape(Dimens.RadiusLarge))
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.25f else 0.15f),
                    shape = RoundedCornerShape(Dimens.RadiusLarge)
                ),
            shape = RoundedCornerShape(Dimens.RadiusLarge),
            color = if (isDark) DarkSurface else MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                // Central Hero Animated Orb
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(Dimens.Spacing20)
                ) {
                    Box(
                        modifier = Modifier
                            .size(86.dp)
                            .pulsingAura(auraColor = themeColor, maxRadiusDp = 20.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        // Glowing Rotating Ring
                        Canvas(modifier = Modifier.size(80.dp).rotate(rotation)) {
                            drawArc(
                                brush = Brush.sweepGradient(
                                    listOf(
                                        themeColor.copy(alpha = 0.1f),
                                        themeColor.copy(alpha = 0.4f),
                                        themeColor,
                                        Color.Transparent
                                    )
                                ),
                                startAngle = 0f,
                                sweepAngle = 280f,
                                useCenter = false,
                                style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round)
                            )
                        }

                        // Center Icon Bubble
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(themeColor.copy(alpha = 0.15f))
                                .border(1.dp, themeColor.copy(alpha = 0.35f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = themeColor,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(Dimens.Spacing20))

                    // Filename Label
                    Text(
                        text = filename,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = Dimens.Spacing16)
                    )

                    Spacer(modifier = Modifier.height(Dimens.Spacing8))

                    // Animated Status Message Pill
                    Surface(
                        shape = RoundedCornerShape(Dimens.RadiusFull),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                        modifier = Modifier.padding(horizontal = Dimens.Spacing12)
                    ) {
                        AnimatedContent(
                            targetState = statusMessages[currentMessageIndex],
                            transitionSpec = {
                                (fadeIn(animationSpec = tween(220, easing = FastOutSlowInEasing)))
                                    .togetherWith(fadeOut(animationSpec = tween(180, easing = FastOutSlowInEasing)))
                            },
                            label = "statusMessageTransition"
                        ) { message ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(themeColor)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = message,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 11.sp
                                    ),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(Dimens.Spacing24))

                    // Wireframe Document Skeleton Lines
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = Dimens.Spacing24),
                        verticalArrangement = Arrangement.spacedBy(Dimens.Spacing8)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.85f)
                                .height(10.dp)
                                .clip(RoundedCornerShape(Dimens.RadiusExtraSmall))
                                .background(shimmerBrush)
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.65f)
                                .height(10.dp)
                                .clip(RoundedCornerShape(Dimens.RadiusExtraSmall))
                                .background(shimmerBrush)
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.45f)
                                .height(10.dp)
                                .clip(RoundedCornerShape(Dimens.RadiusExtraSmall))
                                .background(shimmerBrush)
                        )
                    }
                }
            }
        }
    }
}
