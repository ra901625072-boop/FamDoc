package com.famdoc.app.ui.screens.storage

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.*
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.rotatingRefresh
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.*
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.StorageViewModel

// Google Brand Colors for Multi-color Stripe & Accents
private val GoogleBlue = Color(0xFF4285F4)
private val GoogleGreen = Color(0xFF34A853)
private val GoogleYellow = Color(0xFFFBBC05)
private val GoogleRed = Color(0xFFEA4335)

// Category Storage Breakdown Colors
private val CategoryImageColor = Color(0xFF3B82F6)
private val CategoryPdfColor = Color(0xFFEF4444)
private val CategoryDocColor = Color(0xFF8B5CF6)
private val CategorySheetColor = Color(0xFF10B981)
private val CategoryTextColor = Color(0xFFF59E0B)
private val CategoryOtherColor = Color(0xFF6B7280)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StorageConfigScreen(
    storageViewModel: StorageViewModel,
    currentUser: User?,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onOpenDrawer: () -> Unit
) {
    val context = LocalContext.current
    val storageConfigState by storageViewModel.storageConfigState.collectAsState()
    val accountsState by storageViewModel.accountsState.collectAsState()
    val familyMembersState by storageViewModel.familyMembersState.collectAsState()
    val dashboardStatsState by storageViewModel.dashboardStatsState.collectAsState()
    val oauthUrlState by storageViewModel.oauthUrlState.collectAsState()
    val actionMessage by storageViewModel.actionMessage.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    val isAdmin = currentUser?.role?.lowercase() == "admin"

    // UI Drawer and Dialog state
    var showCredentialsDrawer by remember { mutableStateOf(false) }
    var accountToRename by remember { mutableStateOf<StorageAccount?>(null) }
    var accountToAssign by remember { mutableStateOf<StorageAccount?>(null) }
    var accountToDisconnect by remember { mutableStateOf<StorageAccount?>(null) }
    var accountToDelete by remember { mutableStateOf<StorageAccount?>(null) }

    LaunchedEffect(Unit) {
        storageViewModel.loadStorageData()
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                storageViewModel.loadStorageData()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(actionMessage) {
        actionMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            storageViewModel.clearActionMessage()
        }
    }

    LaunchedEffect(oauthUrlState) {
        if (oauthUrlState is Resource.Success) {
            val url = (oauthUrlState as Resource.Success<String>).data
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(browserIntent)
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Unable to open browser: ${e.message}")
            }
            storageViewModel.clearActionMessage()
        }
    }

    val config = (storageConfigState as? Resource.Success)?.data
    val accounts = (accountsState as? Resource.Success)?.data ?: config?.accounts ?: emptyList()
    val members = (familyMembersState as? Resource.Success)?.data ?: emptyList()
    val stats = (dashboardStatsState as? Resource.Success)?.data

    val myAccount = accounts.find {
        (it.userId != null && it.userId == currentUser?.id) ||
        (it.email != null && currentUser?.email != null && it.email.equals(currentUser.email, ignoreCase = true))
    }
    val hasConnectedStorage = myAccount != null && myAccount.status == "active"

    Scaffold(
        topBar = {
            FamDocAppBar(
                title = "Cloud Storage & Quotas",
                subtitle = "Pooled multi-account cloud storage",
                navigationIcon = Icons.Default.Menu,
                onNavigationClick = onOpenDrawer,
                actions = {
                    if (isAdmin) {
                        Surface(
                            onClick = { showCredentialsDrawer = !showCredentialsDrawer },
                            shape = RoundedCornerShape(Dimens.RadiusMedium),
                            color = if (showCredentialsDrawer) BrandAccent else BrandAccent.copy(alpha = 0.15f),
                            modifier = Modifier
                                .padding(end = 4.dp)
                                .bounceClick(scaleDown = 0.94f) { showCredentialsDrawer = !showCredentialsDrawer }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    Icons.Default.VpnKey,
                                    contentDescription = "API Credentials",
                                    tint = if (showCredentialsDrawer) Color.Black else BrandAccent,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Credentials",
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                    color = if (showCredentialsDrawer) Color.Black else BrandAccent
                                )
                            }
                        }
                    }

                    val isStorageLoading = storageConfigState is Resource.Loading || accountsState is Resource.Loading
                    IconButton(
                        onClick = { storageViewModel.loadStorageData() },
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { storageViewModel.loadStorageData() }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.rotatingRefresh(isRotating = isStorageLoading)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            WakeupBanner(serverStatus = serverStatus, isOffline = isOffline)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing16),
                verticalArrangement = Arrangement.spacedBy(Dimens.Spacing16)
            ) {
                // Member Self-Service Card if user is not admin
                if (!isAdmin && currentUser != null) {
                    item {
                        MemberStorageSelfServiceCard(
                            currentUser = currentUser,
                            myAccount = myAccount,
                            onConnectClick = {
                                storageViewModel.getGoogleOAuthUrl(clientId = config?.clientId)
                            },
                            onDisconnectClick = {
                                myAccount?.let { accountToDisconnect = it }
                            },
                            onReauthClick = {
                                storageViewModel.getGoogleOAuthUrl(clientId = config?.clientId, action = "reconnect")
                            }
                        )
                    }
                }

                // Inline Collapsible Google OAuth Credentials Drawer (Concept Screenshot 1)
                if (isAdmin) {
                    item {
                        AnimatedVisibility(
                            visible = showCredentialsDrawer,
                            enter = fadeIn() + expandVertically(),
                            exit = fadeOut() + shrinkVertically()
                        ) {
                            OAuthCredentialsDrawerCard(
                                initialClientId = config?.clientId ?: "",
                                onClose = { showCredentialsDrawer = false },
                                onSaveAndConnect = { cId, cSecret ->
                                    storageViewModel.getGoogleOAuthUrl(clientId = cId, clientSecret = cSecret)
                                }
                            )
                        }
                    }
                }

                // 1. HERO STORAGE POOL SUMMARY CARD (Concept Screenshots 3 & 4)
                item {
                    HeroStorageSummaryCard(
                        config = config,
                        stats = stats,
                        accounts = accounts,
                        isAdmin = isAdmin,
                        onUpdateMode = { mode -> storageViewModel.updateStorageMode(mode) }
                    )
                }

                // 2. CONNECTED GOOGLE DRIVES SECTION (Concept Screenshots 2, 3, 4)
                item {
                    val activeAccountsCount = accounts.count { it.status == "active" }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 1),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                GoogleGLogo(size = 18.dp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Connected Google Drives",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                                )
                            }
                            Text(
                                text = "$activeAccountsCount Active Drive${if (activeAccountsCount == 1) "" else "s"}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        if (isAdmin || !hasConnectedStorage) {
                            Button(
                                onClick = {
                                    if (isAdmin && config?.clientId.isNullOrBlank()) {
                                        showCredentialsDrawer = true
                                    } else {
                                        storageViewModel.getGoogleOAuthUrl(clientId = config?.clientId)
                                    }
                                },
                                shape = RoundedCornerShape(Dimens.RadiusMedium),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = GoogleBlue,
                                    contentColor = Color.White
                                ),
                                modifier = Modifier.bounceClick(scaleDown = 0.95f) {
                                    if (isAdmin && config?.clientId.isNullOrBlank()) {
                                        showCredentialsDrawer = true
                                    } else {
                                        storageViewModel.getGoogleOAuthUrl(clientId = config?.clientId)
                                    }
                                }
                            ) {
                                GoogleGLogo(size = 14.dp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isAdmin) "Connect Drive" else "Connect My Drive", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }

                // Accounts list / Empty State
                if (storageConfigState is Resource.Loading && accounts.isEmpty()) {
                    item { LoadingSkeletonView(itemCount = 2) }
                } else if (accounts.isEmpty()) {
                    item {
                        EmptyGoogleDrivesCard(
                            isAdmin = isAdmin,
                            onConnectClick = {
                                if (config?.clientId.isNullOrBlank()) {
                                    showCredentialsDrawer = true
                                } else {
                                    storageViewModel.getGoogleOAuthUrl(clientId = config?.clientId)
                                }
                            }
                        )
                    }
                } else {
                    items(
                        items = accounts,
                        key = { "account_${it.id}" }
                    ) { acc ->
                        GoogleAccountCard(
                            account = acc,
                            members = members,
                            isAdmin = isAdmin,
                            currentUser = currentUser,
                            onRename = { accountToRename = acc },
                            onAssign = { accountToAssign = acc },
                            onReauth = {
                                storageViewModel.getGoogleOAuthUrl(clientId = config?.clientId, action = "reconnect")
                            },
                            onDisconnect = { accountToDisconnect = acc },
                            onDelete = { accountToDelete = acc }
                        )
                    }
                }

                // 3. FAMILY STORAGE CONTRIBUTORS ROSTER SECTION (Concept Screenshots 3 & 4)
                item {
                    val contributingCount = members.count { m ->
                        accounts.any { it.status == "active" && (it.userId == m.userId || (it.email != null && it.email.equals(m.email, ignoreCase = true))) }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 3)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Groups,
                                    contentDescription = null,
                                    tint = MintPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Family Contributors",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                                )
                            }

                            Surface(
                                shape = RoundedCornerShape(Dimens.RadiusSmall),
                                color = MintSecondaryContainer.copy(alpha = 0.7f)
                            ) {
                                Text(
                                    text = "$contributingCount of ${members.size} Contributing",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = MintPrimaryDark,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Family members who linked their personal Google Drive contribute capacity to the shared pool.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (familyMembersState is Resource.Loading && members.isEmpty()) {
                    item { LoadingSkeletonView(itemCount = 2) }
                } else {
                    items(
                        items = members,
                        key = { "contributor_${it.userId}" }
                    ) { member ->
                        val memberAccounts = accounts.filter {
                            it.status == "active" && (it.userId == member.userId || (it.email != null && it.email.equals(member.email, ignoreCase = true)))
                        }
                        val isConnected = memberAccounts.isNotEmpty()
                        val totalCapacity = memberAccounts.sumOf { it.cachedQuotaTotal ?: 16106127360L }

                        ContributorRosterItem(
                            member = member,
                            isConnected = isConnected,
                            totalCapacityBytes = if (isConnected) totalCapacity else null
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(Dimens.Spacing24)) }
            }
        }

        // =========================================================================
        // DIALOGS
        // =========================================================================

        // 1. Rename Drive Nickname Dialog
        accountToRename?.let { acc ->
            RenameDriveDialog(
                currentLabel = acc.label ?: "",
                onDismiss = { accountToRename = null },
                onConfirm = { newLabel ->
                    storageViewModel.updateAccountLabel(acc.id, newLabel)
                    accountToRename = null
                }
            )
        }

        // 2. Assign Member Dialog
        accountToAssign?.let { acc ->
            AssignMemberDialog(
                currentUserId = acc.userId,
                members = members,
                onDismiss = { accountToAssign = null },
                onAssign = { userId ->
                    storageViewModel.assignAccountMember(acc.id, userId)
                    accountToAssign = null
                }
            )
        }

        // 3. Disconnect Drive Confirmation Dialog
        accountToDisconnect?.let { acc ->
            ConfirmDialog(
                title = "Disconnect Google Drive",
                message = "Are you sure you want to disconnect \"${acc.email ?: acc.label ?: "this drive"}\"? Files stored on this drive will be safely migrated to other connected family drives in the background.",
                confirmText = "Disconnect Drive",
                isDestructive = true,
                onConfirm = {
                    storageViewModel.disconnectAccount(acc.id)
                    accountToDisconnect = null
                },
                onDismiss = { accountToDisconnect = null }
            )
        }

        // 4. Delete Account Record Confirmation Dialog
        accountToDelete?.let { acc ->
            ConfirmDialog(
                title = "Remove Account Record",
                message = "Are you sure you want to permanently remove \"${acc.email ?: acc.label ?: "this account"}\" from the family vault?",
                confirmText = "Remove",
                isDestructive = true,
                onConfirm = {
                    storageViewModel.deleteAccount(acc.id)
                    accountToDelete = null
                },
                onDismiss = { accountToDelete = null }
            )
        }
    }
}

// =============================================================================
// COLLAPSIBLE GOOGLE OAUTH API CREDENTIALS CARD (Concept Screenshot 1)
// =============================================================================
@Composable
private fun OAuthCredentialsDrawerCard(
    initialClientId: String,
    onClose: () -> Unit,
    onSaveAndConnect: (String, String) -> Unit
) {
    var clientId by remember { mutableStateOf(initialClientId) }
    var clientSecret by remember { mutableStateOf("") }
    var showClientId by remember { mutableStateOf(false) }
    var showClientSecret by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                Dimens.BorderThin,
                GoogleBlue.copy(alpha = 0.4f),
                RoundedCornerShape(Dimens.RadiusLarge)
            ),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(Dimens.Spacing16)) {
            // Header: Icon + Title + Close Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    GoogleGLogo(size = 18.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Google OAuth API Credentials",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }

                IconButton(
                    onClick = onClose,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Provide your Google Cloud OAuth Client ID and Secret to allow family members to link their Google Drive accounts.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing12))

            // Inputs
            OutlinedTextField(
                value = clientId,
                onValueChange = { clientId = it },
                label = { Text("Google Client ID") },
                placeholder = { Text("Enter Client ID") },
                singleLine = true,
                visualTransformation = if (showClientId) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { showClientId = !showClientId }) {
                        Icon(
                            if (showClientId) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = "Toggle visibility"
                        )
                    }
                },
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing10))

            OutlinedTextField(
                value = clientSecret,
                onValueChange = { clientSecret = it },
                label = { Text("Google Client Secret") },
                placeholder = { Text("Enter Client Secret") },
                singleLine = true,
                visualTransformation = if (showClientSecret) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { showClientSecret = !showClientSecret }) {
                        Icon(
                            if (showClientSecret) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = "Toggle visibility"
                        )
                    }
                },
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing14))

            // Actions Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onClose) {
                    Text("Cancel")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = { onSaveAndConnect(clientId.trim(), clientSecret.trim()) },
                    enabled = clientId.isNotBlank(),
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoogleBlue,
                        contentColor = Color.White
                    ),
                    modifier = Modifier.bounceClick(scaleDown = 0.95f) {
                        onSaveAndConnect(clientId.trim(), clientSecret.trim())
                    }
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Save & Connect Account", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// =============================================================================
// HERO STORAGE SUMMARY CARD (Concept Screenshots 3 & 4)
// =============================================================================
@Composable
private fun HeroStorageSummaryCard(
    config: StorageConfigResponse?,
    stats: DashboardStats?,
    accounts: List<StorageAccount>,
    isAdmin: Boolean,
    onUpdateMode: (String) -> Unit
) {
    val provider = config?.storageProvider ?: "local"
    val isGoogleMode = provider == "google" || provider == "gdrive"
    val activeAccounts = accounts.filter { it.status == "active" }

    val totalBytes = config?.totalCapacityBytes ?: (500L * 1024 * 1024)
    val usedBytes = stats?.totalSizeBytes ?: (config?.totalUsedBytes ?: 0L)
    val freeBytes = (totalBytes - usedBytes).coerceAtLeast(0L)
    val percentUsed = if (totalBytes > 0) ((usedBytes.toFloat() / totalBytes.toFloat()) * 100f).toInt().coerceIn(0, 100) else 0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .staggeredEntrance(index = 0)
            .border(
                Dimens.BorderThin,
                MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                RoundedCornerShape(Dimens.RadiusLarge)
            ),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Google Brand 4-color top stripe
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(GoogleBlue, GoogleGreen, GoogleYellow, GoogleRed)
                        )
                    )
            )

            Column(modifier = Modifier.padding(Dimens.Spacing16)) {
                // Header & Status Pill
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Family Storage Capacity",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )

                    Surface(
                        shape = RoundedCornerShape(Dimens.RadiusSmall),
                        color = if (isGoogleMode) BrandSuccess.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            if (isGoogleMode) {
                                GoogleGLogo(size = 12.dp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "GOOGLE CLOUD (${activeAccounts.size} DRIVES)",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 10.sp
                                    ),
                                    color = BrandSuccess
                                )
                            } else {
                                Icon(
                                    Icons.Default.Storage,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "LOCAL STORAGE",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 10.sp
                                    ),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(Dimens.Spacing14))

                // 3 Metrics Display
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    MetricColumn(label = "TOTAL POOL", value = FileUtils.formatBytes(totalBytes), isAccent = false)
                    MetricColumn(
                        label = "USED SPACE",
                        value = "${FileUtils.formatBytes(usedBytes)} ($percentUsed%)",
                        isAccent = true
                    )
                    MetricColumn(label = "FREE SPACE", value = FileUtils.formatBytes(freeBytes), isAccent = false)
                }

                Spacer(modifier = Modifier.height(Dimens.Spacing14))

                // Multi-Segment Progress Bar & Breakdown
                MultiSegmentProgressBar(
                    totalBytes = totalBytes,
                    usedBytes = usedBytes,
                    breakdown = stats?.storageBreakdown
                )

                Spacer(modifier = Modifier.height(Dimens.Spacing16))

                HorizontalDivider(
                    modifier = Modifier.fillMaxWidth(),
                    thickness = 1.dp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )

                Spacer(modifier = Modifier.height(Dimens.Spacing12))

                // Storage Mode Segmented Switcher
                Text(
                    text = "Storage Mode:",
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(Dimens.Spacing8))

                StorageModeSegmentedControl(
                    currentMode = if (isGoogleMode) "google" else "local",
                    googleConfigured = config?.googleConfigured == true || activeAccounts.isNotEmpty(),
                    isAdmin = isAdmin,
                    onModeSelect = onUpdateMode
                )

                Spacer(modifier = Modifier.height(Dimens.Spacing8))

                Text(
                    text = if (isGoogleMode) {
                        "Uploads route automatically to the drive with most free space."
                    } else {
                        "Files are saved securely to your local family database storage folder."
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun MetricColumn(label: String, value: String, isAccent: Boolean) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.4.sp
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            ),
            color = if (isAccent) GoogleBlue else MaterialTheme.colorScheme.onSurface
        )
    }
}

