package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface FilesApi {

    @GET("api/files")
    suspend fun getFiles(@Query("folder_id") folderId: String? = null): Response<List<FileItem>>

    @Multipart
    @POST("api/files/upload")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part,
        @Part("folder_id") folderId: RequestBody? = null
    ): Response<FileItem>

    @PUT("api/files/{file_id}")
    suspend fun renameFile(
        @Path("file_id") fileId: Int,
        @Body request: RenameFileRequest
    ): Response<FileItem>

    @PATCH("api/files/{file_id}/move")
    suspend fun moveFile(
        @Path("file_id") fileId: Int,
        @Body request: MoveFileRequest
    ): Response<FileItem>

    @DELETE("api/files/{file_id}")
    suspend fun deleteFile(@Path("file_id") fileId: Int): Response<Unit>

    @Streaming
    @GET("api/files/{file_id}/download")
    suspend fun downloadFile(@Path("file_id") fileId: Int): Response<ResponseBody>

    @Streaming
    @GET("api/files/{file_id}/preview")
    suspend fun previewFile(
        @Path("file_id") fileId: Int,
        @Query("token") previewToken: String? = null
    ): Response<ResponseBody>

    @GET("api/files/{file_id}/preview-token")
    suspend fun getPreviewToken(@Path("file_id") fileId: Int): Response<PreviewTokenResponse>
}
