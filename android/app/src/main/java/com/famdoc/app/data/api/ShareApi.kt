package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface ShareApi {

    @POST("api/files/{file_id}/share")
    suspend fun createShareLink(
        @Path("file_id") fileId: Int,
        @Body request: CreateShareLinkRequest
    ): Response<ShareLink>

    @GET("api/files/{file_id}/share")
    suspend fun getFileShareLinks(@Path("file_id") fileId: Int): Response<List<ShareLink>>

    @DELETE("api/shared/links/{token}")
    suspend fun revokeShareLink(@Path("token") token: String): Response<Unit>

    @GET("api/shared/{token}")
    suspend fun getPublicShareInfo(@Path("token") token: String): Response<PublicShareInfo>

    @Streaming
    @POST("api/shared/{token}/download")
    suspend fun downloadPublicSharedFile(
        @Path("token") token: String,
        @Body request: DownloadSharedFileRequest? = null
    ): Response<ResponseBody>
}
