<div align="center">

# 📱 FamDoc — Family Keepsake & Document Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
  <img src="https://img.shields.io/badge/Jetpack_Compose-4285F4?style=for-the-badge&logo=android&logoColor=white" alt="Jetpack Compose" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Google_Drive_API-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive" />
  <img src="https://img.shields.io/badge/Biometrics-AndroidX-green?style=for-the-badge&logo=android" alt="Biometrics" />
</p>

<p align="center">
  <b>Enterprise-Grade, Resilient Family Vault with Native Android & FastAPI Multi-Account Cloud Storage</b>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/ra901625072-boop/Portfolio/main/public/assets/images/famdoc.png" alt="FamDoc Platform Preview" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</p>

</div>

---

## 🌟 Overview

**FamDoc** (Family Document Management System) is an end-to-end document and digital keepsake platform designed specifically for families. It solves cloud storage limits and fragmentation by aggregating multiple Google Drive accounts into a unified, secure storage pool, backed by a local failover cache and a native Android mobile experience.

---

## ✨ Key Capabilities

- 🔄 **Dual-Tier Resilient Storage Architecture:** Direct uploads stream to pooled Google Drive accounts. If cloud limits or network outages occur, files seamlessly buffer to a local encrypted disk vault and auto-promote to the cloud once reconnected.
- 📱 **Native Android Application (Kotlin + Jetpack Compose):** 
  - Material Design 3 theme with dynamic color adaptability.
  - Biometric authentication (Fingerprint / Face unlock via AndroidX Biometrics).
  - Offline-first cache: cached previews, background download manager, and instant search.
- 🔐 **Multi-Tenancy & Hardened Security:**
  - Role-based access control (Admin & Family Member profiles).
  - Single-session JWT authentication with SHA-256 vault codes.
  - Fernet symmetric encryption for OAuth credentials and sensitive metadata.
- ⚡ **Zero-Overhead Web SPA:** Lightweight, ultra-fast Vanilla JS frontend with responsive design tokens, drag-and-drop file upload queue, and full-screen document previewers.
- ☁️ **Production Deployable:** Ready for deployment on **Render** (FastAPI backend), **Vercel** (Frontend SPA), and **Supabase / PostgreSQL** (Database).

---

## 🏗️ Architecture Flow

```mermaid
flowchart TD
    subgraph Clients["Clients Layer"]
        A["📱 Android App (Jetpack Compose)"]
        B["💻 Web SPA (Vanilla JS)"]
    end

    subgraph Backend["FastAPI Backend Engine"]
        C["API Gateway & JWT Auth"]
        D["Storage Router & Queue"]
        E["Fernet Encryption Engine"]
    end

    subgraph Storage["Storage & Persistence Layer"]
        F[("🐘 PostgreSQL / Supabase")]
        G["📁 Google Drive Multi-Account Pool"]
        H["💾 Local Encrypted Failover Vault"]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    D -->|Primary Write| G
    D -->|Network Outage Failover| H
    H -.->|Background Promotion Queue| G
```

---

## 📁 Repository Structure

```
FamDoc/
├── android/                   # Native Android application (Kotlin + Jetpack Compose)
│   ├── app/src/main/java/     # Compose UI, ViewModels, Repository, Biometrics
│   └── build.gradle.kts       # Gradle build configuration
├── backend/                   # FastAPI Backend Server
│   ├── app/
│   │   ├── api/               # API routes (auth, documents, vaults, accounts)
│   │   ├── core/              # Security, encryption, config, database sessions
│   │   ├── models/            # SQLAlchemy / Pydantic models
│   │   └── services/          # Google Drive pooling, storage failover, queues
│   ├── requirements.txt       # Python dependencies
│   └── main.py                # Server entry point
├── frontend/                  # Web Single Page Application (SPA)
│   ├── index.html             # Main web dashboard
│   ├── assets/                # CSS styling, icons, JavaScript modules
│   └── vercel.json            # Vercel deployment configuration
├── docs/                      # Technical specifications & API contracts
├── build_apk.bat              # One-click Android APK build script
├── install_debug.bat          # ADB debug install script
└── render.yaml                # Render cloud deployment blueprint
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python main.py
```
Backend will start on `http://localhost:8000` with Swagger docs available at `http://localhost:8000/docs`.

### 2. Android App Build

Ensure Android SDK / Android Studio is installed, then build debug APK:
```bash
./build_apk.bat
```

---

## 👨‍💻 Author

**Akshaysinh Rajput**
- 🌐 Portfolio: [portfolioakshay.in](https://portfolioakshay.in)
- 💼 LinkedIn: [Akshaysinh Rajput](https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/)
- 🐙 GitHub: [@ra901625072-boop](https://github.com/ra901625072-boop)