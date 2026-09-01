package com.famdoc.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.famdoc.app.FamDocApplication
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.data.models.User
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.pulsingAura
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.*
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel,
    currentUser: User?,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onOpenDrawer: () -> Unit,
    onLogout: () -> Unit
) {
    var username by remember { mutableStateOf(currentUser?.username ?: "") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }
    var showSuccessToast by remember { mutableStateOf(false) }

    val appConfig = FamDocApplication.instance.appConfig
    val themeMode by appConfig.themeMode.collectAsState()

    val authState by authViewModel.authState.collectAsState()
    val scrollState = rememberScrollState()

    LaunchedEffect(currentUser) {
        currentUser?.let { username = it.username }
    }

    LaunchedEffect(authState) {
        if (authState is Resource.Success) {
            showSuccessToast = true
        }
    }

    Scaffold(
        topBar = {
            FamDocAppBar(
                title = "Profile & Settings",
                subtitle = "Manage credentials, theme, and server",
                navigationIcon = Icons.Default.Menu,
                onNavigationClick = onOpenDrawer
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(horizontal = Dimens.FormPaddingHorizontal, vertical = Dimens.Spacing16),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            WakeupBanner(serverStatus = serverStatus, isOffline = isOffline)

            // User Avatar Header with Glowing Pulsing Aura
            Box(
                modifier = Modifier
                    .staggeredEntrance(index = 0)
                    .size(76.dp)
                    .pulsingAura(auraColor = BrandAccent, maxRadiusDp = 12.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(BrandAccent, BrandAccentLight)
                        )
                    )
                    .border(2.5.dp, Color.White.copy(alpha = 0.85f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = currentUser?.initials ?: "U",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.ExtraBold,
                        color = MintPrimaryDark
                    )
                )
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing12))

            Text(
                text = currentUser?.username ?: "User",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.staggeredEntrance(index = 1)
            )

            Text(
                text = currentUser?.email ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.staggeredEntrance(index = 2)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing20))

            // Appearance & Theme Selector
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 3)
                    .border(
                        Dimens.BorderThin,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                        RoundedCornerShape(Dimens.RadiusLarge)
                    ),
                shape = RoundedCornerShape(Dimens.RadiusLarge),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
            ) {
                Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                    Text(
                        text = "Appearance Theme",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing10))
                    ThemeSelector(
                        currentThemeMode = themeMode,
                        onThemeModeSelected = { mode ->
                            appConfig.setThemeMode(mode)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            // Profile Credentials Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 4)
                    .border(
                        Dimens.BorderThin,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                        RoundedCornerShape(Dimens.RadiusLarge)
                    ),
                shape = RoundedCornerShape(Dimens.RadiusLarge),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
            ) {
                Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                    Text(
                        text = "Account Credentials",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )

                    Spacer(modifier = Modifier.height(Dimens.Spacing14))

                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it; validationError = null },
                        label = { Text("Display Name") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = MintPrimaryLight) },
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(Dimens.Spacing12))

                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it; validationError = null },
                        label = { Text("New Password (Leave blank to keep)") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MintPrimaryLight) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(Dimens.Spacing12))

                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it; validationError = null },
                        label = { Text("Confirm New Password") },
                        leadingIcon = { Icon(Icons.Default.LockReset, contentDescription = null, tint = MintPrimaryLight) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (validationError != null) {
                        Spacer(modifier = Modifier.height(Dimens.Spacing8))
                        Text(
                            text = validationError!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }

                    Spacer(modifier = Modifier.height(Dimens.Spacing16))

                    Button(
                        onClick = {
                            if (newPassword.isNotBlank() && newPassword != confirmPassword) {
                                validationError = "Passwords do not match."
                            } else {
                                authViewModel.updateProfile(
                                    username = username.trim(),
                                    password = if (newPassword.isNotBlank()) newPassword else null
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(Dimens.SecondaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f) {
                                if (newPassword.isNotBlank() && newPassword != confirmPassword) {
                                    validationError = "Passwords do not match."
                                } else {
                                    authViewModel.updateProfile(
                                        username = username.trim(),
                                        password = if (newPassword.isNotBlank()) newPassword else null
                                    )
                                }
                            },
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Text("Save Profile Changes", fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing20))

            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier
                    .staggeredEntrance(index = 5)
                    .fillMaxWidth()
                    .height(Dimens.PrimaryButtonHeight)
                    .bounceClick(scaleDown = 0.96f, onClick = onLogout),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(brush = Brush.linearGradient(listOf(MaterialTheme.colorScheme.error, MaterialTheme.colorScheme.error)))
            ) {
                Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                Spacer(modifier = Modifier.width(Dimens.Spacing8))
                Text("Sign Out of Vault", fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing24))
        }
    }
}
