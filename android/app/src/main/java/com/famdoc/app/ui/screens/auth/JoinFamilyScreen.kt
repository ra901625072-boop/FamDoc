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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
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
fun JoinFamilyScreen(
    authViewModel: AuthViewModel,
    onNavigateToDashboard: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onBack: () -> Unit
) {
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var secretCode by remember { mutableStateOf("") }
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
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { onBack() }
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
            Box(modifier = Modifier.staggeredEntrance(index = 0)) {
                FamDocCrest(size = 64.dp)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            Text(
                text = "Join Family Vault",
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
                text = "Enter the 8-character invitation code from your family administrator",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.staggeredEntrance(index = 2)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing24))

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
                            Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
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
                value = secretCode,
                onValueChange = { if (it.length <= 8) secretCode = it.uppercase() },
                label = { Text("Family Invitation Code") },
                leadingIcon = { Icon(Icons.Default.ConfirmationNumber, contentDescription = null, tint = BrandAccent) },
                singleLine = true,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                textStyle = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                ),
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 3)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing14))

            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Your Display Name / Username") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                singleLine = true,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 4)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing14))

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
                    .staggeredEntrance(index = 5)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing14))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Create Personal Password (Optional)") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 6)
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing24))

            val isLoading = authState is Resource.Loading
            Button(
                onClick = {
                    if (secretCode.isNotBlank() && username.isNotBlank() && email.isNotBlank()) {
                        authViewModel.joinFamily(
                            username.trim(),
                            email.trim(),
                            secretCode.trim(),
                            if (password.isNotBlank()) password else null
                        )
                    }
                },
                enabled = !isLoading && secretCode.isNotBlank() && username.isNotBlank() && email.isNotBlank(),
                modifier = Modifier
                    .staggeredEntrance(index = 7)
                    .fillMaxWidth()
                    .height(Dimens.PrimaryButtonHeight)
                    .bounceClick(scaleDown = 0.96f) {
                        if (secretCode.isNotBlank() && username.isNotBlank() && email.isNotBlank()) {
                            authViewModel.joinFamily(
                                username.trim(),
                                email.trim(),
                                secretCode.trim(),
                                if (password.isNotBlank()) password else null
                            )
                        }
                    },
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
                    Text("Join Vault Group", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing16))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .staggeredEntrance(index = 8),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Already a member?", style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = onNavigateToLogin) {
                    Text("Log In", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
