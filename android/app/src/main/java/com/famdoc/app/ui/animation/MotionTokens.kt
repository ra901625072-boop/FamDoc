package com.famdoc.app.ui.animation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
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

    val SpringSnappy = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMedium
    )

    val SpringGentle = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow
    )

    val EmphasizedEasing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)
    val DecelerateEasing = FastOutSlowInEasing
    val AccelerateEasing = FastOutLinearInEasing

    const val DurationQuick = 200
    const val DurationStandard = 300
    const val DurationEmphasized = 450

    /**
     * Standard Material 3 Emphasized Enter/Exit Transitions
     */
    val ScreenFadeIn = fadeIn(animationSpec = tween(DurationStandard, easing = EmphasizedEasing))
    val ScreenFadeOut = fadeOut(animationSpec = tween(DurationQuick, easing = AccelerateEasing))

    val PopEnter = scaleIn(
        initialScale = 0.8f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        )
    ) + fadeIn(animationSpec = tween(DurationQuick))

    val PopExit = scaleOut(
        targetScale = 0.85f,
        animationSpec = tween(DurationQuick, easing = AccelerateEasing)
    ) + fadeOut(animationSpec = tween(DurationQuick))
}

/**
 * Adds a tactile spring-physics bounce effect on press with crisp, subtle haptic feedback.
 * Avoids heavy long-press vibrations in favor of a responsive light tactile feel.
 */
fun Modifier.bounceClick(
    scaleDown: Float = 0.96f,
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
                        try {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        } catch (_: Exception) {}
                        onClick()
                    }
                )
            } else {
                Modifier
            }
        )
}

/**
 * Enables smooth horizontal gesture swiping between tabs.
 * - Swipe Left (finger right-to-left): Navigates to next tab on the right.
 * - Swipe Right (finger left-to-right): Navigates to previous tab on the left.
 * - Fully preserves vertical scrolling in lists/grids.
 */
fun Modifier.swipeableTabNavigation(
    currentRoute: String?,
    enabled: Boolean = true,
    tabOrder: List<String> = listOf("dashboard", "vault", "family", "trash", "profile"),
    onNavigate: (String) -> Unit,
    onOpenDrawer: (() -> Unit)? = null
): Modifier = composed {
    val haptic = LocalHapticFeedback.current

    if (!enabled || currentRoute == null || !tabOrder.contains(currentRoute)) {
        return@composed this
    }

    val currentIndex = tabOrder.indexOf(currentRoute)
    var totalDragX by remember(currentRoute) { mutableFloatStateOf(0f) }

    this.pointerInput(currentRoute, enabled) {
        detectHorizontalDragGestures(
            onDragStart = {
                totalDragX = 0f
            },
            onHorizontalDrag = { change, dragAmount ->
                totalDragX += dragAmount
                if (kotlin.math.abs(totalDragX) > 40f) {
                    change.consume()
                }
            },
            onDragEnd = {
                val threshold = 60.dp.toPx()
                if (totalDragX < -threshold && currentIndex < tabOrder.size - 1) {
                    try {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    } catch (_: Exception) {}
                    onNavigate(tabOrder[currentIndex + 1])
                } else if (totalDragX > threshold) {
                    if (currentIndex > 0) {
                        try {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        } catch (_: Exception) {}
                        onNavigate(tabOrder[currentIndex - 1])
                    } else if (currentIndex == 0 && onOpenDrawer != null) {
                        try {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        } catch (_: Exception) {}
                        onOpenDrawer()
                    }
                }
                totalDragX = 0f
            },
            onDragCancel = {
                totalDragX = 0f
            }
        )
    }
}

/**
 * Continuous rotating animation for active refresh indicators and spinning icons.
 */
fun Modifier.rotatingRefresh(
    isRotating: Boolean = true,
    durationMillis: Int = 1000
): Modifier = composed {
    val infiniteTransition = rememberInfiniteTransition(label = "rotatingRefresh")
    val angle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = if (isRotating) 360f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = durationMillis, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "refreshAngle"
    )

    this.rotate(if (isRotating) angle else 0f)
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
            animation = tween(2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "auraProgress"
    )

    this.drawBehind {
        val radius = size.minDimension / 2 + (maxRadiusDp.toPx() * pulseProgress)
        val alpha = (1f - pulseProgress) * 0.30f
        drawCircle(
            color = auraColor.copy(alpha = alpha),
            radius = radius,
            center = center
        )
    }
}

/**
 * Staggered cascade entrance animation (fade + slide-up) for initial screen content.
 * Safely bounded so scrolling through lists never introduces unwanted delay or jitter.
 */
fun Modifier.staggeredEntrance(
    index: Int = 0,
    baseDelayMs: Long = 45L
): Modifier = composed {
    var visible by remember { mutableStateOf(false) }
    val boundedIndex = index.coerceIn(0, 5)

    LaunchedEffect(Unit) {
        delay(boundedIndex * baseDelayMs)
        visible = true
    }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(280, easing = FastOutSlowInEasing),
        label = "staggerAlpha"
    )

    val translateY by animateFloatAsState(
        targetValue = if (visible) 0f else 20f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioLowBouncy,
            stiffness = Spring.StiffnessMediumLow
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
