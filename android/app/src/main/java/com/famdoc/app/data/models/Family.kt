package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class Family(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("admin_id") val adminId: Int,
    @SerializedName("max_members") val maxMembers: Int = 10,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("storage_provider") val storageProvider: String? = "local",
    @SerializedName("storage_quota_bytes") val storageQuotaBytes: Long = 524288000L
)

data class FamilyMember(
    @SerializedName("id") val id: Int,
    @SerializedName("family_id") val familyId: String,
    @SerializedName("user_id") val userId: Int,
    @SerializedName("role") val role: String = "member",
    @SerializedName("username") val username: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("joined_at") val joinedAt: String? = null,
    @SerializedName("storage_contributed_bytes") val storageContributedBytes: Long? = 0L,
    @SerializedName("storage_connected") val storageConnected: Boolean? = false,
    @SerializedName("storage_account_email") val storageAccountEmail: String? = null
) {
    val isAdmin: Boolean get() = role.equals("admin", ignoreCase = true)
}

data class FamilyDetailsResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("admin_id") val adminId: Int? = null,
    @SerializedName("secret_code") val secretCode: String? = null,
    @SerializedName("max_members") val maxMembers: Int = 10,
    @SerializedName("member_count") val memberCount: Int? = null,
    @SerializedName("storage_quota_bytes") val storageQuotaBytes: Long? = 524288000L,
    @SerializedName("storage_used_bytes") val storageUsedBytes: Long? = 0L,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("expires_at") val expiresAt: String? = null
)

data class RegenerateCodeResponse(
    @SerializedName("family_id") val familyId: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("secret_code") val secretCode: String,
    @SerializedName("max_members") val maxMembers: Int? = null,
    @SerializedName("message") val message: String? = null
)
