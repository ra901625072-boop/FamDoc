package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface FoldersApi {

    @GET("api/folders")
    suspend fun getFolders(): Response<List<FolderItem>>

    @POST("api/folders")
    suspend fun createFolder(@Body request: CreateFolderRequest): Response<FolderItem>

    @PUT("api/folders/{folder_id}")
    suspend fun renameFolder(
        @Path("folder_id") folderId: Int,
        @Body request: RenameFolderRequest
    ): Response<FolderItem>

    @PATCH("api/folders/{folder_id}/move")
    suspend fun moveFolder(
        @Path("folder_id") folderId: Int,
        @Body request: MoveFolderRequest
    ): Response<FolderItem>

    @DELETE("api/folders/{folder_id}")
    suspend fun deleteFolder(@Path("folder_id") folderId: Int): Response<ApiResponse>
}
