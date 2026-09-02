package com.famdoc.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrightnessAuto
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.config.AppThemeMode
import com.famdoc.app.ui.theme.Dimens

/**
 * Minimalist, ultra-clean segmented Theme Switcher.
 * Compact height (38dp), zero text truncation, smooth spring animation.
 */
@Composable
fun ThemeSelector(
    currentThemeMode: AppThemeMode,
    onThemeModeSelected: (AppThemeMode) -> Unit,
    modifier: Modifier = Modifier,
    showBorder: Boolean = true
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (showBorder) {
                    Modifier.border(
                        width = Dimens.BorderThin,
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f),
                        shape = RoundedCornerShape(Dimens.RadiusPill)
                    )
                } else Modifier
            ),
        shape = RoundedCornerShape(Dimens.RadiusPill),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(3.dp),
            horizontalArrangement = Arrangement.spacedBy(3.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            MinimalThemeOption(
                title = "Auto",
                icon = Icons.Default.BrightnessAuto,
                isSelected = currentThemeMode == AppThemeMode.SYSTEM,
                modifier = Modifier.weight(1f),
                onClick = { onThemeModeSelected(AppThemeMode.SYSTEM) }
            )

            MinimalThemeOption(
                title = "Light",
                icon = Icons.Default.LightMode,
                isSelected = currentThemeMode == AppThemeMode.LIGHT,
                modifier = Modifier.weight(1f),
                onClick = { onThemeModeSelected(AppThemeMode.LIGHT) }
            )

            MinimalThemeOption(
                title = "Dark",
                icon = Icons.Default.DarkMode,
                isSelected = currentThemeMode == AppThemeMode.DARK,
                modifier = Modifier.weight(1f),
                onClick = { onThemeModeSelected(AppThemeMode.DARK) }
            )
        }
    }
}

@Composable
private fun MinimalThemeOption(
    title: String,
    icon: ImageVector,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val haptic = LocalHapticFeedback.current

    val bgColor by animateColorAsState(
        targetValue = if (isSelected) MaterialTheme.colorScheme.surface else Color.Transparent,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "tabBg"
    )

    val contentColor by animateColorAsState(
        targetValue = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
        label = "tabContent"
    )

    val iconScale by animateFloatAsState(
        targetValue = if (isSelected) 1.12f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "tabIconScale"
    )

    Box(
        modifier = modifier
            .height(34.dp)
            .then(
                if (isSelected) {
                    Modifier.shadow(
                        elevation = 2.dp,
                        shape = RoundedCornerShape(Dimens.RadiusPill),
                        spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                    )
                } else Modifier
            )
            .clip(RoundedCornerShape(Dimens.RadiusPill))
            .background(bgColor)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = {
                    try {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    } catch (_: Exception) {}
                    onClick()
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = contentColor,
                modifier = Modifier
                    .size(15.dp)
                    .scale(iconScale)
            )
            Spacer(modifier = Modifier.width(5.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    fontSize = 11.5.sp,
                    letterSpacing = 0.2.sp
                ),
                color = contentColor,
                maxLines = 1
            )
        }
    }
}
