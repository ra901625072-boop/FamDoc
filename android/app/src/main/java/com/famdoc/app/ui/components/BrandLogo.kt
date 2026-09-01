package com.famdoc.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.ui.theme.*

// Exact reference brand colors
val BrandRoyalBlue = Color(0xFF0052FF)
val BrandElectricBlue = Color(0xFF0066FF)
val BrandDeepBlue = Color(0xFF0038B8)
val BrandNavySlate = Color(0xFF0A1128)

/**
 * Exact vector recreation of the official FamDoc Reference Logo:
 * - Electric Blue House Roof / Arch
 * - Family Member Silhouettes (Two Parents + Child)
 * - Foreground Locked Document Vault Folder with Padlock & Keyhole
 */
@Composable
fun FamDocCrest(
    size: Dp = 64.dp,
    modifier: Modifier = Modifier,
    isElevated: Boolean = true,
    showGlowRing: Boolean = true
) {
    val isDark = MaterialTheme.colorScheme.background == DarkAmoledBackground
    val cardBackground = if (isDark) Color(0xFF141A29) else Color.White
    val cardBorderColor = if (isDark) Color(0xFF24324F) else Color(0xFFE2E8F0)

    Box(
        modifier = modifier
            .size(size)
            .then(
                if (isElevated) {
                    Modifier.shadow(
                        elevation = (size.value * 0.10f).coerceIn(4f, 16f).dp,
                        shape = RoundedCornerShape(size * 0.28f),
                        spotColor = BrandRoyalBlue.copy(alpha = if (isDark) 0.5f else 0.22f),
                        ambientColor = BrandRoyalBlue.copy(alpha = 0.12f)
                    )
                } else Modifier
            )
            .clip(RoundedCornerShape(size * 0.28f))
            .background(cardBackground)
            .border(
                width = (size.value * 0.025f).coerceAtLeast(1f).dp,
                color = cardBorderColor,
                shape = RoundedCornerShape(size * 0.28f)
            ),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .padding(size * 0.12f)
        ) {
            val w = this.size.width
            val h = this.size.height

            val blueGradient = Brush.verticalGradient(
                colors = listOf(BrandElectricBlue, BrandDeepBlue),
                startY = 0f,
                endY = h
            )

            // 1. House Roof & Enclosure Arch Outline
            val archStrokeWidth = w * 0.082f
            val housePath = Path().apply {
                val apexX = w * 0.50f
                val apexY = h * 0.12f
                val roofRightX = w * 0.88f
                val roofRightY = h * 0.38f
                val roofLeftX = w * 0.12f
                val roofLeftY = h * 0.38f
                val wallBottomY = h * 0.74f

                moveTo(w * 0.12f, wallBottomY)
                lineTo(roofLeftX, roofLeftY)
                lineTo(apexX, apexY)
                lineTo(roofRightX, roofRightY)
                lineTo(w * 0.88f, wallBottomY)
            }

            drawPath(
                path = housePath,
                brush = blueGradient,
                style = Stroke(
                    width = archStrokeWidth,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )

            // 2. Family Silhouettes Inside House
            // Left Parent (Head & Body)
            val leftParentHeadCenter = Offset(w * 0.35f, h * 0.38f)
            val parentHeadRadius = w * 0.095f
            drawCircle(
                brush = blueGradient,
                radius = parentHeadRadius,
                center = leftParentHeadCenter
            )
            val leftParentBody = Path().apply {
                addRoundRect(
                    RoundRect(
                        rect = Rect(
                            left = w * 0.20f,
                            top = h * 0.48f,
                            right = w * 0.50f,
                            bottom = h * 0.75f
                        ),
                        topLeft = CornerRadius(w * 0.14f, w * 0.14f),
                        topRight = CornerRadius(w * 0.14f, w * 0.14f)
                    )
                )
            }
            drawPath(path = leftParentBody, brush = blueGradient)

            // Right Parent (Head & Body)
            val rightParentHeadCenter = Offset(w * 0.65f, h * 0.38f)
            drawCircle(
                brush = blueGradient,
                radius = parentHeadRadius,
                center = rightParentHeadCenter
            )
            val rightParentBody = Path().apply {
                addRoundRect(
                    RoundRect(
                        rect = Rect(
                            left = w * 0.50f,
                            top = h * 0.48f,
                            right = w * 0.80f,
                            bottom = h * 0.75f
                        ),
                        topLeft = CornerRadius(w * 0.14f, w * 0.14f),
                        topRight = CornerRadius(w * 0.14f, w * 0.14f)
                    )
                )
            }
            drawPath(path = rightParentBody, brush = blueGradient)

            // Center Child (Head & Body)
            val childHeadCenter = Offset(w * 0.50f, h * 0.49f)
            val childHeadRadius = w * 0.068f
            drawCircle(
                brush = blueGradient,
                radius = childHeadRadius,
                center = childHeadCenter
            )
            val childBody = Path().apply {
                addRoundRect(
                    RoundRect(
                        rect = Rect(
                            left = w * 0.38f,
                            top = h * 0.56f,
                            right = w * 0.62f,
                            bottom = h * 0.75f
                        ),
                        topLeft = CornerRadius(w * 0.12f, w * 0.12f),
                        topRight = CornerRadius(w * 0.12f, w * 0.12f)
                    )
                )
            }
            drawPath(path = childBody, brush = blueGradient)

            // 3. Foreground Document Vault Folder with Padlock
            // Behind paper sheet accent inside folder
            val paperPath = Path().apply {
                addRoundRect(
                    RoundRect(
                        rect = Rect(
                            left = w * 0.48f,
                            top = h * 0.51f,
                            right = w * 0.82f,
                            bottom = h * 0.68f
                        ),
                        radiusX = w * 0.04f,
                        radiusY = w * 0.04f
                    )
                )
            }
            drawPath(
                path = paperPath,
                color = Color.White.copy(alpha = 0.95f),
                style = Fill
            )
            drawPath(
                path = paperPath,
                color = BrandElectricBlue.copy(alpha = 0.4f),
                style = Stroke(width = w * 0.025f)
            )

            // Main Folder Body (trapezoid/rounded keepsake folder)
            val folderPath = Path().apply {
                val fLeft = w * 0.14f
                val fRight = w * 0.86f
                val fTop = h * 0.58f
                val fBottom = h * 0.94f
                val r = w * 0.08f

                // Folder tab top left
                moveTo(fLeft + r, fTop)
                lineTo(w * 0.44f, fTop)
                lineTo(w * 0.49f, fTop + h * 0.04f)
                lineTo(fRight - r, fTop + h * 0.04f)
                quadraticTo(fRight, fTop + h * 0.04f, fRight - r * 0.5f, fTop + h * 0.08f)
                // Right sloped edge
                lineTo(fRight - r * 0.3f, fBottom - r)
                quadraticTo(fRight - r * 0.3f, fBottom, fRight - r * 1.2f, fBottom)
                // Bottom edge
                lineTo(fLeft + r * 1.2f, fBottom)
                quadraticTo(fLeft + r * 0.3f, fBottom, fLeft + r * 0.3f, fBottom - r)
                // Left edge
                lineTo(fLeft, fTop + r)
                quadraticTo(fLeft, fTop, fLeft + r, fTop)
                close()
            }

            drawPath(
                path = folderPath,
                brush = Brush.verticalGradient(
                    colors = listOf(BrandElectricBlue, Color(0xFF0038B8)),
                    startY = h * 0.55f,
                    endY = h * 0.95f
                )
            )

            // 4. White Padlock on Folder
            val lockCenterX = w * 0.50f
            val lockCenterY = h * 0.77f
            val lockWidth = w * 0.19f
            val lockHeight = h * 0.15f

            // Lock Shackle (Arch)
            val shackleWidth = lockWidth * 0.65f
            val shackleHeight = lockHeight * 0.65f
            val shackleRect = Rect(
                left = lockCenterX - shackleWidth / 2f,
                top = lockCenterY - lockHeight / 2f - shackleHeight * 0.65f,
                right = lockCenterX + shackleWidth / 2f,
                bottom = lockCenterY - lockHeight / 2f + shackleHeight * 0.35f
            )
            drawArc(
                color = Color.White,
                startAngle = 180f,
                sweepAngle = 180f,
                useCenter = false,
                topLeft = shackleRect.topLeft,
                size = shackleRect.size,
                style = Stroke(width = w * 0.038f, cap = StrokeCap.Round)
            )

            // Lock Body (Rounded Rectangle)
            drawRoundRect(
                color = Color.White,
                topLeft = Offset(lockCenterX - lockWidth / 2f, lockCenterY - lockHeight / 2f),
                size = Size(lockWidth, lockHeight),
                cornerRadius = CornerRadius(w * 0.035f, w * 0.035f)
            )

            // Lock Keyhole (Circle + Stem)
            val keyholeCenter = Offset(lockCenterX, lockCenterY - lockHeight * 0.08f)
            drawCircle(
                color = BrandElectricBlue,
                radius = w * 0.025f,
                center = keyholeCenter
            )
            val keyholeStem = Path().apply {
                moveTo(lockCenterX - w * 0.016f, keyholeCenter.y)
                lineTo(lockCenterX + w * 0.016f, keyholeCenter.y)
                lineTo(lockCenterX + w * 0.012f, lockCenterY + lockHeight * 0.28f)
                lineTo(lockCenterX - w * 0.012f, lockCenterY + lockHeight * 0.28f)
                close()
            }
            drawPath(path = keyholeStem, color = BrandElectricBlue)
        }
    }
}

