package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class RegisterRequest(
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class FamilyLoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("secret_code") val secretCode: String,
    @SerializedName("password") val password: String
)

data class UpdateProfileRequest(
    @SerializedName("username") val username: String? = null,
    @SerializedName("password") val password: String? = null
)

data class ForgotPasswordRequest(
    @SerializedName("email") val email: String
)

data class VerifyResetOTPRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp_code") val otpCode: String
)

data class ConfirmResetPasswordRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp_code") val otpCode: String,
    @SerializedName("new_password") val newPassword: String
)

data class CreateFolderRequest(
    @SerializedName("name") val name: String,
    @SerializedName("parent_id") val parentId: Int? = null
)

data class RenameFolderRequest(
    @SerializedName("name") val name: String
)

data class MoveFolderRequest(
    @SerializedName("parent_id") val parentId: Int? = null
)

data class RenameFileRequest(
    @SerializedName("filename") val filename: String
)

data class MoveFileRequest(
    @SerializedName("folder_id") val folderId: Int? = null
)

data class CreateShareLinkRequest(
    @SerializedName("password") val password: String? = null,
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("max_downloads") val maxDownloads: Int? = null
)

data class DownloadSharedFileRequest(
    @SerializedName("password") val password: String? = null
)

data class UpdateStorageModeRequest(
    @SerializedName("storage_provider") val storageProvider: String
)

data class GoogleOAuthUrlRequest(
    @SerializedName("client_id") val clientId: String? = null,
    @SerializedName("client_secret") val clientSecret: String? = null,
    @SerializedName("action") val action: String = "connect"
)

data class SetupFamilyRequest(
    @SerializedName("name") val name: String,
    @SerializedName("max_members") val maxMembers: Int = 10
)

data class ApiResponse(
    @SerializedName("message") val message: String? = null,
    @SerializedName("detail") val detail: Any? = null,
    @SerializedName("status") val status: String? = null
)

data class PreviewTokenResponse(
    @SerializedName("token") val token: String
)

data class UpdateStorageAccountRequest(
    @SerializedName("label") val label: String? = null,
    @SerializedName("priority") val priority: Int? = null,
    @SerializedName("user_id") val userId: Int? = null
)
