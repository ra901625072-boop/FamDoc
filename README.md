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
- ⚡ **Modern React 19 + Vite 6 SPA:** Ultra-fast modern frontend with TypeScript, TanStack Query v5 caching, Zustand state, Tailwind CSS design tokens, IndexedDB background upload queue, and full-screen document previewers, hosted on **Vercel**.
- ☁️ **Production Deployable Architecture:**
  - **Frontend:** Hosted on **Vercel** with automated SPA rewrites and edge caching (`vercel.json`).
  - **Backend:** Hosted on **Railway** via Dockerfile container with dynamic `$PORT` binding (`railway.json`).
  - **Database:** Hosted on **Supabase** (PostgreSQL with SSL transaction pooler and connection resilience).

---

## 🏗️ Architecture Flow

```mermaid
flowchart TD
    subgraph Clients["Clients Layer"]
        A["📱 Android App (Jetpack Compose)"]
        B["💻 Web SPA (React 19 + Vite 6 on Vercel)"]
    end

    subgraph Backend["FastAPI Backend Engine (Railway)"]
        C["API Gateway & JWT Auth"]
        D["Storage Router & Queue"]
        E["Fernet Encryption Engine"]
    end

    subgraph Storage["Storage & Persistence Layer"]
        F[("🐘 Supabase PostgreSQL")]
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
│   ├── app/                   # API routes, core security, models, services
│   ├── Dockerfile             # Multi-stage container for Railway deployment
│   ├── requirements.txt       # Python dependencies (FastAPI, SQLAlchemy, psycopg2)
│   └── main.py                # Server entry point
├── frontend/                  # Modern Web SPA (React 19 + TypeScript + Vite 6)
│   ├── src/                   # Components, pages, hooks, stores, API client
│   ├── public/                # Static assets, Android APK download
│   ├── vercel.json            # Subdirectory Vercel deployment configuration
│   └── vite.config.ts         # Vite bundler configuration
├── frontend-legacy/           # Preserved legacy Vanilla JS frontend
├── docs/                      # Technical specifications & UI/UX polish audits
├── tests/e2e/                 # Playwright E2E parity test suite
├── Dockerfile                 # Root Dockerfile for Railway backend deployment
├── railway.json               # Railway deployment configuration
├── vercel.json                # Root Vercel deployment configuration
├── build_apk.bat              # One-click Android APK build script
└── install_debug.bat          # ADB debug install script
```

---

## 🚀 Getting Started

### 1. Backend Setup (Local Development)

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

### 3. Production Deployment (Vercel + Railway + Supabase)

#### A. Frontend on Vercel
1. Import repository into **Vercel**.
2. If Root Directory is left as `./`, `vercel.json` will automatically build `frontend/dist`.
3. Under **Settings → Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://<your-railway-app>.up.railway.app`
4. Deploy.

#### B. Backend on Railway
1. Create a new project on **Railway** connected to this GitHub repository.
2. Railway detects `railway.json` and `Dockerfile` automatically.
3. Under **Variables**, add:
   - `DATABASE_URL` = Your Supabase PostgreSQL connection string (e.g. `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`)
   - `JWT_SECRET` = A secure random secret string
   - `FRONTEND_URL` = `https://<your-vercel-app>.vercel.app`
4. Railway will build the container, bind to `$PORT`, and run health checks at `/api/health`.

#### C. Database on Supabase
1. Create a project in [Supabase](https://supabase.com).
2. Go to **Project Settings → Database → Connection String**.
3. Select **URI** mode and copy the transaction pooler connection string (Port `6543`) or direct string (`5432`).
4. Set as `DATABASE_URL` in Railway. Tables and migrations initialize automatically on server start.

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

---

##  FamDoc Front-End Motion Guide (Apple-Calibrated System)

FamDoc uses a unified, physical, Apple-inspired motion design language (iOS / iPadOS / visionOS feel). Animations are designed to feel responsive, tactile, and calm—easy to notice, never flashy, never cartoonish, and never causing layout shift.

### 1. Design Tokens & Single Source of Truth

The central motion system lives in [`frontend/src/lib/motion.ts`](file:///d:/FDMS/frontend/src/lib/motion.ts) and [`frontend/src/styles/variables.css`](file:///d:/FDMS/frontend/src/styles/variables.css). Never hardcode magic numbers inside components.

| Token | Value | Target Interaction |
| :--- | :--- | :--- |
| **Duration: instant** | `100ms` / `0.10s` | Tactile press feedback, micro-clicks |
| **Duration: fast** | `180ms` / `0.18s` | Hover states, tooltips, segmented switches |
| **Duration: base** | `280ms` / `0.28s` | Cards, modals, dialogs, dropdowns, toasts |
| **Duration: slow** | `420ms` / `0.42s` | Page transitions, large drawers, hero reveals |
| **Ease: Apple Out** | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard natural deceleration |
| **Ease: Apple In-Out** | `cubic-bezier(0.45, 0, 0.55, 1)` | Color switches, ambient fades |
| **Spring: Default** | `{ stiffness: 260, damping: 28, mass: 1 }` | Cards, tiles, menus, toast entrances |
| **Spring: Gentle** | `{ stiffness: 200, damping: 26, mass: 1 }` | Bottom sheets, full modals, overlay drawers |
| **Spring: Snappy** | `{ stiffness: 400, damping: 30, mass: 0.8 }` | Segmented controls, switches, buttons |
| **Press Scale** | `0.97` | Tactile tap/click compression |
| **Hover Lift** | `translateY(-2px)` | Soft elevation without layout disruption |
| **Entry Translate** | `8px - 12px` | Natural upward settling distance |

### 2. Standard Motion Patterns

#### A. Interactive Buttons & Controls (`tactilePress`)
```tsx
import { motion } from 'motion/react';
import { tactilePress } from '../lib/motion';

<motion.button className="btn btn-primary" {...tactilePress}>
  Save Document
</motion.button>
```

#### B. Modals, Dialogs & Bottom Sheets
```tsx
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalDialogVariants } from '../lib/motion';

<AnimatePresence>
  {isOpen && (
    <motion.div
      className="modal-overlay"
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="famdoc-modal"
        variants={modalDialogVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

#### C. Cards, Grids & Staggered Lists
```tsx
import { motion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants, tactileCard } from '../lib/motion';

<motion.div className="vault-grid" variants={staggerContainerVariants} initial="initial" animate="animate">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItemVariants} {...tactileCard}>
      <ItemCard item={item} />
    </motion.div>
  ))}
