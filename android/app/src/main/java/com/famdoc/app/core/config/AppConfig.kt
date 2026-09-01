package com.famdoc.app.core.config

import android.content.Context
import com.famdoc.app.BuildConfig
import com.famdoc.app.core.security.SecureTokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class AppThemeMode {
    SYSTEM,
    LIGHT,
    DARK
}

class AppConfig(
    private val context: Context,
    private val secureTokenManager: SecureTokenManager
) {
    private val _themeMode = MutableStateFlow(getSavedThemeMode())
    val themeMode: StateFlow<AppThemeMode> = _themeMode.asStateFlow()

    fun getSavedThemeMode(): AppThemeMode {
        val modeStr = secureTokenManager.getThemeMode() ?: "system"
        return try {
            AppThemeMode.valueOf(modeStr.uppercase())
        } catch (e: Exception) {
            AppThemeMode.SYSTEM
        }
    }

    fun setThemeMode(mode: AppThemeMode) {
        secureTokenManager.saveThemeMode(mode.name.lowercase())
        _themeMode.value = mode
    }

    /**
     * Retrieves the active API Base URL.
     * Uses any user-configured custom backend URL (for local dev / staging) or falls back to production Render backend.
     */
    fun getApiBaseUrl(): String {
        val overrideUrl = secureTokenManager.getCustomBaseUrl()
        return if (!overrideUrl.isNullOrBlank()) {
            overrideUrl.trimEnd('/')
        } else {
            BuildConfig.DEFAULT_API_BASE_URL.trimEnd('/')
        }
    }

    fun setCustomApiBaseUrl(url: String?) {
        secureTokenManager.saveCustomBaseUrl(url?.trim()?.trimEnd('/'))
    }

    fun isDebugMode(): Boolean = BuildConfig.DEBUG

    fun getAppVersion(): String = BuildConfig.APP_VERSION
}
