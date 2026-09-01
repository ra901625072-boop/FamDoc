# FamDoc Android Setup Guide

This guide provides setup instructions for configuring, developing, and running the **FamDoc Android Application**.

---

## 1. Prerequisites

To build and run the Android app, ensure your workstation has:

* **Java Development Kit (JDK)**: JDK 17 or newer (e.g. OpenJDK 17, Eclipse Temurin 17, or Android Studio embedded JBR).
* **Android Studio**: Android Studio Hedgehog (2023.1.1) or newer (Jellyfish / Koala / Ladybug recommended).
* **Android SDK**:
  - `compileSdk`: 34 (Android 14) / 35
  - `minSdk`: 24 (Android 7.0)
  - Android SDK Platform-Tools and Build-Tools (34.0.0+)
* **Git**: Installed and available in PATH.

---

## 2. Automated Environment Setup

Run the automated setup script from the project root:

```cmd
setup_android.bat
```

This script automatically:
1. Detects `ANDROID_HOME` or scans standard locations (`%LOCALAPPDATA%\Android\Sdk`).
2. Configures `android/local.properties` with the correct `sdk.dir` path.
3. Checks Java JDK availability.
4. Verifies ADB and platform tools.

---

## 3. Opening in Android Studio

1. Launch **Android Studio**.
2. Select **Open** and choose the `android` folder (`d:\FDMS-app\android`).
3. Allow Gradle to sync dependencies automatically.
4. Connect an Android device with **USB Debugging enabled** or start an Android Virtual Device (AVD).
5. Click **Run > Run 'app'** (or press `Shift + F10`).

---

## 4. Configuring Backend URL

By default, the app is pre-configured to communicate with the production Render backend:

```text
https://famdoc-backend.onrender.com
```

### Local / Staging Override
To connect the Android app to a local development backend (e.g. running at `http://localhost:8000` or Android Emulator loopback `http://10.0.2.2:8000`):

1. Open the app on your device.
2. Navigate to **Profile & Credentials** (bottom navigation or drawer).
3. Under **Backend Server Connection**, enter `http://10.0.2.2:8000` (for emulator) or your local network IP (e.g. `http://192.168.1.X:8000`).
4. Tap **Apply Server URL**. The app immediately re-points all API calls without requiring a rebuild!

---

## 5. Directory Structure Overview

```text
android/
├── app/
│   ├── build.gradle.kts       # App module dependencies & SDK config
│   ├── proguard-rules.pro     # Production obfuscation rules
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/famdoc/app/
│       │   ├── core/          # Network, Security, Config, Utils
│       │   ├── data/          # Retrofit APIs, Models, Repositories
│       │   └── ui/            # Compose Theme, Components, Screens, ViewModels
│       └── res/               # Vectors, Colors, Strings, XML Configs
├── gradle/
│   └── libs.versions.toml     # Version catalog
├── build.gradle.kts           # Root build configuration
└── settings.gradle.kts        # Repository management
```
