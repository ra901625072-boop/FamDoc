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

        // Explicitly set the global Coil ImageLoader to ensure authenticated OkHttpClient is used everywhere
        coil.Coil.setImageLoader(this)
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .okHttpClient(apiClient.okHttpClient)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .strongReferencesEnabled(true)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("famdoc_thumbnails_disk_cache"))
                    .maxSizeBytes(150L * 1024L * 1024L) // 150 MB Dedicated Persistent Disk Cache
                    .build()
            }
            .respectCacheHeaders(false)
            .crossfade(200)
            .build()
    }

    companion object {
        lateinit var instance: FamDocApplication
            private set
    }
}
