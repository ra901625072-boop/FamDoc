# FamDoc Android Build & Compilation Guide

This document describes how to compile debug and release builds of the FamDoc Android application using automated scripts and Gradle commands.

---

## 1. Quick Build Commands (Windows)

We provide automated batch scripts in the project root:

### Build Debug APK
```cmd
build_apk.bat
```
* **Output**: `builds\debug\FamDoc-debug.apk`
* **Use Case**: Local development, USB device testing, emulator testing.

### Build Production Release (APK + AAB)
```cmd
build_release.bat
```
* **Output**:
  - Release APK: `builds\release\FamDoc-release.apk`
  - Google Play Bundle: `builds\release\FamDoc-release.aab`
* **Use Case**: Google Play Store internal/closed testing and production distribution.

### Clean Build Cache
```cmd
clean_build.bat
```
* Purges Gradle cache, intermediate objects, and cleans output directories.

---

## 2. Command-Line Build via Gradle Wrapper

You can also run Gradle commands directly from the `android/` directory:

```bash
cd android

# Build Debug APK
./gradlew assembleDebug

# Build Release APK
./gradlew assembleRelease

# Build Google Play App Bundle (AAB)
./gradlew bundleRelease

# Run Unit Tests
./gradlew test

# Clean build
./gradlew clean
```

---

## 3. Build Output Directory Structure

```text
builds/
├── debug/
│   └── FamDoc-debug.apk       # Ready for adb install
└── release/
    ├── FamDoc-release.apk     # Production APK
    └── FamDoc-release.aab     # Google Play Store Bundle
```

---

## 4. Installing on Device via ADB

Connect your Android phone via USB with USB Debugging enabled, then execute:

```cmd
adb install -r builds\debug\FamDoc-debug.apk
```
