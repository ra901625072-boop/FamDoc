package com.famdoc.app.data.repository

import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.ErrorTranslator
import com.famdoc.app.data.models.RecycleBinResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class RecycleBinRepository(private val apiClient: ApiClient) {

    suspend fun getRecycleBin(): Resource<RecycleBinResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.recycleBinApi.getRecycleBin()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun restoreItem(itemType: String, itemId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.recycleBinApi.restoreItem(itemType, itemId)
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Item restored successfully")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun purgeItem(itemType: String, itemId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.recycleBinApi.purgeItem(itemType, itemId)
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Item permanently purged")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }
}