// Multi-Segment Storage Progress Bar
@Composable
private fun MultiSegmentProgressBar(
    totalBytes: Long,
    usedBytes: Long,
    breakdown: Map<String, CategoryUsage>?
) {
    val categories = listOf(
        Triple("image", "Images", CategoryImageColor),
        Triple("pdf", "PDFs", CategoryPdfColor),
        Triple("document", "Docs", CategoryDocColor),
        Triple("sheet", "Sheets", CategorySheetColor),
        Triple("text", "Text", CategoryTextColor),
        Triple("other", "Other", CategoryOtherColor)
    )

    val safeTotal = totalBytes.coerceAtLeast(1L)
    val activeBreakdown = categories.mapNotNull { (key, name, color) ->
        val data = breakdown?.get(key)
        if (data != null && data.size > 0L) {
            Triple(name, color, data.size)
        } else null
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        // Bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            if (activeBreakdown.isNotEmpty()) {
                Row(modifier = Modifier.fillMaxSize()) {
                    activeBreakdown.forEach { (_, color, size) ->
                        val weight = (size.toFloat() / safeTotal.toFloat()).coerceAtLeast(0.005f)
                        Box(
                            modifier = Modifier
                                .weight(weight)
                                .fillMaxHeight()
                                .background(color)
                        )
                    }
                    val remainingWeight = ((safeTotal - usedBytes).toFloat() / safeTotal.toFloat()).coerceAtLeast(0f)
                    if (remainingWeight > 0f) {
                        Box(
                            modifier = Modifier
                                .weight(remainingWeight)
                                .fillMaxHeight()
                                .background(Color.Transparent)
                        )
                    }
                }
            } else {
                // Fallback single fill
                val ratio = (usedBytes.toFloat() / safeTotal.toFloat()).coerceIn(0f, 1f)
                val animatedRatio by animateFloatAsState(
                    targetValue = ratio,
                    animationSpec = tween(600, easing = FastOutSlowInEasing),
                    label = "singleRatio"
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth(animatedRatio)
                        .fillMaxHeight()
                        .background(GoogleBlue)
                )
            }
        }

        // Legend chips row
        if (activeBreakdown.isNotEmpty()) {
            Spacer(modifier = Modifier.height(Dimens.Spacing8))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                activeBreakdown.take(4).forEach { (name, color, size) ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(color)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "$name: ${FileUtils.formatBytes(size)}",
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

// Storage Mode Segmented Button Control
@Composable
private fun StorageModeSegmentedControl(
    currentMode: String,
    googleConfigured: Boolean,
    isAdmin: Boolean,
    onModeSelect: (String) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(Dimens.RadiusMedium),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(3.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Google Mode Button
            val isGoogle = currentMode == "google" || currentMode == "gdrive"
            Surface(
                onClick = { if (isAdmin && googleConfigured) onModeSelect("google") },
                enabled = isAdmin && googleConfigured,
                shape = RoundedCornerShape(Dimens.RadiusSmall),
                color = if (isGoogle) MaterialTheme.colorScheme.surface else Color.Transparent,
                shadowElevation = if (isGoogle) 2.dp else 0.dp,
                modifier = Modifier
                    .weight(1f)
                    .bounceClick(scaleDown = 0.97f) {
                        if (isAdmin && googleConfigured) onModeSelect("google")
                    }
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    GoogleGLogo(size = 14.dp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Google Drive Pool",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = if (isGoogle) FontWeight.Bold else FontWeight.Medium
                        ),
                        color = if (isGoogle) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Local Mode Button
            val isLocal = currentMode == "local"
            Surface(
                onClick = { if (isAdmin) onModeSelect("local") },
                enabled = isAdmin,
                shape = RoundedCornerShape(Dimens.RadiusSmall),
                color = if (isLocal) MaterialTheme.colorScheme.surface else Color.Transparent,
                shadowElevation = if (isLocal) 2.dp else 0.dp,
                modifier = Modifier
                    .weight(1f)
                    .bounceClick(scaleDown = 0.97f) {
                        if (isAdmin) onModeSelect("local")
                    }
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Storage,
                        contentDescription = null,
                        tint = if (isLocal) MintPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Local Storage",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = if (isLocal) FontWeight.Bold else FontWeight.Medium
                        ),
                        color = if (isLocal) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// =============================================================================
// CONNECTED GOOGLE DRIVE ACCOUNT CARD (Concept Screenshot 2)
// =============================================================================
@Composable
private fun GoogleAccountCard(
    account: StorageAccount,
    members: List<FamilyMember>,
    isAdmin: Boolean,
    currentUser: User? = null,
    onRename: () -> Unit,
    onAssign: () -> Unit,
    onReauth: () -> Unit,
    onDisconnect: () -> Unit,
    onDelete: () -> Unit
) {
    val isOwner = (account.userId != null && account.userId == currentUser?.id) ||
        (account.email != null && currentUser?.email != null && account.email.equals(currentUser.email, ignoreCase = true))
    val canManage = isAdmin || isOwner

    val quotaTotal = account.cachedQuotaTotal ?: 0L
    val quotaUsed = account.cachedQuotaUsed ?: 0L
    val percentUsed = if (quotaTotal > 0L) {
        ((quotaUsed.toFloat() / quotaTotal.toFloat()) * 100f).toInt().coerceIn(0, 100)
    } else 0

    val animatedQuota by animateFloatAsState(
        targetValue = if (quotaTotal > 0L) (quotaUsed.toFloat() / quotaTotal.toFloat()).coerceIn(0f, 1f) else 0f,
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "accountQuotaAnim"
    )

    // Match assigned member
    val assignedMember = members.find {
        (account.userId != null && it.userId == account.userId) ||
        (account.email != null && it.email?.equals(account.email, ignoreCase = true) == true)
    }
    val memberDisplayName = assignedMember?.username ?: account.memberUsername
    val memberDisplayRole = assignedMember?.role ?: account.memberRole ?: "member"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                Dimens.BorderThin,
                MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                RoundedCornerShape(Dimens.RadiusLarge)
            ),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(Dimens.Spacing16)) {
            // Header Row: Google Icon + Email + Nickname Badge + Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(GoogleBlue.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        GoogleGLogo(size = 18.dp)
                    }

                    Spacer(modifier = Modifier.width(Dimens.Spacing10))

                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = account.email ?: account.label ?: "Google Account",
                                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )

                            if (!account.label.isNullOrBlank()) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = GoogleBlue.copy(alpha = 0.12f)
                                ) {
                                    Text(
                                        text = account.label,
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold
                                        ),
                                        color = GoogleBlue,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            if (isOwner) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = MintPrimary.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "You",
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        ),
                                        color = MintPrimary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(3.dp))

                        // Member Attribution Chip
                        if (!memberDisplayName.isNullOrBlank()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(Dimens.RadiusSmall))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                val initial = memberDisplayName.take(1).uppercase()
                                Box(
                                    modifier = Modifier
                                        .size(15.dp)
                                        .clip(CircleShape)
                                        .background(GoogleBlue),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = initial,
                                        color = Color.White,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "$memberDisplayName ($memberDisplayRole)",
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, fontWeight = FontWeight.Medium),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(Dimens.RadiusSmall))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                Icon(
                                    Icons.Default.PersonOutline,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Unassigned",
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.width(Dimens.Spacing8))

                // Status Badge
                when (account.status) {
                    "active" -> {
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = BrandSuccess.copy(alpha = 0.15f)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = BrandSuccess,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(3.dp))
                                Text(
                                    text = "Active",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = BrandSuccess
                                )
                            }
                        }
                    }
                    "disconnecting" -> {
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = BrandWarning.copy(alpha = 0.15f)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(10.dp),
                                    strokeWidth = 1.5.dp,
                                    color = BrandWarning
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Disconnecting...",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = BrandWarning
                                )
                            }
                        }
                    }
                    "error" -> {
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = BrandError.copy(alpha = 0.15f)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                            ) {
                                Icon(
                                    Icons.Default.ErrorOutline,
                                    contentDescription = null,
                                    tint = BrandError,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(3.dp))
                                Text(
                                    text = "Re-auth",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = BrandError
                                )
                            }
                        }
                    }
                    else -> {
                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "Disconnected",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing10))

            // Quota Info Text & Linear Bar
            val quotaText = if (quotaTotal > 0L) {
                "Used ${FileUtils.formatBytes(quotaUsed)} of ${FileUtils.formatBytes(quotaTotal)} ($percentUsed%)"
            } else {
                "Workspace Account (Unlimited Capacity)"
            }

            Text(
                text = quotaText,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing4))

            LinearProgressIndicator(
                progress = { animatedQuota },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (animatedQuota > 0.9f) BrandError else BrandSuccess,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            // Alert Banners (if disconnecting or error)
            if (account.status == "disconnecting") {
                Spacer(modifier = Modifier.height(Dimens.Spacing8))
                Surface(
                    shape = RoundedCornerShape(Dimens.RadiusSmall),
                    color = BrandWarning.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, BrandWarning.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Sync,
                            contentDescription = null,
                            tint = BrandWarning,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Files on this account are being migrated in the background.",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandWarning
                        )
                    }
                }
            } else if (account.status == "error") {
                Spacer(modifier = Modifier.height(Dimens.Spacing8))
                Surface(
                    shape = RoundedCornerShape(Dimens.RadiusSmall),
                    color = BrandError.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, BrandError.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = BrandError,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "OAuth token revoked or expired. Tap Re-authenticate to reconnect.",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandError
                        )
                    }
                }
            }

            // Action Buttons Row (if admin)
            if (canManage) {
                Spacer(modifier = Modifier.height(Dimens.Spacing12))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isAdmin) {
                        // Rename Button
                        OutlinedButton(
                            onClick = onRename,
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            modifier = Modifier
                                .height(32.dp)
                                .bounceClick(scaleDown = 0.95f) { onRename() }
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Rename", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }

                        // Assign Button
                        OutlinedButton(
                            onClick = onAssign,
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            modifier = Modifier
                                .height(32.dp)
                                .bounceClick(scaleDown = 0.95f) { onAssign() }
                        ) {
                            Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Assign", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // Re-auth button if error
                    if (account.status == "error") {
                        Button(
                            onClick = onReauth,
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                            modifier = Modifier
                                .height(32.dp)
                                .bounceClick(scaleDown = 0.95f) { onReauth() }
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Re-auth", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Disconnect Button if active (both admin and owner can disconnect)
                    if (account.status == "active") {
                        Button(
                            onClick = onDisconnect,
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = BrandError.copy(alpha = 0.12f),
                                contentColor = BrandError
                            ),
                            modifier = Modifier
                                .height(32.dp)
                                .bounceClick(scaleDown = 0.95f) { onDisconnect() }
                        ) {
                            Icon(Icons.Default.LinkOff, contentDescription = null, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isOwner && !isAdmin) "Disconnect My Drive" else "Disconnect", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Remove Button if disconnected (admin only)
                    if (isAdmin && account.status == "disconnected") {
                        Button(
                            onClick = onDelete,
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = BrandError.copy(alpha = 0.15f),
                                contentColor = BrandError
                            ),
                            modifier = Modifier
                                .height(32.dp)
                                .bounceClick(scaleDown = 0.95f) { onDelete() }
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Remove", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// Empty State Card for Google Drives
@Composable
private fun MemberStorageSelfServiceCard(
    currentUser: User?,
    myAccount: StorageAccount?,
    onConnectClick: () -> Unit,
    onDisconnectClick: () -> Unit,
    onReauthClick: () -> Unit
) {
    val hasConnected = myAccount != null && myAccount.status == "active"
    val isError = myAccount != null && myAccount.status == "error"

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .staggeredEntrance(index = 0),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        color = if (hasConnected) MaterialTheme.colorScheme.surface else GoogleBlue.copy(alpha = 0.08f),
        border = BorderStroke(
            1.dp,
            if (hasConnected) MintPrimary.copy(alpha = 0.35f) else GoogleBlue.copy(alpha = 0.3f)
        )
    ) {
        Column(
            modifier = Modifier.padding(Dimens.Spacing16)
        ) {
            if (hasConnected) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f).padding(end = 8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(GoogleGreen.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = GoogleGreen,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(Dimens.Spacing10))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = myAccount?.label ?: "Your Connected Google Drive",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(Dimens.RadiusSmall),
                                    color = GoogleGreen.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "+15 GB Active",
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 10.sp,
                                            color = GoogleGreen
                                        ),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = "Account: ${myAccount?.email ?: currentUser?.email ?: "—"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    OutlinedButton(
                        onClick = onDisconnectClick,
                        shape = RoundedCornerShape(Dimens.RadiusSmall),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandError),
                        border = BorderStroke(1.dp, BrandError.copy(alpha = 0.5f)),
                        modifier = Modifier
                            .height(32.dp)
                            .bounceClick(scaleDown = 0.95f) { onDisconnectClick() }
                    ) {
                        Icon(Icons.Default.LinkOff, contentDescription = null, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Disconnect", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            } else if (isError) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = BrandError, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Connection Needs Re-auth", fontWeight = FontWeight.Bold, color = BrandError)
                        }
                        Text("Your Google Drive token expired. Please re-authenticate.", style = MaterialTheme.typography.bodySmall)
                    }
                    Button(
                        onClick = onReauthClick,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                        modifier = Modifier.bounceClick(scaleDown = 0.95f) { onReauthClick() }
                    ) {
                        Text("Re-auth", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            GoogleGLogo(size = 18.dp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Boost Family Vault Storage",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Link your personal Google Drive account on this device to pool +15 GB of cloud storage into your family vault.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Button(
                        onClick = onConnectClick,
                        shape = RoundedCornerShape(Dimens.RadiusMedium),
                        colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue, contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                        modifier = Modifier.bounceClick(scaleDown = 0.94f) { onConnectClick() }
                    ) {
                        GoogleGLogo(size = 14.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Connect Drive", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyGoogleDrivesCard(
    isAdmin: Boolean,
    onConnectClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .staggeredEntrance(index = 2),
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.35f))
    ) {
        Column(
            modifier = Modifier.padding(Dimens.Spacing24),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(GoogleBlue.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                GoogleGLogo(size = 24.dp)
            }

            Spacer(modifier = Modifier.height(Dimens.Spacing12))

            Text(
                text = "No Google Drives Connected",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing4))

            Text(
                text = "Link your Google Drive account to expand your vault capacity with pooled multi-account cloud storage.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(Dimens.Spacing16))
            Button(
                onClick = onConnectClick,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue, contentColor = Color.White),
                modifier = Modifier.bounceClick(scaleDown = 0.95f) { onConnectClick() }
            ) {
                GoogleGLogo(size = 14.dp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(if (isAdmin) "Connect First Drive" else "Connect Google Drive (+15 GB)", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// =============================================================================
// FAMILY STORAGE CONTRIBUTOR ROSTER ITEM (Concept Screenshots 3 & 4)
// =============================================================================
@Composable
private fun ContributorRosterItem(
    member: FamilyMember,
    isConnected: Boolean,
    totalCapacityBytes: Long?
) {
    val username = member.username ?: "Member"
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                Dimens.BorderThin,
                MaterialTheme.colorScheme.outline.copy(alpha = 0.25f),
                RoundedCornerShape(Dimens.RadiusMedium)
            ),
        shape = RoundedCornerShape(Dimens.RadiusMedium),
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = Dimens.Spacing14, vertical = Dimens.Spacing10),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                val initial = username.take(1).uppercase()
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(if (isConnected) GoogleBlue else MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initial,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = if (isConnected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.width(Dimens.Spacing10))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = username,
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        if (member.role.equals("admin", ignoreCase = true)) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.Star,
                                contentDescription = "Admin",
                                tint = BrandAccent,
                                modifier = Modifier.size(13.dp)
                            )
                        }
                    }
                    Text(
                        text = member.email ?: "No email registered",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.width(Dimens.Spacing8))

            if (isConnected && totalCapacityBytes != null) {
                Surface(
                    shape = RoundedCornerShape(Dimens.RadiusSmall),
                    color = BrandSuccess.copy(alpha = 0.15f)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        GoogleGLogo(size = 12.dp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = FileUtils.formatBytes(totalCapacityBytes),
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = BrandSuccess
                        )
                    }
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(Dimens.RadiusSmall),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        text = "Shared Pool",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}

// =============================================================================
// DIALOGS IMPLEMENTATION
// =============================================================================

// 1. Rename Drive Nickname Dialog
@Composable
private fun RenameDriveDialog(
    currentLabel: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var label by remember { mutableStateOf(currentLabel) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename Storage Drive", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text(
                    text = "Enter a nickname or alias for this Google Drive (e.g., Akshay's Drive, Dad):",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    placeholder = { Text("Drive Nickname") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(label.trim()) },
                shape = RoundedCornerShape(Dimens.RadiusMedium)
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

// 2. Assign Member Dialog
@Composable
private fun AssignMemberDialog(
    currentUserId: Int?,
    members: List<FamilyMember>,
    onDismiss: () -> Unit,
    onAssign: (Int?) -> Unit
) {
    var selectedId by remember { mutableStateOf(currentUserId) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Assign Drive to Member", fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                item {
                    Text(
                        text = "Select which family member owns this Google Drive:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                }

                // Unassigned Option
                item {
                    Surface(
                        onClick = { selectedId = null },
                        shape = RoundedCornerShape(Dimens.RadiusSmall),
                        color = if (selectedId == null || selectedId == 0) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(
                            1.dp,
                            if (selectedId == null || selectedId == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedId == null || selectedId == 0,
                                onClick = { selectedId = null }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Unassigned (No specific member)",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
                            )
                        }
                    }
                }

                // Family Member Options
                items(members) { m ->
                    val isSelected = selectedId == m.userId
                    val memberName = m.username ?: "Member"
                    Surface(
                        onClick = { selectedId = m.userId },
                        shape = RoundedCornerShape(Dimens.RadiusSmall),
                        color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = isSelected,
                                onClick = { selectedId = m.userId }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "$memberName (${m.role})",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
                                )
                                if (!m.email.isNullOrBlank()) {
                                    Text(
                                        text = m.email,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onAssign(selectedId) },
                shape = RoundedCornerShape(Dimens.RadiusMedium)
            ) {
                Text("Confirm Assignment")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

// =============================================================================
// VECTOR GOOGLE 'G' ICON
// =============================================================================
@Composable
fun GoogleGLogo(size: Dp, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "G",
            color = GoogleBlue,
            fontWeight = FontWeight.ExtraBold,
            fontFamily = FontFamily.SansSerif,
            fontSize = (size.value * 0.85f).sp
        )
    }
}
