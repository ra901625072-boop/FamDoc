package com.famdoc.app.core.network

import com.famdoc.app.core.security.SecureTokenManager
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val tokenManager: SecureTokenManager
) : Interceptor {

    private val _unauthorizedEvent = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val unauthorizedEvent: SharedFlow<Unit> = _unauthorizedEvent.asSharedFlow()

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val builder = originalRequest.newBuilder()

        // Inject Authorization header if token exists
        val token = tokenManager.getToken()
        if (!token.isNullOrBlank() && originalRequest.header("Authorization") == null) {
            builder.addHeader("Authorization", "Bearer $token")
        }

        val path = originalRequest.url.encodedPath
        if (originalRequest.header("Accept") == null && !path.contains("/preview") && !path.contains("/download")) {
            builder.addHeader("Accept", "application/json")
        }

        val response = chain.proceed(builder.build())

        // Catch 401 Unauthorized
        if (response.code == 401) {
            val path = originalRequest.url.encodedPath
            val isPublicAuthPath = path.contains("/login") ||
                    path.contains("/register") ||
                    path.contains("/family-login") ||
                    path.contains("/forgot-password") ||
                    path.contains("/api/shared/")

            if (!isPublicAuthPath) {
                tokenManager.clearSession()
                _unauthorizedEvent.tryEmit(Unit)
            }
        }

        return response
    }
}
