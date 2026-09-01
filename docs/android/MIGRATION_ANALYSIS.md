# FamDoc Android Migration & Architecture Audit Analysis

**Project**: Family Document Management System (FamDoc)  
**Author**: Senior Android Architect & Full-Stack Engineer  
**Status**: Approved for Native Android Migration  
**Date**: August 2026  

---

## 1. Existing Architecture Overview

The existing FamDoc system is structured as a modern, decoupled web application:

```text
┌─────────────────────────────────────────────────────────┐
│              Web Frontend (Vercel)                      │
│   Vanilla JS SPA, Responsive CSS, ApiCache, Hash Router │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / REST JSON
                            ▼
┌─────────────────────────────────────────────────────────┐
│            Backend API Service (Render)                 │
│   FastAPI Python Server, JWT Auth, Crypto Encryption    │
│   Storage Pooling Engine, Background Worker Threads     │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│    Database (Supabase)    │ │    Cloud Storage Layer    │
│  PostgreSQL / SQLAlchemy  │ │ Multi-Account Google Drv  │
│  Files, Folders, Roster   │ │ + Local Vault Fallback    │
└───────────────────────────┘ └───────────────────────────┘
```

The Android client will connect directly to the existing **Render Backend API** over secure HTTPS without introducing a second backend or modifying database schemas.

---

## 2. Frontend Architecture Analysis

* **Framework**: Zero-framework Vanilla JavaScript ES6+ Single-Page Application (SPA).
* **Routing**: Hash-based client-side routing (`#/`, `#/login`, `#/register`, `#/join`, `#/dashboard`, `#/vault`, `#/trash`, `#/family`, `#/storage`, `#/profile`, `#/shared/:token`, `#/forgot-password`).
* **State Management & Caching**: Custom `ApiCache` with request deduplication, in-memory TTL stores, prefix-based invalidation upon mutations (`invalidateOnMutation`), and `localStorage` persistence for session keys.
* **UI Design System**: Curated design tokens (`variables.css`), dark/light mode toggle with theme persistence, responsive sidebars, bottom navigation bars for mobile viewport widths, skeleton loading placeholders, and toast notification queues.
* **Upload Management**: XHR with `upload.onprogress` calculation, drag-and-drop overlays, and file type validation before submission.
* **Connection Resilience**: `connection-manager.js` and `background-manager.js` providing heartbeat ping checks against `/api/health`, offline queuing, and notification banners when Render free-tier containers spin up.

---

## 3. Backend Architecture Analysis

* **Framework**: FastAPI (Python 3.10+) running on Uvicorn ASGI server with GZip response compression.
* **Modular Routers**:
  - `routers/auth.py`: Registration, login, family invitation code join, JWT creation, token revocation, profile updates, and email OTP password resets.
  - `routers/family.py`: Family setup, member roster management, member removal, details query, and code regeneration.
  - `routers/folders.py`: Hierarchical folder creation, nested subfolder resolution, renaming, moving, and soft deletion.
  - `routers/files.py`: Multipart file upload, magic byte signature validation, filename sanitization, download streaming, preview streaming, preview tokens, and soft deletion.
  - `routers/storage_config.py`: Storage mode configuration (`local` vs `google`), multi-account Google Drive pooling, quota tracking, and OAuth authorization URL generation.
  - `routers/recycle_bin.py`: Soft-deleted item listing, recursive folder restoration, and permanent purge.
  - `routers/search.py`: Multi-criteria search (keyword, mime type category, uploader, date range).
  - `routers/dashboard.py`: Aggregated statistics, storage usage breakdown by category, recent uploads, and audit log activities.
  - `routers/share.py`: Time-limited, password-protected public share link creation, revocation, and public file downloading.
* **Background Workers**:
  - `retention-cleanup-worker`: Daemon thread automatically purging items deleted for more than 30 days.
  - `storage-sync-worker`: Daemon thread polling pending files for background cloud promotion.

---

## 4. Database Architecture Analysis

