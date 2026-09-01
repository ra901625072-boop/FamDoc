package com.famdoc.app.data.repository

import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.ErrorTranslator
import com.famdoc.app.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class StorageRepository(private val apiClient: ApiClient) {

    suspend fun getStorageConfig(): Resource<StorageConfigResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.getStorageConfig()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getStorageAccounts(): Resource<List<StorageAccount>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.getStorageAccounts()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun updateStorageMode(mode: String): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.updateStorageMode(UpdateStorageModeRequest(mode))
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Storage mode updated")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getGoogleOAuthUrl(clientId: String? = null, clientSecret: String? = null): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.getGoogleOAuthUrl(GoogleOAuthUrlRequest(clientId, clientSecret))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!.authUrl)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun disconnectAccount(accountId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.disconnectAccount(accountId)
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Account disconnected")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun updateAccount(
        accountId: Int,
        label: String? = null,
        userId: Int? = null,
        priority: Int? = null
    ): Resource<StorageAccount> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.updateAccount(
                accountId,
                UpdateStorageAccountRequest(label = label, priority = priority, userId = userId)
            )
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun deleteAccount(accountId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.storageApi.deleteAccount(accountId)
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Account deleted")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }
}
