package com.famdoc.app.core.network

import android.content.Context
import com.famdoc.app.core.config.AppConfig
import com.famdoc.app.core.security.SecureTokenManager
import com.famdoc.app.data.api.*
import com.google.gson.GsonBuilder
import okhttp3.Cache
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class ApiClient(
    private val context: Context,
    private val appConfig: AppConfig,
    private val tokenManager: SecureTokenManager
) {

    val authInterceptor = AuthInterceptor(tokenManager)
    val networkObserver = NetworkConnectionObserver(context)

    private val httpCache: Cache by lazy {
        val cacheDir = File(context.cacheDir, "http_cache")
        Cache(cacheDir, 15L * 1024L * 1024L) // 15 MB Disk Cache
    }

    val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (appConfig.isDebugMode()) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        OkHttpClient.Builder()
            .cache(httpCache)
            .connectionPool(ConnectionPool(5, 5, TimeUnit.MINUTES))
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(45, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    private var currentBaseUrl: String = ""
    private var currentRetrofit: Retrofit? = null
    private val apiCache = ConcurrentHashMap<Class<*>, Any>()

    private fun getRetrofit(): Retrofit {
        val activeBaseUrl = appConfig.getApiBaseUrl().let {
            if (!it.endsWith("/")) "$it/" else it
        }

        if (currentRetrofit == null || currentBaseUrl != activeBaseUrl) {
            val gson = GsonBuilder()
                .setLenient()
                .create()

            currentBaseUrl = activeBaseUrl
            apiCache.clear() // Invalidate service cache when base URL changes
            currentRetrofit = Retrofit.Builder()
                .baseUrl(activeBaseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()
        }

        return currentRetrofit!!
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T : Any> getOrCreateApi(serviceClass: Class<T>): T {
        return apiCache.computeIfAbsent(serviceClass) {
            getRetrofit().create(serviceClass)
        } as T
    }

    // Cached API Interface accessors
    val authApi: AuthApi get() = getOrCreateApi(AuthApi::class.java)
    val familyApi: FamilyApi get() = getOrCreateApi(FamilyApi::class.java)
    val filesApi: FilesApi get() = getOrCreateApi(FilesApi::class.java)
    val foldersApi: FoldersApi get() = getOrCreateApi(FoldersApi::class.java)
    val storageApi: StorageApi get() = getOrCreateApi(StorageApi::class.java)
    val recycleBinApi: RecycleBinApi get() = getOrCreateApi(RecycleBinApi::class.java)
    val searchApi: SearchApi get() = getOrCreateApi(SearchApi::class.java)
    val dashboardApi: DashboardApi get() = getOrCreateApi(DashboardApi::class.java)
    val shareApi: ShareApi get() = getOrCreateApi(ShareApi::class.java)

    val wakeupHandler = RenderWakeupHandler { authApi }

    fun getDownloadUrl(fileId: Int): String {
        val base = appConfig.getApiBaseUrl()
        return "$base/api/files/$fileId/download"
    }

    fun getPreviewUrl(fileId: Int, previewToken: String? = null): String {
        val base = appConfig.getApiBaseUrl()
        return if (!previewToken.isNullOrBlank()) {
            "$base/api/files/$fileId/preview?token=$previewToken"
        } else {
            "$base/api/files/$fileId/preview"
        }
    }
}
