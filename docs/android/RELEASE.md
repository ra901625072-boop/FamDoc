# FamDoc Android Production Release & Signing Guide

This document details how to generate production keystores, configure release signing, and distribute the FamDoc app on the Google Play Store.

---

## 1. Generating a Production Keystore

To generate a new release keystore using Java's `keytool`:

```bash
keytool -genkey -v -keystore famdoc-release.jks -alias famdoc-key -keyalg RSA -keysize 2048 -validity 10000
```

Store `famdoc-release.jks` in a secure location outside of version control. Never commit your production `.jks` file or passwords to Git.

---

## 2. Configuring Gradle Release Signing via Environment Variables

Set the following environment variables on your CI/CD runner or local machine:

```bash
export FAMDOC_KEYSTORE_PATH="/path/to/famdoc-release.jks"
export FAMDOC_KEYSTORE_PASSWORD="YourKeystorePassword"
export FAMDOC_KEY_ALIAS="famdoc-key"
export FAMDOC_KEY_PASSWORD="YourKeyPassword"
```

In `android/app/build.gradle.kts`:
```kotlin
signingConfigs {
    create("release") {
        storeFile = file(System.getenv("FAMDOC_KEYSTORE_PATH") ?: "default.jks")
        storePassword = System.getenv("FAMDOC_KEYSTORE_PASSWORD")
        keyAlias = System.getenv("FAMDOC_KEY_ALIAS")
        keyPassword = System.getenv("FAMDOC_KEY_PASSWORD")
    }
}
```

---

## 3. Generating Release Artifacts

Run:
```cmd
build_release.bat
```

This compiles:
1. **`builds/release/FamDoc-release.apk`**: Standalone APK for sideloading and enterprise distribution.
2. **`builds/release/FamDoc-release.aab`**: Optimized Android App Bundle for uploading to the Google Play Developer Console.

---

## 4. Google Play Store Release Checklist

- [x] Application ID: `com.famdoc.app`
- [x] Target SDK: 34 (Android 14) / 35 (Android 15)
- [x] Min SDK: 24 (Android 7.0)
- [x] App Bundle (AAB) generated with `isMinifyEnabled = true` and `isShrinkResources = true`
- [x] Proguard rules configured to preserve serialization models
- [x] Secure token storage using AES-256 GCM Android KeyStore
- [x] Privacy policy and permissions audited (Zero unnecessary permissions requested)
