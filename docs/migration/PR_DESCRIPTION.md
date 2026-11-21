# Pull Request: Migrate FDMS Backend from Render to Cloudflare

## 🎯 Overview
This PR migrates the **FamDoc (FDMS)** backend infrastructure from Render Web Services to the **Cloudflare Developer Platform** using **Cloudflare Containers (Docker Python 3.11 FastAPI)**, a **Cloudflare Workers TypeScript Edge Router**, **Cloudflare R2** for object storage, and **Cloudflare Hyperdrive** for Supabase PostgreSQL connection pooling.

It ensures **zero data loss**, **minimal cutover downtime (< 2 minutes)**, and **backwards compatibility** for existing Android APK installations and web SPA clients.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Clients["Client Applications"]
        Mobile["📱 Android App (FamDoc.apk)"]
        Web["💻 Web SPA (Vercel)"]
    end

    subgraph Legacy["Legacy Fallback"]
        Render["⚡ Render Web Service<br/>(HTTP 308 Redirect Proxy)"]
    end

    subgraph Cloudflare["Cloudflare Global Network"]
        Edge["🌐 Workers Edge Router (src/index.ts)"]
        Container["🐳 Cloudflare Container (FastAPI Python 3.11)"]
        R2[("🪣 Cloudflare R2 (famdoc-vault)")]
        Hyperdrive["⚡ Hyperdrive Connection Pooler"]
        Cron["⏰ Cron Trigger (0 3 * * *)"]
    end

    subgraph Storage["Persistent Data Layer"]
        Supabase[("🐘 Supabase PostgreSQL")]
        GDrive["📁 Google Drive Multi-Account Pool"]
    end

    Mobile -.->|Legacy Hardcoded URL| Render
    Render ==>|HTTP 308 Permanent Redirect| Edge
    Mobile -->|Updated APK| Edge
    Web -->|Vercel Proxy Rewrite| Edge

    Edge -->|Proxy Request| Container
    Edge -->|Direct Presigned PUT (>50MB)| R2
    Cron -->|Daily Purge Event| Container

    Container -->|Query via Pooler| Hyperdrive --> Supabase
    Container -->|Primary Sync| GDrive
    Container -->|Direct Vault Fallback| R2
```

---

## 🚀 Key Improvements & Highlights

1. **Docker Container Packaging (`backend/Dockerfile`)**:
   - Python 3.11-slim builder with non-root user (`famdoc:10001`), production gunicorn/uvicorn workers, and automated health checks.
2. **500MB Video Upload Bypass (`backend/routers/files.py`, `frontend/js/upload-manager.js`)**:
   - Cloudflare edge request body is capped at 100MB on Free/Pro plans. Added presigned R2 direct upload endpoints (`/api/files/upload-url` and `/api/files/upload-complete`) allowing up to 500MB file uploads directly to R2.
3. **Dual-Tier R2 Fallback Provider (`backend/storage/r2_provider.py`)**:
   - Boto3 S3-compatible client for Cloudflare R2 with automatic fallback cascade: Primary Google Drive -> Failover Cloudflare R2 (`famdoc-vault`) -> Local disk fallback.
4. **Idempotent Migration Script (`scripts/migrate_local_to_r2.py`)**:
   - Migrates local vault files to R2 with SHA-256 and byte-length verification before updating database records.
5. **Legacy Client Backwards-Compatibility (`backend/render_redirect_app.py`)**:
   - Existing mobile devices running `FamDoc.apk` retain hardcoded `famdoc-backend.onrender.com` URLs in bytecode. A lightweight FastAPI app deployed to Render issues HTTP 308 Permanent Redirects, preserving request verbs and JSON/multipart bodies.
6. **Automated CI/CD Pipeline (`.github/workflows/deploy-cloudflare.yml`)**:
   - GitHub Actions workflow that executes all 47 pytest tests and automatically deploys to Cloudflare staging and production via Wrangler.
7. **Comprehensive Runbook (`docs/migration/PRODUCTION_CUTOVER_RUNBOOK.md`)**:
   - Pre-flight checklist, secret provisioning commands, validation scenarios, and a <3-minute emergency rollback playbook.

---

## 🧪 Testing & Verification

- **Automated Test Suite**: 47/47 tests passed (`backend/tests/test_redesign.py`, `backend/tests/test_all_14_algorithms.py`, `backend/tests/test_multi_drive_algorithm.py`).
- **Render Redirect Unit Tests**: Verified HTTP 308 response and location header across GET, POST, and query parameters.
- **Migration Script**: Dry-run verified against local SQLite database.
- **Wrangler v4 Configuration**: Verified syntax and schema parsing for Cloudflare Containers, R2, and Hyperdrive.

---

## 📋 Reviewer Checklist

- [ ] Verify `wrangler.toml` bindings (`VAULT_BUCKET`, `HYPERDRIVE`, `FAMDOC_CONTAINER`).
- [ ] Ensure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are configured in GitHub Actions.
- [ ] Review `docs/migration/PRODUCTION_CUTOVER_RUNBOOK.md` before initiating production cutover.
