package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class FileItem(
    @SerializedName("id") val id: Int,
    @SerializedName("filename") val filename: String,
    @SerializedName("file_type") val fileType: String,
    @SerializedName("size_bytes") val sizeBytes: Long,
    @SerializedName("folder_id") val folderId: Int? = null,
    @SerializedName("family_id") val familyId: String? = null,
    @SerializedName("uploader_id") val uploaderId: Int? = null,
    @SerializedName("uploader_email") val uploaderEmail: String? = null,
    @SerializedName("uploader_name") val uploaderName: String? = null,
    @SerializedName("upload_date") val uploadDate: String? = null,
    @SerializedName("storage_provider") val storageProvider: String? = "local",
    @SerializedName("pending_sync") val pendingSync: Boolean = false,
    @SerializedName("preview_token") val previewToken: String? = null,
    @SerializedName("is_shared") val isShared: Boolean = false,
    @SerializedName("deleted_at") val deletedAt: String? = null
) {
    val extension: String
        get() = filename.substringAfterLast('.', "").lowercase()

    val isImage: Boolean
        get() = fileType.contains("image", ignoreCase = true) ||
                listOf("jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "heic", "heif", "tiff", "jfif").contains(extension)

    val isPdf: Boolean
        get() = fileType.contains("pdf", ignoreCase = true) || extension == "pdf"

    val isWord: Boolean
        get() = fileType.contains("word", ignoreCase = true) ||
                fileType.contains("officedocument.word", ignoreCase = true) ||
                listOf("doc", "docx").contains(extension)

    val isExcel: Boolean
        get() = fileType.contains("sheet", ignoreCase = true) ||
                fileType.contains("excel", ignoreCase = true) ||
                fileType.contains("spreadsheet", ignoreCase = true) ||
                listOf("xls", "xlsx", "csv").contains(extension)

    val isText: Boolean
        get() = fileType.contains("text", ignoreCase = true) ||
                listOf("txt", "md", "json", "log").contains(extension)

    val categoryLabel: String
        get() = when {
            isPdf -> "PDF"
            isImage -> "IMAGE"
            isWord -> "DOCUMENT"
            isExcel -> "SHEET"
            isText -> "TEXT"
            else -> "OTHER"
        }
}