* **Engine**: PostgreSQL hosted on Supabase (production) with SQLite support for local development.
* **Entity Relationships**:
  - `User`: Primary user model with role (`admin` vs `member`), email, username, password hash, and active JWT identifier (`current_token_jti`).
  - `Family`: Family group vault model with unique 8-character secret code hash, SHA-256 lookup index, admin foreign key, max member limits, and storage quota bytes.
  - `FamilyMember`: Join table connecting `User` and `Family` with composite unique constraint `(family_id, user_id)`.
  - `Folder`: Hierarchical folder entity with `parent_id` foreign key referencing `folders.id`, soft-delete tracking (`deleted_at`, `deletion_batch_id`), and provider cloud folder IDs (`google_drive_folder_id`, `cloud_folder_id`).
  - `File`: Document metadata entity with size, MIME type, folder relationship, uploader relationship, storage provider indicators, sync status flags (`pending_sync`, `sync_retry_count`), and cloud file references.
  - `StorageAccount`: Multi-account Google Drive connection pool with encrypted refresh token storage (`_config`), cached quota tracking (`cached_quota_total`, `cached_quota_used`), and status flags.
  - `SharedLink`: Tokenized public share links with optional argon2 password hashing, download counters, and expiration timestamps.
  - `AuditLog`: Action audit logs recording events (`LOGIN`, `UPLOAD`, `DELETE`, `RESTORE`, etc.) with client IP and timestamps.
  - `RevokedToken`: Table storing invalidated JWT JTIs upon logout.
  - `PasswordResetOTP`: Table storing 6-digit OTPs with expiration and usage flags.

---

## 5. API Inventory & Contract

| Router | Method | Path | Auth Required | Description |
|---|---|---|---|---|
| Auth | POST | `/api/auth/register` | No | Creates new admin and provisions family vault |
| Auth | POST | `/api/auth/login` | No | Authenticates user with email & password |
| Auth | POST | `/api/auth/family-login` | No | Joins family using 8-character secret code |
| Auth | GET | `/api/auth/me` | Yes | Retrieves user profile and family metadata |
| Auth | PUT | `/api/auth/profile` | Yes | Updates username and/or password |
| Auth | POST | `/api/auth/logout` | Yes | Revokes current JWT token |
| Auth | POST | `/api/auth/forgot-password/request` | No | Generates and sends 6-digit reset OTP |
| Auth | POST | `/api/auth/forgot-password/verify` | No | Validates reset OTP code |
| Auth | POST | `/api/auth/forgot-password/reset` | No | Consumes OTP and sets new password |
| Family | POST | `/api/family/setup` | Yes | Configures family vault name & member limit |
| Family | GET | `/api/family/members` | Yes | Lists all active members in the family |
| Family | DELETE | `/api/family/members/{user_id}` | Yes (Admin) | Removes a member from the family |
| Family | GET | `/api/family/details` | Yes | Gets family vault quota & code details |
| Family | POST | `/api/family/regenerate-code` | Yes (Admin) | Regenerates 8-character family invitation code |
| Storage | GET | `/api/storage/config` | Yes | Retrieves storage mode and active configuration |
| Storage | POST | `/api/storage/config/mode` | Yes (Admin) | Changes active mode (`local` vs `google`) |
| Storage | GET | `/api/storage/accounts` | Yes | Lists connected Google accounts & quota usage |
| Storage | PATCH | `/api/storage/accounts/{id}` | Yes (Admin) | Updates account label or pooling priority |
| Storage | POST | `/api/storage/accounts/{id}/disconnect`| Yes (Admin) | Disconnects Google account |
| Storage | DELETE | `/api/storage/accounts/{id}` | Yes (Admin) | Deletes Google account record |
| Storage | POST | `/api/storage/oauth/url` | Yes (Admin) | Generates OAuth consent screen URL |
| Folders | GET | `/api/folders` | Yes | Lists all active folders with file counts & sizes |
| Folders | POST | `/api/folders` | Yes | Creates a new folder or subfolder |
| Folders | PUT | `/api/folders/{id}` | Yes | Renames a folder |
| Folders | PATCH | `/api/folders/{id}/move` | Yes | Moves folder to a new parent folder |
| Folders | DELETE | `/api/folders/{id}` | Yes | Soft-deletes a folder and all descendants |
| Files | GET | `/api/files?folder_id={id}` | Yes | Lists files in folder or root vault |
| Files | POST | `/api/files/upload` | Yes | Uploads file (multipart/form-data) |
| Files | PUT | `/api/files/{id}` | Yes | Renames a file |
| Files | PATCH | `/api/files/{id}/move` | Yes | Moves file to target folder |
| Files | DELETE | `/api/files/{id}` | Yes | Soft-deletes a file |
| Files | GET | `/api/files/{id}/download` | Yes | Streams binary content for download |
| Files | GET | `/api/files/{id}/preview` | Yes / Token | Streams preview content |
| Files | GET | `/api/files/{id}/preview-token` | Yes | Generates short-lived preview token |
| Share | POST | `/api/files/{id}/share` | Yes | Creates public share link |
| Share | GET | `/api/files/{id}/share` | Yes | Lists active share links for file |
| Share | DELETE | `/api/shared/links/{token}` | Yes | Revokes share link |
| Share | GET | `/api/shared/{token}` | No | Public file information |
| Share | POST | `/api/shared/{token}/download` | No | Public file download with password verification |
| Recycle Bin | GET | `/api/recycle-bin` | Yes | Lists soft-deleted files and folders |
| Recycle Bin | POST | `/api/recycle-bin/{type}/{id}/restore` | Yes | Restores soft-deleted file or folder |
| Recycle Bin | DELETE | `/api/recycle-bin/{type}/{id}/purge` | Yes (Admin) | Permanently deletes item from disk/cloud |
| Search | GET | `/api/search` | Yes | Filters files by query, category, uploader, date |
| Dashboard | GET | `/api/dashboard/stats` | Yes | Aggregates file stats, categories, recent uploads & logs |
| Health | GET | `/api/health` | No | Server heartbeat and cold-start verification |

