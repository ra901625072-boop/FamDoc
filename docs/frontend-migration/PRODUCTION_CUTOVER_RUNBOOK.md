# FamDoc Production Cutover Runbook

This document defines the formal deployment, verification, and rollback procedures for the FamDoc multi-cloud production architecture:
- **Frontend**: **Vercel** (Global Edge CDN running modern **React 19 + TypeScript + Vite 6 SPA**)
- **Backend**: **Cloudflare** (Cloudflare Edge Worker / Containers running FastAPI on `https://api.famdoc.com`)
- **Database**: **Supabase** (Managed PostgreSQL with PgBouncer connection pooling & Hyperdrive)
- **Object Storage**: **Google Drive Multi-Account Pooling** + **Cloudflare R2** for media >50MB

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    User["Family User (Mobile / Desktop)"] -->|HTTPS (famdoc.com)| VercelEdge["Vercel Global Edge Network"]
    VercelEdge -->|"SPA Rewrite (/(.*) -> /index.html)"| ReactApp["React 19 + Vite 6 Client"]
    VercelEdge -->|"/apk/FamDoc.apk"| AndroidDownload["Android APK Distribution"]
    ReactApp -->|"REST API (api.famdoc.com)"| CFWorker["Cloudflare Edge Worker / Containers (FastAPI)"]
    CFWorker -->|"Encrypted Vault Chunks"| GoogleDrive["Multi-Account Google Drive Pool"]
    CFWorker -->|"Large Media Direct PUT (>50MB)"| CloudflareR2["Cloudflare R2 Storage"]
    CFWorker -->|"PostgreSQL Pooler (Session / Transaction)"| Supabase[("Supabase PostgreSQL DB")]
```

- **Target Frontend Host**: Vercel (`famdoc.com` / `famdoc-frontend.vercel.app`)
- **Target Backend Host**: Cloudflare Edge Containers / Hyperdrive (`https://api.famdoc.com`)
- **Target Database Host**: Supabase PostgreSQL (`aws-0-[region].pooler.supabase.com:6543`)
- **API Contracts**: Zero changes (`[VERIFIED]`: 43 endpoints called with exact legacy signatures)
- **Legacy Fallback Directory**: `frontend-legacy/` preserved and committed in git

---

## 2. Pre-Deployment Verification Checklist

| Check | Target / Requirement | Result | Status |
| :--- | :--- | :---: | :---: |
| **Playwright Parity Suite** | 8/8 tests passing against built assets (`frontend/dist`) | 8/8 Passed (19.3s) | **PASSED** |
| **TypeScript Typecheck** | Zero errors with strict mode enabled | `tsc -b` exited 0 | **PASSED** |
| **Vite Production Build** | Zero rollup warnings, clean sourcemap generation | `vite build` exited 0 | **PASSED** |
| **Initial Gzip Bundle Budget** | Total Initial JS + CSS < 250 KB | **~151 KB** total gzip | **PASSED** |
| **Vercel SPA Rewrites** | `vercel.json` rewrite `/(.*) -> /index.html` configured | Present at root & `frontend/` | **PASSED** |
| **Backend CORS Whitelist** | Whitelist `https://.*\.vercel\.app` and `https://.*\.famdoc\.com` | Configured in `backend/main.py` | **PASSED** |
| **Supabase DB Connection** | Connection pooler URL configured in `DATABASE_URL` | Configured in `backend/config.py` | **PASSED** |
| **Security Headers** | X-Frame-Options, nosniff, cache-control headers | Configured in `vercel.json` & `_headers` | **PASSED** |
| **Android APK Direct Link** | `public/apk/FamDoc.apk` present for mobile download | Present (21.0 MB) | **PASSED** |

---

## 3. Step-by-Step Cutover Procedure

### Step 3.1: Frontend Deployment on Vercel

#### Option A: GitHub Integration (Recommended)
1. Push branch `feat/frontend-modernization` or merge into `main`.
2. Connect repository in [Vercel Dashboard](https://vercel.com/new).
3. Vercel auto-detects `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
4. Set Environment Variables in Vercel:
   - `VITE_API_BASE_URL`: `https://api.famdoc.com`
5. Deploy. Preview URL is generated automatically (e.g. `famdoc-frontend-*.vercel.app`).

#### Option B: Vercel CLI
```powershell
# From repository root
npx vercel
# Follow prompts to link project, then deploy to production:
npx vercel --prod
```

### Step 3.2: Custom Domain Mapping on Vercel
1. In Vercel Project -> **Settings** -> **Domains**.
2. Add `famdoc.com` (and `www.famdoc.com`).
3. Set DNS records (A record to `76.76.21.21` or CNAME `cname.vercel-dns.com`).
4. Vercel automatically provisions SSL/TLS certificate.

### Step 3.3: Backend Deployment on Cloudflare
```powershell
# Deploy Cloudflare Edge backend
npx wrangler deploy --env production
```

### Step 3.4: Supabase Database Migrations
Verify database schema and run any pending migrations:
```powershell
cd backend
python -c "from database import run_migrations; run_migrations()"
```

---

## 4. Rollback Plan

### Level 1: Instant Vercel Instant Rollback (< 5 seconds)
1. In Vercel Project -> **Deployments**.
2. Select previous deployment -> Click three dots (`...`) -> **Promote to Production** (or **Instant Rollback**).
3. Traffic instantly shifts back globally.

### Level 2: Git Rollback to Legacy Frontend
The legacy vanilla frontend is tracked in `frontend-legacy/`.
```powershell
Remove-Item -Recurse -Force frontend/*
Copy-Item -Recurse frontend-legacy/* frontend/
git add frontend/
git commit -m "rollback: revert to legacy vanilla frontend"
git push origin feat/frontend-modernization
```

---

## 5. Post-Cutover Health Monitoring

Monitor the following metrics in Cloudflare Web Analytics and browser consoles:
- **HTTP 404 Rate**: Should remain < 0.01% due to `_redirects` SPA fallback.
- **API Latency**: Top bar connection pill should display `Connected (XX ms)`.
- **Largest Contentful Paint (LCP)**: Under 1.2s on 4G mobile connections.
- **First Input Delay (FID) / INP**: Under 50ms.
