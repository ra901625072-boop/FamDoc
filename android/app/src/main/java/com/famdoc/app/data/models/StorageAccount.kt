package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class StorageAccount(
    @SerializedName("id") val id: Int,
    @SerializedName("family_id") val familyId: String,
    @SerializedName("provider") val provider: String = "google",
    @SerializedName("email") val email: String? = null,
    @SerializedName("label") val label: String? = null,
    @SerializedName("status") val status: String = "active",
    @SerializedName("priority") val priority: Int = 0,
    @SerializedName("cached_quota_total") val cachedQuotaTotal: Long? = null,
    @SerializedName("cached_quota_used") val cachedQuotaUsed: Long? = null,
    @SerializedName("quota_checked_at") val quotaCheckedAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("member_username") val memberUsername: String? = null,
    @SerializedName("member_email") val memberEmail: String? = null,
    @SerializedName("member_role") val memberRole: String? = null
)

data class StorageConfigResponse(
    @SerializedName("storage_provider") val storageProvider: String = "local",
    @SerializedName("accounts") val accounts: List<StorageAccount> = emptyList(),
    @SerializedName("total_capacity_bytes") val totalCapacityBytes: Long? = null,
    @SerializedName("total_used_bytes") val totalUsedBytes: Long? = null,
    @SerializedName("is_configured") val isConfigured: Boolean = false,
    @SerializedName("google_configured") val googleConfigured: Boolean = false,
    @SerializedName("client_id") val clientId: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("folder_id") val folderId: String? = null
)

data class GoogleOAuthUrlResponse(
    @SerializedName("url") val authUrl: String
)
