package com.famdoc.app.ui.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Landing : Screen("landing")
    object Login : Screen("login")
    object Register : Screen("register")
    object JoinFamily : Screen("join_family")
    object ForgotPassword : Screen("forgot_password")
    object Dashboard : Screen("dashboard")
    object Vault : Screen("vault")
    object FilePreview : Screen("file_preview/{fileId}/{filename}/{fileType}") {
        fun createRoute(fileId: Int, filename: String, fileType: String): String {
            return "file_preview/$fileId/${java.net.URLEncoder.encode(filename, "UTF-8")}/${java.net.URLEncoder.encode(fileType, "UTF-8")}"
        }
    }
    object Trash : Screen("trash")
    object Family : Screen("family")
    object Storage : Screen("storage")
    object Profile : Screen("profile")
    object PublicShare : Screen("public_share/{token}") {
        fun createRoute(token: String): String = "public_share/$token"
    }
}