---

## 6. Authentication Flow

```text
[User Action: Login]
         │
         ▼
POST /api/auth/login (email, password)
         │
         ▼
[Backend Validates Credentials & Returns JWT access_token]
         │
         ▼
[Android App: Store token in EncryptedSharedPreferences]
         │
         ▼
GET /api/auth/me (Bearer Token Interceptor)
         │
         ▼
[Cache User & Family Profile in Local State -> Navigate to Dashboard]
```

### Session Expiration & 401 Handling
1. All requests pass through `AuthInterceptor` which automatically injects `Authorization: Bearer <token>`.
2. When the backend returns HTTP 401 Unauthorized, `AuthInterceptor` captures the response, notifies the session manager, purges the encrypted storage, and triggers a clean navigation event back to `LoginScreen` with a friendly "Session expired" message.

---

## 7. File & Storage Architecture

* **Multi-Account Storage Pooling**: The backend dynamically balances uploads across connected Google accounts based on free space.
* **Local Vault Fallback**: If Google Drive is unconfigured, files reside safely in local persistent storage.
* **Safe Filename Filtering**: Files must match `^[\w\-. ()\[\]]+$` and belong to allowed extensions (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.txt`).
* **Android Storage Access Framework (SAF)**: Android will interact with documents via `ActivityResultContracts.OpenDocument()` and `ActivityResultContracts.GetContent()` to ensure sandboxed, permission-safe file selection.

---

## 8. Current UI/UX Analysis & Web-to-Mobile Conversion

| Web Screen | Web Pattern | Android Mobile Redesign Pattern |
|---|---|---|
| **Landing** | Hero section with 3 cards | Native Welcome screen with onboarding carousel & quick action cards |
| **Login / Register / Join** | Center floating card modal | Material 3 Auth flow with password visibility toggles & biometric entry ready |
| **Forgot Password** | Inline form card | 3-step Wizard (Email -> 6-digit OTP verification -> Password Reset) |
| **Dashboard** | 3-column stat cards + 2 large boxes | Fluid vertical dashboard with horizontal category breakdown chips, Quick Actions FAB, and pull-to-refresh |
| **Vault / File Explorer** | Desktop toolbar + Grid/List + Breadcrumb row | Native File Explorer with interactive Breadcrumb chip scroll, floating action menu, multi-select contextual app bar, and bottom sheet action drawer |
| **File Preview** | Modal with canvas/iframe | Native Full-Screen Document Viewer with pinch-to-zoom for images, formatted text renderer, and PDF preview stream |
| **Recycle Bin** | Desktop table with checkboxes | Swipeable list with contextual selection app bar, instant restore chip, and confirmation dialogs |
| **Family Settings** | Table with member rows | Material Card Roster with avatar chips, role badges, swipe-to-remove, and 1-tap invitation code sharing stub |
| **Storage Config** | Complex settings panel | Multi-account visual capacity meters, storage mode toggle, and Google OAuth launch in Custom Tabs |
| **Profile** | Form grid | Clean settings preference layout with secure credential change dialogs |

---

## 9. Mobile Compatibility Problems Identified & Solutions

1. **Cold Start Latency on Render Free Tier**:
   - *Problem*: Server may take 30-50 seconds to spin up from sleep.
   - *Solution*: `RenderWakeupHandler` with progressive retry, exponential backoff, and a dedicated non-blocking visual wake-up banner ("Connecting to secure vault...").
2. **File Downloads & Viewing**:
   - *Problem*: Browser blob URLs do not work on native Android.
   - *Solution*: Native `DownloadManager` with notification progress + local secure cache streaming with system `Intent.ACTION_VIEW` for external viewers.
3. **Session Persistence**:
   - *Problem*: Unsecured `localStorage` can be vulnerable on rooted devices.
   - *Solution*: Android Jetpack `EncryptedSharedPreferences` backed by Android KeyStore hardware cryptography.
4. **Offline Resilience**:
   - *Problem*: Blank screen on temporary network loss.
   - *Solution*: Android `NetworkConnectionObserver` displaying offline cached state with automatic synchronization upon network reconnection.

---

## 10. Security Audit & Hardening

* **No Hardcoded Secrets**: Base URLs and non-sensitive configuration only in `BuildConfig`. Zero API secrets or database passwords bundled inside the APK.
* **Encrypted Storage**: Master encryption keys stored in hardware-backed KeyStore.
* **Network Security Config**: Enforced HTTPS (`cleartextTrafficPermitted="false"`) with TLS 1.3/1.2 support.
* **ProGuard / R8 Obfuscation**: Enabled in release mode with optimized rules to strip debug logs, obfuscate class names, and shrink unused code.

---

## 11. Android Migration Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Large file uploads causing memory pressure | App crash / Out of Memory | Stream multipart file bodies via OkHttp `RequestBody` using content URIs directly rather than buffering entire byte arrays into RAM. |
| Background storage sync delay | User confusion on file availability | Immediate local availability indicator with sync badge ("Synced" vs "Pending Sync"). |
| Deep linking / OAuth token exchange | Interrupted login flow | Android Custom Tabs with proper intent filters and OAuth redirect interceptors. |
| Incompatible file formats | Preview failure | Universal preview engine with fallback to external system viewers via `FileProvider`. |

---

## 12. Recommended Android Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Jetpack Compose)               │
│   Screens, Components, Theme, Navigation, Bottom Sheets     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Observes UI State (StateFlow)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│   ViewModels (Hilt / Jetpack), UI State MVI Reducers        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Invokes Use Cases / Repositories
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│   Business Rules, Models, Validation, Mappers               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Data Requests
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│   Repositories (Vault, Auth, Family, Storage, Dashboard)    │
│   Remote: Retrofit2 + OkHttp + JSON Serializers             │
│   Local: EncryptedSharedPreferences + Cache Store           │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Recommended Technology Stack

* **Language**: Kotlin 2.0+
* **UI Toolkit**: Jetpack Compose + Material Design 3
* **Asynchronous Programming**: Kotlin Coroutines + Flow / StateFlow
* **Networking**: Retrofit 2.11 + OkHttp 4.12 + Gson / Kotlinx Serialization
* **Image Loading & Cache**: Coil Compose
* **Security & Storage**: AndroidX Security Crypto (`EncryptedSharedPreferences`)
* **Build System**: Gradle 8.x + Android Gradle Plugin 8.5+
* **Min SDK**: API 24 (Android 7.0 - Covers >96% of active devices)
* **Target & Compile SDK**: API 34 / 35 (Android 14 / 15)

---

## 14. Build Requirements & System Automation

We provide fully automated Windows `.bat` build scripts:
1. `setup_android.bat`: Verifies Java JDK 17+, Android SDK, platform tools, and initializes environment variables.
2. `build_apk.bat`: Builds debug APK and copies to `builds/debug/FamDoc-debug.apk`.
3. `build_release.bat`: Builds release APK (`builds/release/FamDoc-release-unsigned.apk`) and Play Store bundle (`builds/release/FamDoc-release.aab`).
4. `clean_build.bat`: Cleans all build artifacts and caches.

---

## 15. Testing & Verification Strategy

* **Unit Testing**: Repositories, ViewModels, and state reducer logic with JUnit 4/5 & MockK.
* **Network Testing**: Simulating online, offline, slow 3G, server cold-start timeouts, and 401 token invalidation.
* **UI Testing**: Testing on varying screen sizes (compact phone, large phone, tablet) and light/dark theme modes.
* **Regression Testing**: Ensuring the existing Vercel web frontend and Android app function side-by-side simultaneously against the Render backend.

---

## 16. Final Deliverables Summary

1. Complete Native Android Project in `android/`
2. Automated Build System in `scripts/` and root `.bat` scripts
3. Structured Output Directories (`builds/debug/`, `builds/release/`)
4. Comprehensive Documentation Suite (`docs/*.md` and root docs)
5. Production Readiness Audit & Final Report
