package com.famdoc.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamDocAppBar(
    title: String,
    subtitle: String? = null,
    navigationIcon: ImageVector? = Icons.Default.Menu,
    onNavigationClick: (() -> Unit)? = null,
    showBrandBadge: Boolean = false,
    actions: @Composable RowScope.() -> Unit = {}
) {
    val isDark = MaterialTheme.colorScheme.background == DarkAmoledBackground

    val appBarBackground = if (isDark) {
        Brush.horizontalGradient(
            colors = listOf(Color(0xFF000000), Color(0xFF141416))
        )
    } else {
        Brush.horizontalGradient(
            colors = listOf(MintPrimaryDark, MintPrimary)
        )
    }

    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (showBrandBadge) {
                    FamDocBadge(size = 32.dp)
                    Spacer(modifier = Modifier.width(10.dp))
                }
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = (-0.2).sp
                        ),
                        color = Color.White,
                        maxLines = 1
                    )
                    if (!subtitle.isNullOrBlank()) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontWeight = FontWeight.Normal
                            ),
                            color = if (isDark) DarkPrimary else Color.White.copy(alpha = 0.85f),
                            maxLines = 1
                        )
                    }
                }
            }
        },
        navigationIcon = {
            if (navigationIcon != null && onNavigationClick != null) {
                IconButton(
                    onClick = onNavigationClick,
                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { onNavigationClick() }
                ) {
                    Icon(
                        imageVector = navigationIcon,
                        contentDescription = "Navigation",
                        tint = Color.White
                    )
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color.Transparent,
            titleContentColor = Color.White,
            actionIconContentColor = Color.White
        ),
        modifier = Modifier
            .background(appBarBackground)
            .border(
                width = if (isDark) Dimens.BorderThin else 0.dp,
                color = if (isDark) DarkBorder else Color.Transparent,
                shape = RectangleShape
            )
    )
}