</motion.div>
```

#### D. Segmented Tabs with Sliding Active Pill (`layoutId`)
```tsx
import { motion } from 'motion/react';
import { springs } from '../lib/motion';

<button onClick={() => setTab(id)} style={{ position: 'relative' }}>
  {active && (
    <motion.div
      layoutId="active-pill"
      className="active-pill-background"
      transition={springs.snappy}
    />
  )}
  <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
</button>
```

### 3. Golden Motion Rules
1. **GPU Only**: Animate exclusively `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, or `margin` directly.
2. **Apple Restraint**: Max translation is 8-12px. No cartoonish bouncy overshoot (`1.56` or `1.75`) — use `cubic-bezier(0.22, 1, 0.36, 1)`.
3. **Accessibility**: Every motion variant respects `prefers-reduced-motion: reduce`. When enabled, spatial translations collapse to pure, instant opacity crossfades.
4. **Vercel & Next/Vite Safety**: All motion code is isolated in a standalone vendor chunk (`motion.js`) with zero SSR hydration mismatch.

---

##  FamDoc Minimal Design System & Token Guide

FamDoc follows an Apple-level minimalism mindset inspired by iOS, iCloud, Apple Notes, and Apple Files. The hero theme is **Light Mode**, with a deep neutral dark mode.

### 1. Palette & The 60/30/10 Rule

| Role | Percentage | Light Theme Token (Default) | Dark Theme Token | Purpose |
| :--- | :---: | :--- | :--- | :--- |
| **Canvas** | 60% | `--bg-linen: #FAFAFB` (Warm Off-White) | `--bg-linen: #0B0B0F` (Deep Charcoal) | Never pure `#FFF` or pitch `#000` |
| **Surface** | 30% | `--surface-card: #FFFFFF` + `1px solid rgba(0,0,0,0.06)` | `--surface-card: #141419` + `1px solid #23232A` | Clean cards, elevated sheets |
| **Accent** | 10% | `--color-primary: #2563EB` / Container: `#EFF6FF` | `--color-primary: #3B82F6` / Container: `#1E293B` | One single brand color only |

### 2. Apple Lighting & Depth System

```css
/* Soft Layered Shadows */
--shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.04);
--shadow-md: 0 4px 12px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.04);
--shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.10), 0 2px 6px rgba(16, 24, 40, 0.05);

/* Specular Card Top Highlight (Light comes from above) */
--card-inner-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.9);
```

### 3. Strict Spatial & Geometric Rhythm

* **4px / 8px Grid Scale**: Padding: `16px` / `24px`; Section gaps: `32px` / `48px`.
* **Corner Radii Scale**:
  * Inputs & buttons: `12px` (`--radius-md`)
  * Cards & containers: `16px` (`--radius-lg`)
  * Bottom sheets & modals: `24px` (`--radius-2xl`)
  * Pills & badges: `9999px` (`--radius-pill`)
* **Typography**:
  * Titles: 1–3 words, 600/700 weight, sentence case.
  * Body copy: 400/450 weight, max 1 line descriptions, Slate/Gray 500 (`#6B7280`).
  * Contrast: Always $\ge 4.5:1$ against backgrounds.

### 4. Golden Rules for Adding New UI

1. **One Focus Per Screen**: Exactly one primary action button per view. Secondary actions are quiet text/icon buttons.
2. **Progressive Disclosure**: Show 4 to 6 items maximum on main views, followed by a clean "View all →" link.
3. **No Rainbow Clutter**: Avoid multi-color category badges or rainbow card borders. Stick to the primary blue accent + neutral slate.
4. **Zero FOUC Theme Delivery**: The default theme is `light`. The inline pre-hydration script in `index.html` resolves theme state prior to DOM paint.
