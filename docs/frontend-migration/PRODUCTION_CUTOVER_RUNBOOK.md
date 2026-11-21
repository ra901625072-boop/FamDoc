# FamDoc Frontend Modernization: Production Cutover Runbook

This document defines the formal deployment, verification, and rollback procedures for cutting over the FamDoc frontend from the legacy vanilla HTML/JS implementation to the modern **React 19 + TypeScript + Vite 6 SPA** on **Cloudflare Pages**.

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    User["Family User (Mobile / Desktop)"] -->|HTTPS (famdoc.com)| CFPages["Cloudflare Pages (Global Edge CDN)"]
    CFPages -->|"SPA Fallback (/* /index.html 200)"| ReactApp["React 19 + Vite 6 Client"]
    CFPages -->|"/apk/FamDoc.apk"| AndroidDownload["Android APK Distribution"]
    ReactApp -->|"REST API (/api/*)"| CFWorker["Cloudflare Edge Worker / Containers (api.famdoc.com)"]
    CFWorker -->|"Encrypted Vault Chunks"| GoogleDrive["Multi-Account Google Drive Pool"]
    CFWorker -->|"Large Media Direct PUT (>50MB)"| CloudflareR2["Cloudflare R2 Storage"]
```

- **Target Hosting Platform**: Cloudflare Pages (`famdoc-frontend`)
- **Backend API**: Cloudflare Containers / Hyperdrive (`https://api.famdoc.com`)
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
| **Cloudflare SPA Redirects** | `_redirects` file present with `/* /index.html 200` | Present in `dist/_redirects` | **PASSED** |
| **Security Headers** | `_headers` file with X-Frame-Options, nosniff, cache rules | Present in `dist/_headers` | **PASSED** |
| **Android APK Direct Link** | `public/apk/FamDoc.apk` present for mobile download | Present (21.0 MB) | **PASSED** |

---

## 3. Step-by-Step Cutover Procedure

### Step 3.1: Staging Preview Deployment

Run from repository root:

```powershell
# 1. Build the production bundle
cd frontend
npm ci
npm run build
cd ..

# 2. Deploy preview/staging to Cloudflare Pages
npx wrangler pages deploy frontend/dist --project-name=famdoc-frontend --branch=staging
```

Verify output URL (e.g., `https://staging.famdoc-frontend.pages.dev`).

### Step 3.2: Staging Smoke Verification

Perform the following manual smoke tests on the staging URL:
1. **Public Showcase**: Open homepage; toggle between category tabs (Deeds, Health, Finance, Memories); verify demo modal opens and closes.
2. **Authentication**: Navigate to `/#/login`; verify password toggle works; enter test credentials.
3. **Forgot Password**: Click "Forgot password?"; verify 3-stage OTP wizard transitions.
4. **Vault Explorer**: Log in; navigate to `/#/vault`; create test folder; drag-and-drop file to test upload manager.
5. **Dark Mode**: Click theme toggle; verify seamless transition to AMOLED pitch black theme.
6. **Mobile Responsive**: Open Chrome DevTools in iPhone/Android emulation mode; verify floating bottom nav and mobile top appbar.

---

### Step 3.3: Production Deployment

When staging smoke test passes and explicit sign-off is granted:

```powershell
# Deploy directly to production environment
npx wrangler pages deploy frontend/dist --project-name=famdoc-frontend --branch=main
```

### Step 3.4: Custom Domain & DNS Mapping

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** -> **famdoc-frontend** -> **Custom domains**.
2. Click **Set up a custom domain**.
3. Enter `famdoc.com` (and `www.famdoc.com`).
4. Cloudflare automatically configures the CNAME DNS records and issues the universal SSL/TLS certificate.
5. In **SSL/TLS -> Edge Certificates**, verify **Always Use HTTPS** is enabled.

---

## 4. Rollback Plan

### Level 1: Instant Cloudflare Pages Rollback (< 10 seconds)
If any critical regression occurs post-deployment:
1. In Cloudflare Dashboard -> **Workers & Pages** -> **famdoc-frontend** -> **Deployments**.
2. Locate the previous working deployment.
3. Click the three dots (`...`) -> **Rollback to this deployment**.
4. Traffic instantly shifts back to the previous deployment globally with 0 cache delay.

### Level 2: Git Rollback to Legacy Frontend
The legacy frontend is safely preserved in `frontend-legacy/`.
To restore the legacy frontend in git:
```powershell
# Restore legacy frontend into frontend/
Remove-Item -Recurse -Force frontend/*
Copy-Item -Recurse frontend-legacy/* frontend/
git add frontend/
git commit -m "rollback: revert to legacy frontend"
git push origin feat/frontend-modernization
```

---

## 5. Post-Cutover Health Monitoring

Monitor the following metrics in Cloudflare Web Analytics and browser consoles:
- **HTTP 404 Rate**: Should remain < 0.01% due to `_redirects` SPA fallback.
- **API Latency**: Top bar connection pill should display `Connected (XX ms)`.
- **Largest Contentful Paint (LCP)**: Under 1.2s on 4G mobile connections.
- **First Input Delay (FID) / INP**: Under 50ms.
