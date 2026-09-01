package com.famdoc.app.data.models

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id") val id: Int,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String = "member",
    @SerializedName("family_id") val familyId: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
) {
    val isAdmin: Boolean get() = role.equals("admin", ignoreCase = true)
    val initials: String
        get() = if (username.isNotBlank()) {
            username.take(2).uppercase()
        } else "U"
}

data class AuthTokenResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String = "bearer"
)
