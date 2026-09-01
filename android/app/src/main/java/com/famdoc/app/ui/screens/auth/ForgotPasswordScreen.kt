package com.famdoc.app.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.FamDocCrest
import com.famdoc.app.ui.components.WakeupBanner
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordScreen(
    authViewModel: AuthViewModel,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onNavigateBackToLogin: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmNewPassword by remember { mutableStateOf("") }

    var step by remember { mutableIntStateOf(1) } // 1: Request OTP, 2: Verify OTP, 3: Set New Password
    var localError by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    val resetState by authViewModel.passwordResetState.collectAsState()
    val scrollState = rememberScrollState()

    LaunchedEffect(resetState) {
        when (val state = resetState) {
            is Resource.Success<String> -> {
                when (step) {
                    1 -> {
                        step = 2
                        successMessage = "OTP sent to your email."
                    }
                    2 -> {
                        step = 3
                        successMessage = "OTP verified. Enter new password."
                    }
                    3 -> {
                        successMessage = "Password reset successfully! You can now log in."
                    }
                }
                authViewModel.clearAuthState()
            }
            is Resource.Error -> {
                localError = state.message
                authViewModel.clearAuthState()
            }
            else -> {}
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateBackToLogin,
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { onNavigateBackToLogin() }
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(horizontal = Dimens.FormPaddingHorizontal, vertical = Dimens.Spacing8),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            WakeupBanner(serverStatus = serverStatus, isOffline = isOffline)

            Box(modifier = Modifier.staggeredEntrance(index = 0)) {
                FamDocCrest(size = 64.dp)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            Text(
                text = when (step) {
                    1 -> "Forgot Password"
                    2 -> "Verify OTP Code"
                    else -> "New Password"
                },
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 24.sp,
                    letterSpacing = (-0.3).sp
                ),
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.staggeredEntrance(index = 1)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            // Error / Success Banners
            val errorMessage = localError
            AnimatedVisibility(
                visible = errorMessage != null || successMessage != null,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                if (errorMessage != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = Dimens.Spacing16),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Row(
                            modifier = Modifier.padding(Dimens.Spacing14),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(Dimens.Spacing10))
                            Text(
                                text = errorMessage,
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                } else if (successMessage != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = Dimens.Spacing16),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                    ) {
                        Row(
                            modifier = Modifier.padding(Dimens.Spacing14),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(Dimens.Spacing10))
                            Text(
                                text = successMessage!!,
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
            }

            when (step) {
                1 -> {
                    Text(
                        text = "Enter your registered email address to receive a 6-digit verification code.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.staggeredEntrance(index = 2)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing20))
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; localError = null },
                        label = { Text("Email Address") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 3)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing24))
                    Button(
                        onClick = {
                            if (email.isNotBlank()) {
                                authViewModel.requestPasswordReset(email.trim())
                            }
                        },
                        enabled = email.isNotBlank() && resetState !is Resource.Loading,
                        modifier = Modifier
                            .staggeredEntrance(index = 4)
                            .fillMaxWidth()
                            .height(Dimens.PrimaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f) {
                                if (email.isNotBlank()) {
                                    authViewModel.requestPasswordReset(email.trim())
                                }
                            },
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Text("Send Verification OTP", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }

                2 -> {
                    Text(
                        text = "Enter the 6-digit OTP code sent to $email.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.staggeredEntrance(index = 2)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing20))
                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { if (it.length <= 6) { otpCode = it; localError = null } },
                        label = { Text("6-Digit OTP Code") },
                        leadingIcon = { Icon(Icons.Default.Pin, contentDescription = null, tint = BrandAccent) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 4.sp
                        ),
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 3)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing24))
                    Button(
                        onClick = {
                            if (otpCode.length == 6) {
                                authViewModel.verifyResetOTP(email.trim(), otpCode.trim())
                            }
                        },
                        enabled = otpCode.length == 6 && resetState !is Resource.Loading,
                        modifier = Modifier
                            .staggeredEntrance(index = 4)
                            .fillMaxWidth()
                            .height(Dimens.PrimaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f) {
                                if (otpCode.length == 6) {
                                    authViewModel.verifyResetOTP(email.trim(), otpCode.trim())
                                }
                            },
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Text("Verify OTP", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }

                3 -> {
                    Text(
                        text = "Create a new strong password for your family vault account.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.staggeredEntrance(index = 2)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing20))
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it; localError = null },
                        label = { Text("New Password") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 3)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing14))
                    OutlinedTextField(
                        value = confirmNewPassword,
                        onValueChange = { confirmNewPassword = it; localError = null },
                        label = { Text("Confirm New Password") },
                        leadingIcon = { Icon(Icons.Default.LockReset, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 4)
                    )
                    Spacer(modifier = Modifier.height(Dimens.Spacing24))
                    Button(
                        onClick = {
                            if (newPassword != confirmNewPassword) {
                                localError = "Passwords do not match."
                            } else if (newPassword.length < 8) {
                                localError = "Password must be at least 8 characters."
                            } else {
                                authViewModel.confirmPasswordReset(email.trim(), otpCode.trim(), newPassword)
                            }
                        },
                        enabled = newPassword.isNotBlank() && resetState !is Resource.Loading,
                        modifier = Modifier
                            .staggeredEntrance(index = 5)
                            .fillMaxWidth()
                            .height(Dimens.PrimaryButtonHeight)
                            .bounceClick(scaleDown = 0.96f) {
                                if (newPassword != confirmNewPassword) {
                                    localError = "Passwords do not match."
                                } else if (newPassword.length < 8) {
                                    localError = "Password must be at least 8 characters."
                                } else {
                                    authViewModel.confirmPasswordReset(email.trim(), otpCode.trim(), newPassword)
                                }
                            },
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Text("Reset & Save Password", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing20))

            TextButton(
                onClick = onNavigateBackToLogin,
                modifier = Modifier
                    .staggeredEntrance(index = 6)
                    .bounceClick(scaleDown = 0.95f, onClick = onNavigateBackToLogin)
            ) {
                Text("← Back to Sign In", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
