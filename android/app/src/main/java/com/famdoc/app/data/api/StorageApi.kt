package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface StorageApi {

    @GET("api/storage/config")
    suspend fun getStorageConfig(): Response<StorageConfigResponse>

    @GET("api/storage/accounts")
    suspend fun getStorageAccounts(): Response<List<StorageAccount>>

    @POST("api/storage/config/mode")
    suspend fun updateStorageMode(@Body request: UpdateStorageModeRequest): Response<ApiResponse>

    @PATCH("api/storage/accounts/{account_id}")
    suspend fun updateAccount(
        @Path("account_id") accountId: Int,
        @Body payload: UpdateStorageAccountRequest
    ): Response<StorageAccount>

    @POST("api/storage/accounts/{account_id}/disconnect")
    suspend fun disconnectAccount(@Path("account_id") accountId: Int): Response<ApiResponse>

    @DELETE("api/storage/accounts/{account_id}")
    suspend fun deleteAccount(@Path("account_id") accountId: Int): Response<ApiResponse>

    @POST("api/storage/oauth/url")
    suspend fun getGoogleOAuthUrl(@Body request: GoogleOAuthUrlRequest): Response<GoogleOAuthUrlResponse>
}
