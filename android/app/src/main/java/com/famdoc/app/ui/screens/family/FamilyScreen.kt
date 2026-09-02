package com.famdoc.app.ui.screens.family

import android.content.Intent
import androidx.compose.animation.*
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.core.utils.DateFormatter
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.FamilyMember
import com.famdoc.app.data.models.User
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.animation.rotatingRefresh
import com.famdoc.app.ui.animation.staggeredEntrance
import com.famdoc.app.ui.components.*
import com.famdoc.app.ui.screens.storage.GoogleGLogo
import com.famdoc.app.ui.theme.*
import com.famdoc.app.ui.viewmodel.FamilyViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Google Brand Blue
private val GoogleBlue = Color(0xFF4285F4)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyScreen(
    familyViewModel: FamilyViewModel,
    currentUser: User?,
    serverStatus: ServerStatus,
    isOffline: Boolean,
    onOpenDrawer: () -> Unit,
    onNavigateToStorage: () -> Unit = {}
) {
    val context = LocalContext.current
    val membersState by familyViewModel.membersState.collectAsState()
    val familyDetailsState by familyViewModel.familyDetailsState.collectAsState()
    val generatedSecretCode by familyViewModel.generatedSecretCode.collectAsState()
    val actionMessage by familyViewModel.actionMessage.collectAsState()

    val clipboardManager = LocalClipboardManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val isAdmin = currentUser?.role?.equals("admin", ignoreCase = true) == true

    var memberToRemove by remember { mutableStateOf<FamilyMember?>(null) }
    var showCodeWizardDialog by remember { mutableStateOf(false) }
    var codeCopiedAnimation by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        familyViewModel.loadFamilyData()
    }

    LaunchedEffect(actionMessage) {
        actionMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            familyViewModel.clearActionMessage()
        }
    }

    val members = (membersState as? Resource.Success)?.data ?: emptyList()
    val details = (familyDetailsState as? Resource.Success)?.data

    Scaffold(
        topBar = {
            FamDocAppBar(
                title = "Family Group",
                subtitle = "Manage members and vault access",
                navigationIcon = Icons.Default.Menu,
                onNavigationClick = onOpenDrawer,
                actions = {
                    val isFamilyLoading = membersState is Resource.Loading || familyDetailsState is Resource.Loading
                    IconButton(
                        onClick = { familyViewModel.loadFamilyData() },
                        modifier = Modifier.bounceClick(scaleDown = 0.9f) { familyViewModel.loadFamilyData() }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.rotatingRefresh(isRotating = isFamilyLoading)
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
                // 1. VAULT CAPACITY & INVITATION CARD
                item {
                    val activeCode = generatedSecretCode ?: details?.secretCode
                    val vaultName = details?.name ?: "Family Vault"
                    val currentMemberCount = if (members.isNotEmpty()) members.size else (details?.memberCount ?: 1)
                    val maxLimit = details?.maxMembers ?: 10

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 0)
                            .border(
                                1.5.dp,
                                Brush.linearGradient(listOf(BrandAccent, BrandAccentLight)),
                                RoundedCornerShape(Dimens.RadiusLarge)
                            ),
                        shape = RoundedCornerShape(Dimens.RadiusLarge),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                    ) {
                        Column(modifier = Modifier.padding(Dimens.Spacing18)) {
                            // Header Row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = vaultName,
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold)
                                    )
                                    Spacer(modifier = Modifier.height(Dimens.Spacing2))
                                    Text(
                                        text = "Capacity: $currentMemberCount / $maxLimit members",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(
                                            Brush.linearGradient(
                                                listOf(MintSecondary, MintPrimaryLight)
                                            )
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Groups,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(Dimens.Spacing14))

                            // Secret Code Section for Admin or Active Code Display
                            if (activeCode != null) {
                                Surface(
                                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .bounceClick(scaleDown = 0.97f) {
                                            clipboardManager.setText(AnnotatedString(activeCode))
                                            codeCopiedAnimation = true
                                            scope.launch {
                                                delay(1800)
                                                codeCopiedAnimation = false
                                            }
                                        }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(Dimens.Spacing14),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text(
                                                text = "FAMILY INVITATION CODE",
                                                style = MaterialTheme.typography.labelSmall.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    letterSpacing = 1.sp,
                                                    fontSize = 10.sp
                                                ),
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                            Spacer(modifier = Modifier.height(Dimens.Spacing4))
                                            Text(
                                                text = activeCode,
                                                style = MaterialTheme.typography.titleLarge.copy(
                                                    fontFamily = FontFamily.Monospace,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    letterSpacing = 3.sp,
                                                    fontSize = 20.sp
                                                ),
                                                color = MintPrimary
                                            )
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            AnimatedContent(
                                                targetState = codeCopiedAnimation,
                                                label = "copyCheck"
                                            ) { isCopied ->
                                                if (isCopied) {
                                                    Surface(
                                                        shape = RoundedCornerShape(Dimens.RadiusSmall),
                                                        color = BrandSuccess.copy(alpha = 0.15f)
                                                    ) {
                                                        Row(
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Icon(
                                                                Icons.Default.Check,
                                                                contentDescription = "Copied",
                                                                tint = BrandSuccess,
                                                                modifier = Modifier.size(16.dp)
                                                            )
                                                            Spacer(modifier = Modifier.width(4.dp))
                                                            Text(
                                                                "Copied!",
                                                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                                                color = BrandSuccess
                                                            )
                                                        }
                                                    }
                                                } else {
                                                    IconButton(onClick = {
                                                        clipboardManager.setText(AnnotatedString(activeCode))
                                                        codeCopiedAnimation = true
                                                        scope.launch {
                                                            delay(1800)
                                                            codeCopiedAnimation = false
                                                        }
                                                    }) {
                                                        Icon(
                                                            imageVector = Icons.Default.ContentCopy,
                                                            contentDescription = "Copy code",
                                                            tint = MintPrimary,
                                                            modifier = Modifier.size(20.dp)
                                                        )
                                                    }
                                                }
                                            }

                                            // Share Intent Button
                                            IconButton(onClick = {
                                                val sendIntent = Intent().apply {
                                                    action = Intent.ACTION_SEND
                                                    putExtra(Intent.EXTRA_TEXT, "Join our family vault on FamDoc! Use Invitation Code: $activeCode")
                                                    type = "text/plain"
                                                }
                                                val shareIntent = Intent.createChooser(sendIntent, "Share Family Invitation Code")
                                                context.startActivity(shareIntent)
                                            }) {
                                                Icon(
                                                    Icons.Default.Share,
                                                    contentDescription = "Share Code",
                                                    tint = MintPrimary,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                        }
                                    }
                                }

                                if (isAdmin) {
                                    Spacer(modifier = Modifier.height(Dimens.Spacing10))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.End
                                    ) {
                                        TextButton(
                                            onClick = { showCodeWizardDialog = true },
                                            modifier = Modifier.bounceClick(scaleDown = 0.95f) { showCodeWizardDialog = true }
                                        ) {
                                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(15.dp))
                                            Spacer(modifier = Modifier.width(5.dp))
                                            Text("Regenerate Code", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                                        }
                                    }
                                }
                            } else if (isAdmin) {
                                // Code generation button for admin if not generated in current session
                                Button(
                                    onClick = { showCodeWizardDialog = true },
                                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                                    colors = ButtonDefaults.buttonColors(containerColor = MintPrimary),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .bounceClick(scaleDown = 0.96f) { showCodeWizardDialog = true }
                                ) {
                                    Icon(Icons.Default.Key, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Generate Family Invitation Code", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                // 2. FAMILY CLOUD STORAGE POOL OVERVIEW BANNER (Matching Web design)
                item {
                    val contributingMembers = members.filter { it.storageConnected == true }
                    val contributingCount = contributingMembers.size
                    val totalPooledBytes = contributingMembers.sumOf { it.storageContributedBytes ?: 0L }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 1),
                        shape = RoundedCornerShape(Dimens.RadiusLarge),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(Dimens.Spacing14),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
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
                                    Text(
                                        text = "Family Cloud Storage Pool",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                    )
                                    Text(
                                        text = if (contributingCount > 0) {
                                            "$contributingCount of ${members.size} contributing (${FileUtils.formatBytes(totalPooledBytes)})"
                                        } else {
                                            "No Google Drives linked yet"
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            OutlinedButton(
                                onClick = onNavigateToStorage,
                                shape = RoundedCornerShape(Dimens.RadiusSmall),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                modifier = Modifier.bounceClick(scaleDown = 0.95f) { onNavigateToStorage() }
                            ) {
                                Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(13.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Storage", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // 3. FAMILY ROSTER SECTION HEADER
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .staggeredEntrance(index = 2),
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
                                text = "Family Roster",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                        }

                        Surface(
                            shape = RoundedCornerShape(Dimens.RadiusSmall),
                            color = MintSecondaryContainer.copy(alpha = 0.7f)
                        ) {
                            Text(
                                text = "${members.size} Active Member${if (members.size == 1) "" else "s"}",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = MintPrimaryDark,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }

                // Member items
                if (membersState is Resource.Loading && members.isEmpty()) {
                    item { LoadingSkeletonView(itemCount = 3) }
                } else if (members.isEmpty()) {
                    item {
                        EmptyStateView(
                            title = "No Family Members Found",
                            subtitle = "Use your invitation code to invite family members into your vault.",
                            actionButtonText = if (isAdmin) "Generate Code" else null,
                            onActionClick = { showCodeWizardDialog = true }
                        )
                    }
                } else {
                    items(
                        items = members,
                        key = { "member_${it.id}_${it.userId}" }
                    ) { member ->
                        val isSelf = member.userId == currentUser?.id
                        FamilyMemberRosterCard(
                            member = member,
                            isSelf = isSelf,
                            isAdmin = isAdmin,
                            onRemove = { memberToRemove = member }
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(Dimens.Spacing24)) }
            }
        }

        // =========================================================================
        // DIALOGS
        // =========================================================================

        // 1. Family Secret Code Setup / Regeneration Wizard Dialog
        if (showCodeWizardDialog) {
            FamilyCodeWizardDialog(
                initialName = details?.name ?: "Family Vault",
                initialMaxMembers = details?.maxMembers ?: 10,
                onDismiss = { showCodeWizardDialog = false },
                onConfirm = { name, maxMembers ->
                    showCodeWizardDialog = false
                    familyViewModel.regenerateCode(name, maxMembers)
                }
            )
        }

        // 2. Remove Member Confirmation Dialog
        memberToRemove?.let { m ->
            val memberName = m.username ?: "this member"
            ConfirmDialog(
                title = "Remove Family Member",
                message = "Are you sure you want to remove \"$memberName\" from the family vault? They will immediately lose access to all shared family files.",
                confirmText = "Remove Member",
                isDestructive = true,
                onConfirm = {
                    familyViewModel.removeMember(m.userId)
                    memberToRemove = null
                },
                onDismiss = { memberToRemove = null }
            )
        }
    }
}

// =============================================================================
// FAMILY MEMBER ROSTER CARD
// =============================================================================
@Composable
private fun FamilyMemberRosterCard(
    member: FamilyMember,
    isSelf: Boolean,
    isAdmin: Boolean,
    onRemove: () -> Unit
) {
    val username = member.username ?: "Member"
    val initial = username.take(1).uppercase()
    val isMemberAdmin = member.role.equals("admin", ignoreCase = true)
    val hasStorage = member.storageConnected == true

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                Dimens.BorderThin,
                MaterialTheme.colorScheme.outline.copy(alpha = 0.25f),
                RoundedCornerShape(Dimens.RadiusMedium)
            ),
        shape = RoundedCornerShape(Dimens.RadiusMedium),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = Dimens.Spacing14, vertical = Dimens.Spacing12),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Initial Avatar Circle
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(if (hasStorage) GoogleBlue else MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initial,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = if (hasStorage) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.width(Dimens.Spacing10))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = username,
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold)
                        )

                        if (isMemberAdmin) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.Star,
                                contentDescription = "Admin",
                                tint = BrandAccent,
                                modifier = Modifier.size(13.dp)
                            )
                        }

                        if (isSelf) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    text = "You",
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = member.email ?: "No email registered",
                        style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Monospace),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Cloud Storage & Joined Date row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Storage badge
                        if (hasStorage) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = GoogleBlue.copy(alpha = 0.12f)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                ) {
                                    GoogleGLogo(size = 10.dp)
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = FileUtils.formatBytes(member.storageContributedBytes ?: 0L),
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        ),
                                        color = GoogleBlue
                                    )
                                }
                            }
                        } else {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                            ) {
                                Text(
                                    text = "Shared Pool",
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }

                        // Joined date
                        if (!member.joinedAt.isNullOrBlank()) {
                            Text(
                                text = "• Joined ${DateFormatter.formatDateOnly(member.joinedAt)}",
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Remove Button (Admin only, cannot remove self)
            if (isAdmin && !isSelf) {
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier.bounceClick(scaleDown = 0.9f) { onRemove() }
                ) {
                    Icon(
                        Icons.Default.PersonRemove,
                        contentDescription = "Remove member",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

// =============================================================================
// FAMILY INVITATION CODE WIZARD DIALOG
// =============================================================================
@Composable
private fun FamilyCodeWizardDialog(
    initialName: String,
    initialMaxMembers: Int,
    onDismiss: () -> Unit,
    onConfirm: (String, Int) -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var maxMembersText by remember { mutableStateOf(initialMaxMembers.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Key, contentDescription = null, tint = MintPrimary, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generate Invitation Code", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Regenerating the family code invalidates previous codes and creates a new 8-character invitation token (e.g. XXXX-XXXX) for new members.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Family / Vault Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = maxMembersText,
                    onValueChange = { maxMembersText = it.filter { c -> c.isDigit() } },
                    label = { Text("Max Member Limit (2-20)") },
                    singleLine = true,
                    shape = RoundedCornerShape(Dimens.RadiusMedium),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val limit = maxMembersText.toIntOrNull()?.coerceIn(2, 20) ?: 10
                    onConfirm(name.trim(), limit)
                },
                enabled = name.isNotBlank(),
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                colors = ButtonDefaults.buttonColors(containerColor = MintPrimary)
            ) {
                Text("Generate Code", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
