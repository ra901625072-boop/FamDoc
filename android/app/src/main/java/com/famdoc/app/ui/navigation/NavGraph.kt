package com.famdoc.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.famdoc.app.FamDocApplication
import com.famdoc.app.core.network.ServerStatus
import com.famdoc.app.data.models.User
import com.famdoc.app.data.repository.*
import com.famdoc.app.ui.animation.swipeableTabNavigation
import com.famdoc.app.ui.components.FamDocBottomNav
import com.famdoc.app.ui.components.FamDocDrawer
import com.famdoc.app.ui.screens.auth.*
import com.famdoc.app.ui.screens.dashboard.DashboardScreen
import com.famdoc.app.ui.screens.family.FamilyScreen
import com.famdoc.app.ui.screens.landing.LandingScreen
import com.famdoc.app.ui.screens.profile.ProfileScreen
import com.famdoc.app.ui.screens.share.PublicShareScreen
import com.famdoc.app.ui.screens.splash.SplashScreen
import com.famdoc.app.ui.screens.storage.StorageConfigScreen
import com.famdoc.app.ui.screens.trash.RecycleBinScreen
import com.famdoc.app.ui.screens.vault.FilePreviewScreen
import com.famdoc.app.ui.screens.vault.VaultScreen
import com.famdoc.app.ui.viewmodel.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamDocNavGraph(
    navController: NavHostController = rememberNavController()
) {
    val app = FamDocApplication.instance
    val authRepo = remember { AuthRepository(app.apiClient, app.secureTokenManager) }
    val vaultRepo = remember { VaultRepository(app, app.apiClient) }
    val familyRepo = remember { FamilyRepository(app.apiClient) }
    val storageRepo = remember { StorageRepository(app.apiClient) }
    val dashboardRepo = remember { DashboardRepository(app.apiClient) }
    val recycleBinRepo = remember { RecycleBinRepository(app.apiClient) }

    val authViewModel = remember { AuthViewModel(authRepo) }
    val vaultViewModel = remember { VaultViewModel(vaultRepo) }
    val dashboardViewModel = remember { DashboardViewModel(dashboardRepo) }
    val familyViewModel = remember { FamilyViewModel(familyRepo) }
    val storageViewModel = remember { StorageViewModel(storageRepo, familyRepo, dashboardRepo) }
    val recycleBinViewModel = remember { RecycleBinViewModel(recycleBinRepo) }

    val currentUser by authViewModel.currentUser.collectAsState()
    val serverStatus by app.apiClient.wakeupHandler.serverStatus.collectAsState()
    val isConnected by app.apiClient.networkObserver.isConnected.collectAsState(initial = true)

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Listen to unauthorized 401 events globally
    LaunchedEffect(Unit) {
        app.apiClient.authInterceptor.unauthorizedEvent.collect {
            navController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    val showBottomNav = currentRoute in listOf(
        Screen.Dashboard.route,
        Screen.Vault.route,
        Screen.Family.route,
        Screen.Trash.route,
        Screen.Profile.route,
        Screen.Storage.route
    )

    val bottomNavOrder = remember {
        listOf(
            Screen.Dashboard.route,
            Screen.Vault.route,
            Screen.Family.route,
            Screen.Trash.route,
            Screen.Profile.route
        )
    }

    val handleTabNavigation: (String) -> Unit = { route ->
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = showBottomNav,
        drawerContent = {
            FamDocDrawer(
                currentUser = currentUser,
                currentRoute = currentRoute,
                onNavigate = handleTabNavigation,
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onCloseDrawer = { scope.launch { drawerState.close() } }
            )
        }
    ) {
        Scaffold(
            bottomBar = {
                if (showBottomNav) {
                    FamDocBottomNav(
                        currentRoute = currentRoute,
                        onNavigate = handleTabNavigation
                    )
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = if (showBottomNav) innerPadding.calculateBottomPadding() else 0.dp)
                    .swipeableTabNavigation(
                        currentRoute = currentRoute,
                        enabled = showBottomNav,
                        tabOrder = bottomNavOrder,
                        onNavigate = handleTabNavigation,
                        onOpenDrawer = { scope.launch { drawerState.open() } }
                    )
            ) {
                NavHost(
                    navController = navController,
                    startDestination = Screen.Splash.route,
                    enterTransition = {
                        val isDetailScreen = targetState.destination.route?.startsWith("preview/") == true ||
                                targetState.destination.route?.startsWith("share/") == true
                        val isAuthSubScreen = targetState.destination.route in listOf(
                            Screen.Register.route,
                            Screen.JoinFamily.route,
                            Screen.ForgotPassword.route
                        )
                        val fromIndex = bottomNavOrder.indexOf(initialState.destination.route)
                        val toIndex = bottomNavOrder.indexOf(targetState.destination.route)

                        if (isDetailScreen || isAuthSubScreen) {
                            slideIntoContainer(
                                AnimatedContentTransitionScope.SlideDirection.Start,
                                animationSpec = tween(300, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)
                            ) + fadeIn(animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing))
                        } else if (fromIndex != -1 && toIndex != -1 && fromIndex != toIndex) {
                            val slideDir = if (toIndex > fromIndex) {
                                AnimatedContentTransitionScope.SlideDirection.Start
                            } else {
                                AnimatedContentTransitionScope.SlideDirection.End
                            }
                            slideIntoContainer(
                                slideDir,
                                animationSpec = tween(280, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)
                            ) + fadeIn(animationSpec = tween(220, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing))
                        } else {
                            fadeIn(animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)) +
                                    scaleIn(initialScale = 0.98f, animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing))
                        }
                    },
                    exitTransition = {
                        val isDetailScreen = targetState.destination.route?.startsWith("preview/") == true
                        val fromIndex = bottomNavOrder.indexOf(initialState.destination.route)
                        val toIndex = bottomNavOrder.indexOf(targetState.destination.route)

                        if (isDetailScreen) {
                            fadeOut(animationSpec = tween(200, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)) +
                                    scaleOut(targetScale = 0.96f, animationSpec = tween(200, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                        } else if (fromIndex != -1 && toIndex != -1 && fromIndex != toIndex) {
                            val slideDir = if (toIndex > fromIndex) {
                                AnimatedContentTransitionScope.SlideDirection.Start
                            } else {
                                AnimatedContentTransitionScope.SlideDirection.End
                            }
                            slideOutOfContainer(
                                slideDir,
                                animationSpec = tween(280, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)
                            ) + fadeOut(animationSpec = tween(180, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                        } else {
                            fadeOut(animationSpec = tween(200, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                        }
                    },
                    popEnterTransition = {
                        val isDetailScreen = initialState.destination.route?.startsWith("preview/") == true ||
                                initialState.destination.route?.startsWith("share/") == true
                        val isAuthSubScreen = initialState.destination.route in listOf(
                            Screen.Register.route,
                            Screen.JoinFamily.route,
                            Screen.ForgotPassword.route
                        )
                        val fromIndex = bottomNavOrder.indexOf(initialState.destination.route)
                        val toIndex = bottomNavOrder.indexOf(targetState.destination.route)

                        if (isDetailScreen || isAuthSubScreen) {
                            slideIntoContainer(
                                AnimatedContentTransitionScope.SlideDirection.End,
                                animationSpec = tween(300, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)
                            ) + fadeIn(animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing))
                        } else if (fromIndex != -1 && toIndex != -1 && fromIndex != toIndex) {
                            val slideDir = if (toIndex > fromIndex) {
                                AnimatedContentTransitionScope.SlideDirection.Start
                            } else {
                                AnimatedContentTransitionScope.SlideDirection.End
                            }
                            slideIntoContainer(
                                slideDir,
                                animationSpec = tween(280, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)
                            ) + fadeIn(animationSpec = tween(220, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing))
                        } else {
                            fadeIn(animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing)) +
                                    scaleIn(initialScale = 0.98f, animationSpec = tween(250, easing = com.famdoc.app.ui.animation.MotionTokens.EmphasizedEasing))
                        }
                    },
                    popExitTransition = {
                        val isDetailScreen = initialState.destination.route?.startsWith("preview/") == true ||
                                initialState.destination.route?.startsWith("share/") == true
                        val isAuthSubScreen = initialState.destination.route in listOf(
                            Screen.Register.route,
                            Screen.JoinFamily.route,
                            Screen.ForgotPassword.route
                        )
                        val fromIndex = bottomNavOrder.indexOf(initialState.destination.route)
                        val toIndex = bottomNavOrder.indexOf(targetState.destination.route)

                        if (isDetailScreen || isAuthSubScreen) {
                            slideOutOfContainer(
                                AnimatedContentTransitionScope.SlideDirection.End,
                                animationSpec = tween(280, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)
                            ) + fadeOut(animationSpec = tween(200, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                        } else if (fromIndex != -1 && toIndex != -1 && fromIndex != toIndex) {
                            val slideDir = if (toIndex > fromIndex) {
                                AnimatedContentTransitionScope.SlideDirection.Start
                            } else {
                                AnimatedContentTransitionScope.SlideDirection.End
                            }
                            slideOutOfContainer(
                                slideDir,
                                animationSpec = tween(280, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing)
                            ) + fadeOut(animationSpec = tween(180, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                        } else {
                            fadeOut(animationSpec = tween(200, easing = com.famdoc.app.ui.animation.MotionTokens.AccelerateEasing))
                        }
                    }
                ) {
                    composable(Screen.Splash.route) {
                        SplashScreen(
                            isLoggedIn = authViewModel.isLoggedIn(),
                            onNavigateToDashboard = {
                                authViewModel.loadCurrentUser()
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.Splash.route) { inclusive = true }
                                }
                            },
                            onNavigateToLanding = {
                                navController.navigate(Screen.Landing.route) {
                                    popUpTo(Screen.Splash.route) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(Screen.Landing.route) {
                        LandingScreen(
                            onNavigateToLogin = { navController.navigate(Screen.Login.route) },
                            onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                            onNavigateToJoin = { navController.navigate(Screen.JoinFamily.route) }
                        )
                    }

                    composable(Screen.Login.route) {
                        LoginScreen(
                            authViewModel = authViewModel,
                            onNavigateToDashboard = {
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.Login.route) { inclusive = true }
                                }
                            },
                            onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                            onNavigateToJoin = { navController.navigate(Screen.JoinFamily.route) },
                            onNavigateToForgotPassword = { navController.navigate(Screen.ForgotPassword.route) },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Screen.Register.route) {
                        RegisterScreen(
                            authViewModel = authViewModel,
                            onNavigateToDashboard = {
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.Register.route) { inclusive = true }
                                }
                            },
                            onNavigateToLogin = { navController.navigate(Screen.Login.route) },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Screen.JoinFamily.route) {
                        JoinFamilyScreen(
                            authViewModel = authViewModel,
                            onNavigateToDashboard = {
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.JoinFamily.route) { inclusive = true }
                                }
                            },
                            onNavigateToLogin = { navController.navigate(Screen.Login.route) },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Screen.ForgotPassword.route) {
                        ForgotPasswordScreen(
                            authViewModel = authViewModel,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onNavigateBackToLogin = {
                                navController.navigate(Screen.Login.route) {
                                    popUpTo(Screen.ForgotPassword.route) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(Screen.Dashboard.route) {
                        DashboardScreen(
                            dashboardViewModel = dashboardViewModel,
                            currentUser = currentUser,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onNavigateToVault = { navController.navigate(Screen.Vault.route) },
                            onNavigateToFamily = { navController.navigate(Screen.Family.route) },
                            onNavigateToStorage = { navController.navigate(Screen.Storage.route) },
                            onNavigateToFilePreview = { id, name, type ->
                                navController.navigate(Screen.FilePreview.createRoute(id, name, type))
                            }
                        )
                    }

                    composable(Screen.Vault.route) {
                        VaultScreen(
                            vaultViewModel = vaultViewModel,
                            currentUser = currentUser,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onNavigateToFilePreview = { id, name, type ->
                                navController.navigate(Screen.FilePreview.createRoute(id, name, type))
                            }
                        )
                    }

                    composable(
                        route = Screen.FilePreview.route,
                        arguments = listOf(
                            navArgument("fileId") { type = NavType.IntType },
                            navArgument("filename") { type = NavType.StringType },
                            navArgument("fileType") { type = NavType.StringType }
                        )
                    ) { backStackEntry ->
                        val fileId = backStackEntry.arguments?.getInt("fileId") ?: 0
                        val rawFilename = backStackEntry.arguments?.getString("filename") ?: "file"
                        val rawFileType = backStackEntry.arguments?.getString("fileType") ?: ""
                        val filename = java.net.URLDecoder.decode(rawFilename, "UTF-8")
                        val fileType = java.net.URLDecoder.decode(rawFileType, "UTF-8")

                        FilePreviewScreen(
                            fileId = fileId,
                            filename = filename,
                            fileType = fileType,
                            vaultViewModel = vaultViewModel,
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Screen.Trash.route) {
                        RecycleBinScreen(
                            recycleBinViewModel = recycleBinViewModel,
                            currentUser = currentUser,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onOpenDrawer = { scope.launch { drawerState.open() } }
                        )
                    }

                    composable(Screen.Family.route) {
                        FamilyScreen(
                            familyViewModel = familyViewModel,
                            currentUser = currentUser,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onNavigateToStorage = { navController.navigate(Screen.Storage.route) }
                        )
                    }

                    composable(Screen.Storage.route) {
                        StorageConfigScreen(
                            storageViewModel = storageViewModel,
                            currentUser = currentUser,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onOpenDrawer = { scope.launch { drawerState.open() } }
                        )
                    }

                    composable(Screen.Profile.route) {
                        ProfileScreen(
                            authViewModel = authViewModel,
                            currentUser = currentUser,
                            serverStatus = serverStatus,
                            isOffline = !isConnected,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onLogout = {
                                authViewModel.logout()
                                navController.navigate(Screen.Login.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(
                        route = Screen.PublicShare.route,
                        arguments = listOf(navArgument("token") { type = NavType.StringType })
                    ) { backStackEntry ->
                        val token = backStackEntry.arguments?.getString("token") ?: ""
                        PublicShareScreen(
                            token = token,
                            onBack = { navController.popBackStack() }
                        )
                    }
                }
            }
        }
    }
}