/**
 * Primary FamDoc Brand Logo matching the reference logo:
 * - "Fam" in bold deep slate `#0A1128` (or `onBackground` in dark mode)
 * - "Doc" in vibrant royal electric blue `#0052FF`
 * - Tagline: "— Family Document Vault —" with clean flanking rules
 */
@Composable
fun FamDocBrandLogo(
    modifier: Modifier = Modifier,
    crestSize: Dp = 68.dp,
    orientation: LogoOrientation = LogoOrientation.VERTICAL,
    showTagline: Boolean = true
) {
    val isDark = MaterialTheme.colorScheme.background == DarkAmoledBackground
    val famTextColor = if (isDark) Color.White else BrandNavySlate
    val docTextColor = BrandRoyalBlue
    val taglineColor = if (isDark) Color.White.copy(alpha = 0.75f) else Color(0xFF334155)

    when (orientation) {
        LogoOrientation.VERTICAL -> {
            Column(
                modifier = modifier,
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                FamDocCrest(size = crestSize)

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Fam",
                        style = MaterialTheme.typography.displayLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = (crestSize.value * 0.44f).coerceIn(26f, 38f).sp,
                            letterSpacing = (-0.5).sp,
                            color = famTextColor
                        )
                    )
                    Text(
                        text = "Doc",
                        style = MaterialTheme.typography.displayLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = (crestSize.value * 0.44f).coerceIn(26f, 38f).sp,
                            letterSpacing = (-0.5).sp,
                            color = docTextColor
                        )
                    )
                }

                if (showTagline) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .width(20.dp)
                                .height(1.5.dp)
                                .background(BrandElectricBlue)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Family Document Vault",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Medium,
                                letterSpacing = 0.4.sp,
                                fontSize = 12.sp
                            ),
                            color = taglineColor
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .width(20.dp)
                                .height(1.5.dp)
                                .background(BrandElectricBlue)
                        )
                    }
                }
            }
        }

        LogoOrientation.HORIZONTAL -> {
            Row(
                modifier = modifier,
                verticalAlignment = Alignment.CenterVertically
            ) {
                FamDocCrest(size = crestSize)

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Fam",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = (crestSize.value * 0.52f).coerceIn(20f, 26f).sp,
                                color = famTextColor
                            )
                        )
                        Text(
                            text = "Doc",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = (crestSize.value * 0.52f).coerceIn(20f, 26f).sp,
                                color = docTextColor
                            )
                        )
                    }
                    if (showTagline) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(12.dp)
                                    .height(1.dp)
                                    .background(BrandElectricBlue)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Family Document Vault",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Medium,
                                    letterSpacing = 0.2.sp,
                                    fontSize = 11.sp
                                ),
                                color = taglineColor
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Box(
                                modifier = Modifier
                                    .width(12.dp)
                                    .height(1.dp)
                                    .background(BrandElectricBlue)
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Compact Monogram badge for app bars, avatars, and headers.
 */
@Composable
fun FamDocBadge(
    size: Dp = 36.dp,
    modifier: Modifier = Modifier
) {
    FamDocCrest(
        size = size,
        modifier = modifier,
        isElevated = false,
        showGlowRing = false
    )
}

enum class LogoOrientation {
    VERTICAL,
    HORIZONTAL
}
