package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class DashboardStats(
    @SerializedName("total_files") val totalFiles: Int = 0,
    @SerializedName("total_folders") val totalFolders: Int = 0,
    @SerializedName("total_size_bytes") val totalSizeBytes: Long = 0L,
    @SerializedName("total_members") val totalMembers: Int = 1,
    @SerializedName("storage_provider") val storageProvider: String = "local",
    @SerializedName("storage_quota_bytes") val storageQuotaBytes: Long = 524288000L,
    @SerializedName("storage_breakdown") val storageBreakdown: Map<String, CategoryUsage>? = null,
    @SerializedName("recent_uploads") val recentUploads: List<FileItem> = emptyList(),
    @SerializedName("recent_activity") val recentActivity: List<ActivityLogItem> = emptyList()
)

data class CategoryUsage(
    @SerializedName("size") val size: Long = 0L,
    @SerializedName("count") val count: Int = 0
)

data class ActivityLogItem(
    @SerializedName("id") val id: Int,
    @SerializedName("action") val action: String,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("user_id") val userId: Int?,
    @SerializedName("user_email") val userEmail: String?,
    @SerializedName("username") val username: String?,
    @SerializedName("details") val details: String?
)
