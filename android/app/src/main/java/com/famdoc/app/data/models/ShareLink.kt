package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class ShareLink(
    @SerializedName("token") val token: String,
    @SerializedName("file_id") val fileId: Int,
    @SerializedName("share_link") val shareLink: String,
    @SerializedName("is_password_protected") val isPasswordProtected: Boolean = false,
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("max_downloads") val maxDownloads: Int? = null,
    @SerializedName("download_count") val downloadCount: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
)

data class PublicShareInfo(
    @SerializedName("token") val token: String,
    @SerializedName("filename") val filename: String,
    @SerializedName("file_type") val fileType: String,
    @SerializedName("size_bytes") val sizeBytes: Long,
    @SerializedName("requires_password") val requiresPassword: Boolean = false,
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)
