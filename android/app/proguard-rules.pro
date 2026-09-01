# FamDoc ProGuard Rules for Production Release

# Keep Retrofit and OkHttp classes
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*

# Keep Gson models and serialization
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.famdoc.app.data.models.** { *; }

# Keep Android Security Crypto
-keep class androidx.security.crypto.** { *; }

# Keep Coil image loader
-dontwarn coil.**
-keep class coil.** { *; }

# Strip logging in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}
