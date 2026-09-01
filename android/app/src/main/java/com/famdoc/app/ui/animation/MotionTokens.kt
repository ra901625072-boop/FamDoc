package com.famdoc.app.ui.animation

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.famdoc.app.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Standard animation curves & specs for FamDoc
 */
object MotionTokens {
    val SpringBouncy = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessLow
    )

    val SpringGentle = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow
    )

    val EmphasizedEasing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)
    val DecelerateEasing = FastOutSlowInEasing

    const val DurationQuick = 200
    const val DurationStandard = 350
    const val DurationEmphasized = 500
}

/**
 * Adds a tactile spring-physics bounce effect on press with haptic feedback
 */
fun Modifier.bounceClick(
    scaleDown: Float = 0.95f,
    onClick: (() -> Unit)? = null
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val haptic = LocalHapticFeedback.current

    val scale by animateFloatAsState(
        targetValue = if (isPressed) scaleDown else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "bounceScale"
    )

    this
        .scale(scale)
        .then(
            if (onClick != null) {
                Modifier.clickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onClick()
                    }
                )
            } else {
                Modifier
            }
        )
}

/**
 * Provides a dynamic linear gradient sweep brush for skeleton loaders
 */
@Composable
fun rememberShimmerBrush(
    isDark: Boolean = false,
    targetValue: Float = 1200f
): Brush {
    val shimmerColors = if (isDark) {
        listOf(
            ShimmerBaseDark,
            ShimmerHighlightDark,
            ShimmerBaseDark
        )
    } else {
        listOf(
            ShimmerBaseLight,
            ShimmerHighlightLight,
            ShimmerBaseLight
        )
    }

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnimation by transition.animateFloat(
        initialValue = 0f,
        targetValue = targetValue,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerTranslate"
    )

    return Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(x = translateAnimation - 400f, y = translateAnimation - 400f),
        end = Offset(x = translateAnimation, y = translateAnimation)
    )
}

/**
 * Continuous subtle pulsing breathing aura animation for badges / hero elements
 */
fun Modifier.pulsingAura(
    auraColor: Color = BrandAccent,
    maxRadiusDp: Dp = 16.dp
): Modifier = composed {
    val infiniteTransition = rememberInfiniteTransition(label = "aura")
    val pulseProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "auraProgress"
    )

    this.drawBehind {
        val radius = size.minDimension / 2 + (maxRadiusDp.toPx() * pulseProgress)
        val alpha = (1f - pulseProgress) * 0.35f
        drawCircle(
            color = auraColor.copy(alpha = alpha),
            radius = radius,
            center = center
        )
    }
}

/**
 * Staggered cascade entrance animation (fade + slide-up) for list items & dashboard widgets
 */
fun Modifier.staggeredEntrance(
    index: Int = 0,
    baseDelayMs: Long = 60L
): Modifier = composed {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        delay(index * baseDelayMs)
        visible = true
    }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(350, easing = FastOutSlowInEasing),
        label = "staggerAlpha"
    )

    val translateY by animateFloatAsState(
        targetValue = if (visible) 0f else 32f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioLowBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "staggerTranslate"
    )

    this.graphicsLayer {
        this.alpha = alpha
        this.translationY = translateY
    }
}

/**
 * Frosted glassmorphism background with subtle luminous border
 */
fun Modifier.glassmorphic(
    backgroundColor: Color = SurfaceLight.copy(alpha = 0.75f),
    borderColor: Color = CardGlowBorderLight,
    cornerRadius: Dp = 16.dp
): Modifier = this
    .clip(RoundedCornerShape(cornerRadius))
    .background(backgroundColor)
    .border(1.dp, borderColor, RoundedCornerShape(cornerRadius))
