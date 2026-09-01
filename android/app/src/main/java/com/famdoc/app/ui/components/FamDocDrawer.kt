package com.famdoc.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.data.models.User
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.pulsingAura
import com.famdoc.app.ui.theme.*

@Composable
fun FamDocDrawer(
    currentUser: User?,
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onCloseDrawer: () -> Unit
) {
    val isDark = MaterialTheme.colorScheme.background == DarkAmoledBackground

    val drawerHeaderBackground = if (isDark) {
        Brush.verticalGradient(
            colors = listOf(Color(0xFF000000), Color(0xFF141416))
        )
    } else {
        Brush.verticalGradient(
            colors = listOf(MintPrimaryDark, MintPrimary)
        )
    }

    ModalDrawerSheet(
        modifier = Modifier.width(310.dp),
        drawerContainerColor = MaterialTheme.colorScheme.surface
    ) {
        // Drawer Header with User Profile and Ambient Gradient
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(drawerHeaderBackground)
                .padding(Dimens.Spacing24)
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .pulsingAura(auraColor = BrandAccent, maxRadiusDp = 10.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(BrandAccent, BrandAccentLight)
                                )
                            )
                            .border(2.dp, Color.White.copy(alpha = 0.9f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = currentUser?.initials ?: "U",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF0F172A)
                            )
                        )
                    }
                    Spacer(modifier = Modifier.width(Dimens.Spacing16))
                    Column {
                        Text(
                            text = currentUser?.username ?: "FamDoc User",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            ),
                            maxLines = 1
                        )
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = Color.White.copy(alpha = 0.2f),
                            modifier = Modifier.padding(top = Dimens.Spacing4)
                        ) {
                            Text(
                                text = if (currentUser?.isAdmin == true) "Vault Administrator" else "Family Member",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 11.sp
                                ),
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(Dimens.Spacing12))
                Text(
                    text = currentUser?.email ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.85f),
                    maxLines = 1
                )
            }
        }

        Spacer(modifier = Modifier.height(Dimens.Spacing12))

        // Navigation Items
        DrawerItem("Dashboard", Icons.Default.Dashboard, currentRoute == "dashboard") {
            onNavigate("dashboard")
            onCloseDrawer()
        }
        DrawerItem("Shared Vault", Icons.Default.Folder, currentRoute == "vault") {
            onNavigate("vault")
            onCloseDrawer()
        }
        DrawerItem("Family Group", Icons.Default.People, currentRoute == "family") {
            onNavigate("family")
            onCloseDrawer()
        }
        DrawerItem("Cloud Storage & Quotas", Icons.Default.CloudQueue, currentRoute == "storage") {
            onNavigate("storage")
            onCloseDrawer()
        }
        DrawerItem("Recycle Bin", Icons.Default.Delete, currentRoute == "trash") {
            onNavigate("trash")
            onCloseDrawer()
        }
        DrawerItem("Profile & Credentials", Icons.Default.Person, currentRoute == "profile") {
            onNavigate("profile")
            onCloseDrawer()
        }

        // Minimal Quick Theme Mode Switcher inside Drawer
        val appConfig = com.famdoc.app.FamDocApplication.instance.appConfig
        val currentThemeMode by appConfig.themeMode.collectAsState()

        Column(
            modifier = Modifier.padding(horizontal = Dimens.Spacing16, vertical = Dimens.Spacing8)
        ) {
            Text(
                text = "APPEARANCE",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    fontSize = 10.sp
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.padding(start = 4.dp, bottom = 6.dp)
            )
            ThemeSelector(
                currentThemeMode = currentThemeMode,
                onThemeModeSelected = { mode ->
                    appConfig.setThemeMode(mode)
                }
            )
        }

        Spacer(modifier = Modifier.weight(1f))
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
            modifier = Modifier.padding(horizontal = Dimens.Spacing16)
        )

        // Logout action
        DrawerItem(
            title = "Sign Out",
            icon = Icons.AutoMirrored.Filled.ExitToApp,
            selected = false,
            color = MaterialTheme.colorScheme.error
        ) {
            onCloseDrawer()
            onLogout()
        }

        Spacer(modifier = Modifier.height(Dimens.Spacing16))
    }
}

@Composable
private fun DrawerItem(
    title: String,
    icon: ImageVector,
    selected: Boolean,
    color: Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit
) {
    NavigationDrawerItem(
        icon = {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = if (selected) MaterialTheme.colorScheme.primary else color
            )
        },
        label = {
            Text(
                text = title,
                color = if (selected) MaterialTheme.colorScheme.primary else color,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
            )
        },
        selected = selected,
        onClick = onClick,
        shape = RoundedCornerShape(Dimens.RadiusMedium),
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
        ),
        modifier = Modifier
            .padding(horizontal = Dimens.Spacing12, vertical = Dimens.Spacing2)
            .bounceClick(scaleDown = 0.97f, onClick = onClick)
    )
}
