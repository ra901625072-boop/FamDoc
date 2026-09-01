package com.famdoc.app.data.api

import com.famdoc.app.data.models.FileItem
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface SearchApi {

    @GET("api/search")
    suspend fun searchFiles(
        @Query("q") query: String? = null,
        @Query("type") category: String? = null,
        @Query("uploader") uploader: String? = null,
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<List<FileItem>>
}
