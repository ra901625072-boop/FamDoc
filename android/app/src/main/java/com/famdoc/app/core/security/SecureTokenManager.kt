package com.famdoc.app.core.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.famdoc.app.data.models.User
import com.google.gson.Gson

class SecureTokenManager(private val context: Context) {

    private val gson = Gson()
    private val prefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_FILENAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.e("SecureTokenManager", "Failed to initialize EncryptedSharedPreferences, falling back", e)
            context.getSharedPreferences("${PREFS_FILENAME}_fallback", Context.MODE_PRIVATE)
        }
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_ACCESS_TOKEN, token).apply()
    }

    fun getToken(): String? {
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    fun hasValidToken(): Boolean {
        val token = getToken()
        return !token.isNullOrBlank()
    }

    fun saveUser(user: User) {
        val json = gson.toJson(user)
        prefs.edit().putString(KEY_USER_PROFILE, json).apply()
    }

    fun getUser(): User? {
        val json = prefs.getString(KEY_USER_PROFILE, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun saveCustomBaseUrl(url: String?) {
        if (url.isNullOrBlank()) {
            prefs.edit().remove(KEY_CUSTOM_BASE_URL).apply()
        } else {
            prefs.edit().putString(KEY_CUSTOM_BASE_URL, url).apply()
        }
    }

    fun getCustomBaseUrl(): String? {
        return prefs.getString(KEY_CUSTOM_BASE_URL, null)
    }

    fun saveThemeMode(mode: String) {
        prefs.edit().putString(KEY_THEME_MODE, mode).apply()
    }

    fun getThemeMode(): String? {
        return prefs.getString(KEY_THEME_MODE, "system")
    }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_USER_PROFILE)
            .apply()
    }

    companion object {
        private const val PREFS_FILENAME = "famdoc_secure_prefs"
        private const val KEY_ACCESS_TOKEN = "jwt_access_token"
        private const val KEY_USER_PROFILE = "cached_user_profile"
        private const val KEY_CUSTOM_BASE_URL = "custom_api_base_url"
        private const val KEY_THEME_MODE = "app_theme_mode"
    }
}
