package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface RecycleBinApi {

    @GET("api/recycle-bin")
    suspend fun getRecycleBin(): Response<RecycleBinResponse>

    @POST("api/recycle-bin/{item_type}/{item_id}/restore")
    suspend fun restoreItem(
        @Path("item_type") itemType: String,
        @Path("item_id") itemId: Int
    ): Response<ApiResponse>

    @DELETE("api/recycle-bin/{item_type}/{item_id}/purge")
    suspend fun purgeItem(
        @Path("item_type") itemType: String,
        @Path("item_id") itemId: Int
    ): Response<ApiResponse>
}
