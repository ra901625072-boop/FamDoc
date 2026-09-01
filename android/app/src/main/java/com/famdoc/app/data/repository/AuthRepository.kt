package com.famdoc.app.data.repository

import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.security.SecureTokenManager
import com.famdoc.app.core.utils.ErrorTranslator
import com.famdoc.app.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository(
    private val apiClient: ApiClient,
    private val tokenManager: SecureTokenManager
) {

    suspend fun register(username: String, email: String, password: String): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.register(RegisterRequest(username, email, password))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun login(email: String, password: String): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val tokenResponse = apiClient.authApi.login(LoginRequest(email, password))
            if (tokenResponse.isSuccessful && tokenResponse.body() != null) {
                val token = tokenResponse.body()!!.accessToken
                tokenManager.saveToken(token)

                // Fetch full profile immediately
                val userResponse = apiClient.authApi.getCurrentUser()
                if (userResponse.isSuccessful && userResponse.body() != null) {
                    val user = userResponse.body()!!
                    tokenManager.saveUser(user)
                    Resource.Success(user)
                } else {
                    Resource.Error("Login succeeded, but failed to load user profile.")
                }
            } else {
                Resource.Error(ErrorTranslator.translate(tokenResponse))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun joinFamily(username: String, email: String, secretCode: String, password: String? = null): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.joinFamily(FamilyLoginRequest(username, email, secretCode, password))
            if (response.isSuccessful && response.body() != null) {
                val token = response.body()!!.accessToken
                tokenManager.saveToken(token)

                val userResponse = apiClient.authApi.getCurrentUser()
                if (userResponse.isSuccessful && userResponse.body() != null) {
                    val user = userResponse.body()!!
                    tokenManager.saveUser(user)
                    Resource.Success(user)
                } else {
                    Resource.Error("Joined family, but failed to load profile.")
                }
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getCurrentUser(): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.getCurrentUser()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                tokenManager.saveUser(user)
                Resource.Success(user)
            } else {
                val cached = tokenManager.getUser()
                if (cached != null) {
                    Resource.Success(cached)
                } else {
                    Resource.Error(ErrorTranslator.translate(response))
                }
            }
        } catch (e: Exception) {
            val cached = tokenManager.getUser()
            if (cached != null) {
                Resource.Success(cached)
            } else {
                Resource.Error(ErrorTranslator.translate(e), e)
            }
        }
    }

    suspend fun updateProfile(username: String?, password: String?): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.updateProfile(UpdateProfileRequest(username, password))
            if (response.isSuccessful && response.body() != null) {
                val updated = response.body()!!
                tokenManager.saveUser(updated)
                Resource.Success(updated)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun logout(): Resource<Unit> = withContext(Dispatchers.IO) {
        try {
            apiClient.authApi.logout()
        } catch (e: Exception) {
            // Non-fatal, proceed with local logout
        }
        tokenManager.clearSession()
        Resource.Success(Unit)
    }

    suspend fun requestPasswordReset(email: String): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.requestPasswordReset(ForgotPasswordRequest(email))
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Reset OTP sent to your email.")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun verifyResetOTP(email: String, otpCode: String): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.verifyResetOTP(VerifyResetOTPRequest(email, otpCode))
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "OTP verified successfully.")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun confirmPasswordReset(email: String, otpCode: String, newPassword: String): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.authApi.confirmPasswordReset(ConfirmResetPasswordRequest(email, otpCode, newPassword))
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Password reset successfully. Please log in.")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    fun isLoggedIn(): Boolean = tokenManager.hasValidToken()
    fun getCachedUser(): User? = tokenManager.getUser()
}
