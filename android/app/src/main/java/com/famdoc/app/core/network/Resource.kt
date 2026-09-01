package com.famdoc.app.core.network

sealed class Resource<out T> {
    data class Success<out T>(val data: T) : Resource<T>()
    data class Error(val message: String, val cause: Throwable? = null, val code: Int? = null) : Resource<Nothing>()
    data class Loading(val message: String? = null, val progressPercent: Int? = null) : Resource<Nothing>()
    object Idle : Resource<Nothing>()
}
