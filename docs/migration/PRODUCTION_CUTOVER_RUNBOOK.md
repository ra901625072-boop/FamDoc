# 🚀 FamDoc (FDMS) Cloudflare Production Cutover Runbook

This runbook outlines the exact sequence of operational steps to migrate the FamDoc backend from Render to Cloudflare with **zero data loss**, **minimal downtime (< 2 minutes)**, and **backwards compatibility** for legacy mobile and web clients.

---

## 📋 Pre-Flight Checklist & Prerequisites

- [ ] **Cloudflare Account**: Workers Paid Plan active (required for Cloudflare Containers and Hyperdrive).
- [ ] **Wrangler CLI**: Installed and authenticated (`wrangler --version` >= 3.80.0).
- [ ] **Supabase PostgreSQL**: Active and accessible. Hyperdrive connection string noted (port 6543 / 5432).
- [ ] **Docker Engine**: Installed locally or container build pipeline enabled.
- [ ] **Domain Access**: DNS management for `famdoc.com` (to point `api.famdoc.com` CNAME).
- [ ] **Render Dashboard**: Access to `famdoc-backend.onrender.com` service settings.
- [ ] **Vercel Dashboard**: Access to `famdoc` frontend project settings.

---

## 🔐 Step 1: Provision Cloudflare Resources & Secrets

### 1.1 Create R2 Vault Bucket
```bash
# Create R2 bucket for production document storage
wrangler r2 bucket create famdoc-vault

# Create R2 bucket for staging
wrangler r2 bucket create famdoc-vault-staging
```

### 1.2 Create Hyperdrive Database Connection Pooler
```bash
# Connect Hyperdrive to Supabase PostgreSQL (replace with your actual Supabase DB credentials)
wrangler hyperdrive create famdoc-db-pool \
  --connection-string="postgres://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

# Record the Hyperdrive ID returned and update wrangler.toml if needed:
# id = "<HYPERDRIVE_ID>"
```

### 1.3 Provision Production Secrets
Execute each command and paste the secret value when prompted (never commit secrets to git!):

```bash
# Application Security
wrangler secret put JWT_SECRET
wrangler secret put JWT_ALGORITHM

# Supabase Database Direct String (used inside container)
wrangler secret put DATABASE_URL

# Cloudflare R2 Credentials (S3 API compatibility for boto3)
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET_NAME
wrangler secret put R2_ENDPOINT_URL

# Google Drive API Multi-Account Encryption & OAuth
wrangler secret put FERNET_KEY
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Email Notifications (Password Reset OTP)
wrangler secret put RESEND_API_KEY
wrangler secret put SMTP_HOST
wrangler secret put SMTP_PORT
wrangler secret put SMTP_USERNAME
wrangler secret put SMTP_PASSWORD
wrangler secret put SMTP_FROM_EMAIL
```

---

## 🧪 Step 2: Deploy & Validate Staging Environment

### 2.1 Build & Deploy to Staging
```bash
# Deploy to staging environment
wrangler deploy --env staging
```

### 2.2 Verify Staging Health Check
```bash
curl -i https://staging-api.famdoc.com/health
# Expected: HTTP 200 {"status": "healthy", "service": "famdoc-backend-container", ...}
```

### 2.3 Run Staging Automated Test Suite
```bash
python -m pytest backend/tests/test_redesign.py backend/tests/test_all_14_algorithms.py backend/tests/test_multi_drive_algorithm.py -q
# Expected: 47 passed
```

---

## 📦 Step 3: Local Vault Data Migration to Cloudflare R2

Run the idempotent migration script to copy any lingering local disk vault files from Render to Cloudflare R2:

```bash
# 1. Run dry-run first to inspect files to be transferred
python scripts/migrate_local_to_r2.py --dry-run

# 2. Execute live migration with SHA-256 integrity verification
python scripts/migrate_local_to_r2.py

# Expected Output:
# ==================================================================
#                       MIGRATION SUMMARY                           
# ==================================================================
# Total Records Scanned: X
# Total Files Uploaded:  X
# Total Failures:        0
# SUCCESS: All staged files successfully verified and updated!
```

