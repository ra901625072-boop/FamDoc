package com.famdoc.app.data.api

import com.famdoc.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApi {

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<User>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthTokenResponse>

    @POST("api/auth/family-login")
    suspend fun joinFamily(@Body request: FamilyLoginRequest): Response<AuthTokenResponse>

    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<User>

    @PUT("api/auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<User>

    @POST("api/auth/logout")
    suspend fun logout(): Response<Unit>

    @POST("api/auth/forgot-password/request")
    suspend fun requestPasswordReset(@Body request: ForgotPasswordRequest): Response<ApiResponse>

    @POST("api/auth/forgot-password/verify")
    suspend fun verifyResetOTP(@Body request: VerifyResetOTPRequest): Response<ApiResponse>

    @POST("api/auth/forgot-password/reset")
    suspend fun confirmPasswordReset(@Body request: ConfirmResetPasswordRequest): Response<ApiResponse>

    @GET("api/health")
    suspend fun healthCheck(): Response<Map<String, Any>>
}
