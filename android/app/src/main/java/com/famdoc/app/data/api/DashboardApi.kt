package com.famdoc.app.data.api

import com.famdoc.app.data.models.DashboardStats
import retrofit2.Response
import retrofit2.http.GET

interface DashboardApi {

    @GET("api/dashboard/stats")
    suspend fun getStats(): Response<DashboardStats>
}
