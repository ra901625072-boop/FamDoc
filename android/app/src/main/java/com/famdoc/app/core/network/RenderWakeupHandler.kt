package com.famdoc.app.core.network

import com.famdoc.app.data.api.AuthApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.SocketTimeoutException
import java.net.UnknownHostException

enum class ServerStatus {
    ONLINE,
    WAKING_UP,
    OFFLINE,
    CHECKING
}

class RenderWakeupHandler(private val authApiProvider: () -> AuthApi) {

    private val _serverStatus = MutableStateFlow(ServerStatus.ONLINE)
    val serverStatus: StateFlow<ServerStatus> = _serverStatus.asStateFlow()

    suspend fun checkServerHealth(maxRetries: Int = 3, initialDelayMs: Long = 1000): Boolean {
        _serverStatus.value = ServerStatus.CHECKING
        var currentDelay = initialDelayMs

        for (attempt in 1..maxRetries) {
            try {
                val response = authApiProvider().healthCheck()
                if (response.isSuccessful) {
                    _serverStatus.value = ServerStatus.ONLINE
                    return true
                }
            } catch (e: Exception) {
                when (e) {
                    is SocketTimeoutException -> {
                        _serverStatus.value = ServerStatus.WAKING_UP
                    }
                    is UnknownHostException -> {
                        _serverStatus.value = ServerStatus.OFFLINE
                        return false
                    }
                    else -> {
                        _serverStatus.value = ServerStatus.WAKING_UP
                    }
                }
            }

            if (attempt < maxRetries) {
                delay(currentDelay)
                currentDelay *= 2
            }
        }

        _serverStatus.value = ServerStatus.OFFLINE
        return false
    }

    fun setServerOnline() {
        _serverStatus.value = ServerStatus.ONLINE
    }

    fun setServerWakingUp() {
        _serverStatus.value = ServerStatus.WAKING_UP
    }

    fun setServerOffline() {
        _serverStatus.value = ServerStatus.OFFLINE
    }
}
