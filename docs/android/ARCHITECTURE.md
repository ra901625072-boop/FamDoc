# FamDoc Android Architecture Specification

## 1. Architectural Pattern: Clean Architecture + MVI/MVVM

The application follows Google's official recommended Android app architecture:

```text
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Jetpack Compose)               │
│   - Declarative Composables (Material 3 Theme)              │
│   - State Hoisting & Reactive UI updates                    │
│   - NavHost & Type-Safe Hash Route Navigation               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Observes StateFlow
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│   - ViewModels (AuthViewModel, VaultViewModel, etc.)         │
│   - UI State Management via StateFlow<Resource<T>>          │
│   - Coroutine Scope lifecycle management                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Invokes Use Cases / Repositories
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & Network Layer                     │
│   - Repositories (VaultRepository, AuthRepository, etc.)    │
│   - Retrofit 2 + OkHttp 4 REST Clients                      │
│   - AuthInterceptor (JWT Bearer Injection & 401 handling)   │
│   - RenderWakeupHandler (Cold start polling & backoff)      │
│   - EncryptedSharedPreferences (Hardware KeyStore Tokens)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Modules & Responsibilities

### Core Layer (`com.famdoc.app.core`)
* **`config/AppConfig.kt`**: Centralized configuration resolver providing base URL and debug flags.
* **`network/ApiClient.kt`**: Singleton factory for Retrofit services, custom OkHttp timeouts (30s connect / 60s read/write), GZip compression support, and logging interceptors.
* **`network/AuthInterceptor.kt`**: Injects `Authorization: Bearer <jwt_token>` header on all authenticated endpoints. Listens for HTTP 401 responses and dispatches unauthorized events to automatically clear invalid sessions.
* **`network/RenderWakeupHandler.kt`**: Monitors server readiness on Render's free tier, performs exponential backoff heartbeat checks against `/api/health`, and updates UI state to show non-blocking connection alerts.
* **`network/NetworkConnectionObserver.kt`**: Emits real-time network capability states using Android `ConnectivityManager` callbacks.
* **`security/SecureTokenManager.kt`**: Manages session tokens and cached user profiles using AES-256 GCM encrypted storage via Android KeyStore.
* **`utils/FileUtils.kt`**: Handles Android Storage Access Framework (SAF) document picking, multipart payload preparation, byte formatting, and FileProvider system viewers.
* **`utils/ErrorTranslator.kt`**: Maps backend FastAPI/Pydantic validation error payloads and network failures into user-friendly messages.

### Data Layer (`com.famdoc.app.data`)
* **`api/*`**: Retrofit interfaces mapping 100% of the FastAPI backend routes.
* **`models/*`**: Pure Kotlin data classes matching JSON response schemas (`User`, `Family`, `FileItem`, `FolderItem`, `DashboardStats`, `StorageAccount`, `ShareLink`, `RecycleBinData`).
* **`repository/*`**: Single source of truth abstracting network calls into `Resource<T>` wrappers (`Success`, `Error`, `Loading`, `Idle`).

### UI Layer (`com.famdoc.app.ui`)
* **`theme/*`**: Curated colors, typography, shapes, and dynamic light/dark Material 3 themes.
* **`components/*`**: Reusable widgets (App bars, bottom navigation, navigation drawers, file rows, folder cards, stat cards, breadcrumb bars, upload progress modals, share modals, confirm dialogs).
* **`screens/*`**: Dedicated Jetpack Compose screens for all user flows.
* **`viewmodel/*`**: AAC ViewModels exposing unidirectional data flows.

---

## 3. Data Flow Example: File Upload Flow

```text
[User selects file in VaultScreen via SAF File Picker]
                         │
                         ▼
[VaultViewModel.uploadFile(Uri)]
                         │
                         ▼
[VaultRepository.uploadFile(Uri, folderId)]
                         │
                         ▼
[FileUtils.prepareMultipartPart() -> OkHttp RequestBody]
                         │
                         ▼
[FilesApi.uploadFile() -> POST /api/files/upload]
                         │
                         ▼
[Backend writes to vault & schedules cloud sync]
                         │
                         ▼
[FilesApi returns HTTP 201 FileItem JSON]
                         │
                         ▼
[VaultViewModel receives Resource.Success(FileItem)]
                         │
                         ▼
[VaultViewModel triggers loadFiles() + loadFolders()]
                         │
                         ▼
[VaultScreen updates LazyColumn with animated item enter]
```
