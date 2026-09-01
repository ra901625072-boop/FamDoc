package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface FamilyApi {

    @POST("api/family/setup")
    suspend fun setupFamily(@Body request: SetupFamilyRequest): Response<Family>

    @GET("api/family/members")
    suspend fun getMembers(): Response<List<FamilyMember>>

    @DELETE("api/family/members/{user_id}")
    suspend fun removeMember(@Path("user_id") userId: Int): Response<ApiResponse>

    @GET("api/family/details")
    suspend fun getFamilyDetails(): Response<FamilyDetailsResponse>

    @POST("api/family/regenerate-code")
    suspend fun regenerateCode(@Body request: SetupFamilyRequest): Response<RegenerateCodeResponse>
}
