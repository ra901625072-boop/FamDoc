package com.famdoc.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.famdoc.app.core.config.AppThemeMode

private val LightColorScheme = lightColorScheme(
    primary = MintPrimary,
    onPrimary = Color.White,
    primaryContainer = MintSecondaryContainer,
    onPrimaryContainer = MintPrimaryDark,
    secondary = MintSecondary,
    onSecondary = Color.White,
    secondaryContainer = MintSurfaceVariant,
    onSecondaryContainer = MintPrimary,
    tertiary = BrandAccent,
    background = MintBackground,
    onBackground = MintTextPrimary,
    surface = MintSurface,
    onSurface = MintTextPrimary,
    surfaceVariant = MintSurfaceVariant,
    onSurfaceVariant = MintTextSecondary,
    outline = MintBorder,
    error = BrandError
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = Color(0xFF000000),
    primaryContainer = Color(0xFF14291F),
    onPrimaryContainer = DarkPrimary,
    secondary = BrandSecondaryLight,
    onSecondary = Color(0xFF000000),
    secondaryContainer = Color(0xFF0D281E),
    onSecondaryContainer = DarkPrimary,
    tertiary = BrandAccent,
    background = DarkAmoledBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorder,
    error = BrandError
)

@Composable
fun FamDocTheme(
    themeMode: AppThemeMode = AppThemeMode.SYSTEM,
    darkTheme: Boolean = when (themeMode) {
        AppThemeMode.LIGHT -> false
        AppThemeMode.DARK -> true
        AppThemeMode.SYSTEM -> isSystemInDarkTheme()
    },
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = if (darkTheme) Color(0xFF000000).toArgb() else MintPrimaryDark.toArgb()
            window.navigationBarColor = if (darkTheme) Color(0xFF000000).toArgb() else MintBackground.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
