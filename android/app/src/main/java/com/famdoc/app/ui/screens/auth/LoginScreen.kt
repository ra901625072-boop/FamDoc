package com.famdoc.app.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.network.Resource
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.FamDocCrest
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onNavigateToDashboard: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToJoin: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    onBack: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val authState by authViewModel.authState.collectAsState()
    val scrollState = rememberScrollState()

    LaunchedEffect(authState) {
        if (authState is Resource.Success) {
            authViewModel.clearAuthState()
            onNavigateToDashboard()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.bounceClick(scaleDown = 0.9f)
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
            // FamDoc Bespoke Keepsake Crest Emblem
            Box(modifier = Modifier.staggeredEntrance(index = 0)) {
                FamDocCrest(size = 64.dp)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            Text(
                text = "Welcome Back",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 24.sp,
                    letterSpacing = (-0.3).sp
                ),
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.staggeredEntrance(index = 1)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing4))

            Text(
                text = "Enter your family keepsake vault",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.staggeredEntrance(index = 2)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing24))

            // Animated Error Alert Banner
            AnimatedVisibility(
                visible = authState is Resource.Error,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                if (authState is Resource.Error) {
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
                            Icon(
                                imageVector = Icons.Default.ErrorOutline,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.width(Dimens.Spacing10))
                            Text(
                                text = (authState as Resource.Error).message,
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email Address") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                singleLine = true,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 3)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing14))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password"
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 4)
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 5),
                contentAlignment = Alignment.CenterEnd
            ) {
                TextButton(onClick = onNavigateToForgotPassword) {
                    Text(
                        "Forgot Password?",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing12))

            val isLoading = authState is Resource.Loading
            Button(
                onClick = {
                    if (email.isNotBlank() && password.isNotBlank()) {
                        authViewModel.login(email.trim(), password)
                    }
                },
                enabled = !isLoading && email.isNotBlank() && password.isNotBlank(),
                modifier = Modifier
                    .staggeredEntrance(index = 6)
                    .fillMaxWidth()
                    .height(Dimens.PrimaryButtonHeight)
                    .bounceClick(scaleDown = 0.96f),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.5.dp
                    )
                } else {
                    Text("Enter Vault", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing20))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 7),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("New to FamDoc?", style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = onNavigateToRegister) {
                    Text("Create a Vault", fontWeight = FontWeight.Bold)
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 8),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Invited by family?", style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = onNavigateToJoin) {
                    Text("Join with Code", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
