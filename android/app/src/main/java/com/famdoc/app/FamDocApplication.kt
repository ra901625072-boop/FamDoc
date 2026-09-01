package com.famdoc.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.famdoc.app.core.config.AppConfig
import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.security.SecureTokenManager

import coil.disk.DiskCache
import coil.memory.MemoryCache

class FamDocApplication : Application(), ImageLoaderFactory {

    lateinit var secureTokenManager: SecureTokenManager
        private set

    lateinit var appConfig: AppConfig
        private set

    lateinit var apiClient: ApiClient
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        secureTokenManager = SecureTokenManager(this)
        appConfig = AppConfig(this, secureTokenManager)
        apiClient = ApiClient(this, appConfig, secureTokenManager)
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .okHttpClient(apiClient.okHttpClient)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizePercent(0.05)
                    .build()
            }
            .respectCacheHeaders(false)
            .crossfade(250)
            .build()
    }

    companion object {
        lateinit var instance: FamDocApplication
            private set
    }
}
