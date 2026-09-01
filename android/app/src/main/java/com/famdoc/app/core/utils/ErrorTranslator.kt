package com.famdoc.app.core.utils

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import retrofit2.Response

object ErrorTranslator {

    private val gson = Gson()

    fun translate(response: Response<*>): String {
        val errorBody = response.errorBody()?.string() ?: return "An unexpected error occurred (${response.code()})"
        return parseErrorMessage(errorBody, response.code())
    }

    fun translate(throwable: Throwable): String {
        return when (throwable) {
            is java.net.SocketTimeoutException -> "Request timed out. The server might be waking up, please try again."
            is java.net.UnknownHostException -> "Unable to reach server. Please check your internet connection."
            is java.net.ConnectException -> "Failed to connect to server. Please try again."
            else -> throwable.localizedMessage ?: "An unexpected network error occurred."
        }
    }

    private fun parseErrorMessage(errorJson: String, statusCode: Int): String {
        try {
            val jsonObject = gson.fromJson(errorJson, JsonObject::class.java)
            if (jsonObject.has("detail")) {
                val detailElem = jsonObject.get("detail")
                if (detailElem.isJsonPrimitive) {
                    return detailElem.asString
                } else if (detailElem.isJsonArray) {
                    val array = detailElem.asJsonArray
                    val messages = mutableListOf<String>()
                    for (i in 0 until array.size()) {
                        val item = array.get(i).asJsonObject
                        val loc = item.getAsJsonArray("loc")
                        val field = if (loc != null && loc.size() > 1) {
                            loc.get(loc.size() - 1).asString
                        } else "Field"
                        val msg = item.get("msg")?.asString ?: "is invalid"
                        messages.add(formatFieldError(field, msg))
                    }
                    return messages.joinToString("; ")
                }
            }
            if (jsonObject.has("message")) {
                return jsonObject.get("message").asString
            }
        } catch (e: Exception) {
            // Not a JSON object or parsing failed
        }

        return when (statusCode) {
            400 -> "Bad request. Please verify your input."
            401 -> "Session expired or invalid credentials."
            403 -> "You do not have permission to perform this action."
            404 -> "Requested item was not found."
            429 -> "Too many requests. Please try again in a few minutes."
            500 -> "Server encountered an error. Please try again later."
            502, 503, 504 -> "Server is currently unavailable or waking up."
            else -> "Error $statusCode occurred."
        }
    }

    private fun formatFieldError(field: String, message: String): String {
        val cleanMsg = message.replace(Regex("^value error,\\s*", RegexOption.IGNORE_CASE), "")
        val friendlyField = field.replace('_', ' ').replaceFirstChar { it.uppercase() }

        val translated = when {
            cleanMsg.contains("match pattern '^[a-zA-Z0-9_]+$'") -> "should contain only letters, numbers, and underscores."
            cleanMsg.contains("Field required") -> "is required."
            cleanMsg.contains("valid email address") -> "must be a valid email address."
            cleanMsg.contains("at least") -> cleanMsg
            cleanMsg.contains("at most") -> cleanMsg
            else -> cleanMsg
        }

        return "$friendlyField $translated"
    }
}
