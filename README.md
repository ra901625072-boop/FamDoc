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
- ⚡ **Modern React 19 + Vite 6 SPA:** Ultra-fast modern frontend with TypeScript, TanStack Query v5 caching, Zustand state, Tailwind CSS design tokens, IndexedDB background upload queue, and full-screen document previewers, targeting Cloudflare Pages.
- ☁️ **Production Deployable:** Ready for deployment on **Cloudflare** (Cloudflare Pages for React SPA, Workers Edge Router + Cloudflare Containers for FastAPI backend, R2 for vault storage, Hyperdrive for Supabase connection pooling).

---

## 🏗️ Architecture Flow

```mermaid
flowchart TD
    subgraph Clients["Clients Layer"]
        A["📱 Android App (Jetpack Compose)"]
        B["💻 Web SPA (React 19 + Vite 6 on Cloudflare Pages)"]
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
├── frontend/                  # Modern Web SPA (React 19 + TypeScript + Vite 6)
│   ├── src/                   # Components, pages, hooks, stores, API client
│   ├── public/                # Static assets, Android APK download, _redirects, _headers
│   └── vite.config.ts         # Vite bundler configuration
├── frontend-legacy/           # Preserved legacy Vanilla JS frontend
├── docs/                      # Technical specifications, migration audits & cutover runbook
├── tests/e2e/                 # Playwright E2E parity test suite
├── build_apk.bat              # One-click Android APK build script
├── install_debug.bat          # ADB debug install script
└── wrangler.toml              # Cloudflare Workers & Containers deployment configuration
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

### 2. Frontend Setup (React 19 + Vite 6)

```bash
cd frontend
npm install
npm run dev                    # Starts Vite dev server with proxy to backend
npm run build                  # Builds production bundle to dist/
npm test                       # Runs Vitest unit tests
```

### 2. Cloudflare Deployment (Edge Router + Containers)

For full migration instructions, see [PRODUCTION_CUTOVER_RUNBOOK.md](file:///d:/FDMS/docs/migration/PRODUCTION_CUTOVER_RUNBOOK.md).

```bash
# Install dependencies
npm install

# Deploy to Staging
npx wrangler deploy --env staging

# Deploy to Production
npx wrangler deploy --env production
```

### 3. Android App Build

Ensure Android SDK / Android Studio is installed, then build debug APK:
```bash
./build_apk.bat
```

---

## 🎨 Design System & Token Architecture

FamDoc adheres to an accessible, WCAG 2.2 compliant design token architecture configured centrally in `frontend/src/styles/variables.css`.

### Brand Palette (Royal Blue)
The brand identity is standardized on Royal Blue across the web vault and Android client:
- **Light Theme Primary:** `#1D4ED8` (WCAG AAA contrast 7.61:1 against white/paper surfaces)
- **Dark Theme Primary:** `#60A5FA` / `#2563EB` (Restores legibility without glare)
- **Dark Mode Elevation:** AMOLED black (`#000000`) elevated to Navy Obsidian canvas (`#0B0F17`), card containers (`#151C2C`), and visible structural borders (`#283548`, contrast $\ge 3.0:1$)

### Data-Viz & Category Color Mapping
To prevent semantic collision with brand blue and semantic statuses, digital keepsakes are color-coded with high-distinguishability tokens:
- **Videos:** Pink (`--cat-video: #EC4899`)
- **Images:** Vibrant Cyan (`--cat-images: #0EA5E9`)
- **PDF Documents:** Crimson (`--cat-pdfs: #EF4444`)
- **Word Documents:** Violet (`--cat-docs: #8B5CF6`)
- **Spreadsheets:** Teal/Jade (`--cat-sheets: #0D9488`)
- **Text & Notes:** Amber (`--cat-text: #F59E0B`)
- **Other:** Slate (`--cat-other: #64748B`)
- **Keepsake Folders:** Warm Amber (`--folder-color: #D97706` light / `#FBBF24` dark)

### Semantic Status Tokens
- **Online / Verified / Active:** Emerald (`--semantic-success: #10B981`)
- **Pending / Syncing / Warning:** Amber (`--semantic-warning: #F59E0B`)
- **Offline / Error / Expired:** Red (`--semantic-danger: #EF4444`)

---

## 👨‍💻 Author

**Akshaysinh Rajput**
- 🌐 Portfolio: [portfolioakshay.in](https://portfolioakshay.in)
- 💼 LinkedIn: [Akshaysinh Rajput](https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/)
- 🐙 GitHub: [@ra901625072-boop](https://github.com/ra901625072-boop)