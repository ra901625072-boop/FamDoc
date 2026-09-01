package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class FolderItem(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("parent_id") val parentId: Int? = null,
    @SerializedName("family_id") val familyId: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("deleted_at") val deletedAt: String? = null,
    @SerializedName("file_count") val fileCount: Int = 0,
    @SerializedName("total_size") val totalSize: Long = 0L,
    @SerializedName("last_modified_file") val lastModifiedFile: String? = null
)