---

## 🚢 Step 4: Deploy Production to Cloudflare

Deploy the edge router, container configuration, and cron triggers to production:

```bash
wrangler deploy --env production
```

Verify production health endpoint:
```bash
curl -i https://api.famdoc.com/health
```

---

## 🔄 Step 5: Zero-Downtime Client Cutover

### 5.1 Update Vercel Frontend Proxy
1. Ensure `frontend/vercel.json` rewrite points to `https://api.famdoc.com/api/:path*`.
2. Deploy frontend to Vercel:
   ```bash
   git add frontend/vercel.json frontend/js/api.js frontend/js/upload-manager.js
   git commit -m "chore(prod): cutover frontend API target to Cloudflare"
   git push origin main
   ```
3. Verify web SPA loads and logs in cleanly at `https://famdoc.vercel.app`.

### 5.2 Deploy Render HTTP 308 Redirect Proxy (Mobile Compatibility)
Existing mobile devices running `FamDoc.apk` have `https://famdoc-backend.onrender.com` compiled in bytecode. To prevent immediate breakage:

1. In Render Dashboard (`famdoc-backend` service):
   - Change start command to:
     ```bash
     uvicorn backend.render_redirect_app:app --host 0.0.0.0 --port $PORT
     ```
   - Add Environment Variable:
     ```
     REDIRECT_TARGET_DOMAIN = https://api.famdoc.com
     ```
2. Trigger manual deploy on Render.
3. Verify HTTP 308 redirect preserving POST body and headers:
   ```bash
   curl -i -X POST https://famdoc-backend.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@famdoc.com","password":"test"}'
   # Expected: HTTP/1.1 308 Permanent Redirect
   # Location: https://api.famdoc.com/api/auth/login
   ```

---

## 🔍 Step 6: Post-Cutover Verification Checklist

Run through these verification scenarios:

- [ ] **Health & Readiness**: `GET https://api.famdoc.com/health` returns HTTP 200.
- [ ] **Authentication**: User login, register, and token refresh succeed.
- [ ] **Metadata Fetching**: Document listing and folder hierarchy load quickly via Hyperdrive connection pooling.
- [ ] **Small File Upload (<50MB)**: Multipart upload succeeds via `/api/files/upload`.
- [ ] **Large Video Upload (>50MB)**: Direct presigned R2 upload succeeds via `/api/files/upload-url` and `/api/files/upload-complete`.
- [ ] **File Download & Streaming**: Viewing PDF/images and streaming audio/video returns HTTP 200/206 with correct Content-Type.
- [ ] **Cron Triggers**: Check Cloudflare Dashboard -> Workers -> Triggers -> `0 3 * * *` executed successfully.
- [ ] **Legacy Redirect**: Mobile app requests to Render are seamlessly forwarded via HTTP 308 to Cloudflare without user re-login.

---

## 🚨 Emergency Rollback Playbook

If critical blockers arise on Cloudflare (e.g., container failure, unresolvable latency spike, or database pool exhaustion):

### Triggers for Rollback
- Error rate > 2% for 5 consecutive minutes on Cloudflare.
- Database connection pool exhaustion.
- Critical document corruption or loss.

### Rollback Procedure (< 3 minutes)
1. **Revert Render Start Command**:
   In Render Dashboard, change start command back to original FastAPI server:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
2. **Revert Frontend Vercel Proxy**:
   In `frontend/vercel.json`, revert destination back to:
   ```json
   "destination": "https://famdoc-backend.onrender.com/api/:path*"
   ```
   Deploy to Vercel.
3. **Drain R2 Cache to Local Vault (if any new files were uploaded during window)**:
   ```bash
   # Run reverse sync script if needed
   python scripts/sync_r2_to_local.py
   ```
4. **Notify Team & Post-Mortem**: Document root cause in `docs/migration/post-mortem.md`.
