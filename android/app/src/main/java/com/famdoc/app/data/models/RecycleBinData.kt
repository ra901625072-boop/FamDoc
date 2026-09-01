package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class RecycleBinResponse(
    @SerializedName("files") val files: List<FileItem> = emptyList(),
    @SerializedName("folders") val folders: List<FolderItem> = emptyList()
)
