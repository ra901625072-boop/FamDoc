package com.famdoc.app.core.utils

import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentHashMap

object DateFormatter {

    private val inputIsoFormat = object : ThreadLocal<SimpleDateFormat>() {
        override fun initialValue(): SimpleDateFormat {
            return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
        }
    }

    private val displayDateTimeFormat = object : ThreadLocal<SimpleDateFormat>() {
        override fun initialValue(): SimpleDateFormat {
            return SimpleDateFormat("MMM d, yyyy, h:mm a", Locale.getDefault())
        }
    }

    private val displayDateFormat = object : ThreadLocal<SimpleDateFormat>() {
        override fun initialValue(): SimpleDateFormat {
            return SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
        }
    }

    // Micro-cache to avoid parsing same ISO strings repeatedly during fast list scrolling
    private val dateTimeCache = ConcurrentHashMap<String, String>()
    private val dateOnlyCache = ConcurrentHashMap<String, String>()

    fun formatDateTime(isoString: String?): String {
        if (isoString.isNullOrBlank()) return "—"
        return dateTimeCache.computeIfAbsent(isoString) { raw ->
            try {
                val cleanIso = raw.substringBefore('.').substringBefore('Z').substringBefore('+')
                val date = inputIsoFormat.get()?.parse(cleanIso) ?: return@computeIfAbsent raw
                displayDateTimeFormat.get()?.format(date) ?: raw
            } catch (e: Exception) {
                raw
            }
        }
    }

    fun formatDateOnly(isoString: String?): String {
        if (isoString.isNullOrBlank()) return "—"
        return dateOnlyCache.computeIfAbsent(isoString) { raw ->
            try {
                val cleanIso = raw.substringBefore('.').substringBefore('Z').substringBefore('+')
                val date = inputIsoFormat.get()?.parse(cleanIso) ?: return@computeIfAbsent raw
                displayDateFormat.get()?.format(date) ?: raw
            } catch (e: Exception) {
                raw
            }
        }
    }
}
