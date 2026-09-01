package com.famdoc.app.data.repository

import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.ErrorTranslator
import com.famdoc.app.data.models.DashboardStats
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class DashboardRepository(private val apiClient: ApiClient) {

    suspend fun getStats(): Resource<DashboardStats> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.dashboardApi.getStats()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }
}
