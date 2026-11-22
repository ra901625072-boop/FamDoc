# FDMS UI/UX Comprehensive Audit & Polish Specification (Phase 1)
**Project:** FamDoc (FDMS) — Family Document Vault  
**Author:** Senior Product Designer (UI/UX) & Front-End Engineer  
**Date:** 2026-11-22  
**Status:** Phase 1 Complete (Read-Only Audit & Baseline Capture)  

---

## 1. Executive Summary & Verification of Known Observations

All 8 observations provided in the project brief have been verified in code with exact file and line citations.

| # | Known Observation | Code Evidence | Status | Root Cause & UX Impact |
|---|-------------------|---------------|--------|------------------------|
| **1** | Green used everywhere across app | `frontend/src/styles/variables.css:13-91`, `AppLayout.tsx:91`, `DashboardPage.tsx:44,99,312`, `dashboard.css:51,106,128`, `layout.css:84,516` | **VERIFIED** | Emerald/mint `#047857`, `#10B981`, `#34D399` dominates brand buttons, active tabs, cards, links, badges, and canvas glows. |
| **2** | Storage distribution: bar invisible, `0 B (0)` mono, empty clutter, orphan "Other" wrap | `DashboardPage.tsx:216,244-300`, `dashboard.css:241,294` | **VERIFIED** | Progress bar computes `(size / quotaBytes) * 100`, which renders 0% to 1% for small vaults. Grid is `repeat(6, 1fr)` for 7 items, stranding "Other" on row 2. Empty items always render. Monospace font applied to standard text. |
| **3** | Space Occupied card: 4% sliver glitch, no quota context | `DashboardPage.tsx:176-184` | **VERIFIED** | `Math.max(4, ...)` forces a minimum 4% bar even when 0 bytes stored. Quota is hardcoded to `15 * 1024 * 1024 * 1024` without displaying total capacity (e.g., "0 B of 15 GB"). |
| **4** | Vault Activity displays raw constants | `DashboardPage.tsx:418-420` | **VERIFIED** | Directly prints `{act.action}` (`DOWNLOAD_FILE`, `UPLOAD_FILE`, `CREATE_FOLDER`, etc.) without mapping to friendly human language. |
| **5** | Recent Uploads thumbnail clipped or broken | `DashboardPage.tsx:345-361`, `dashboard.css:357` | **VERIFIED** | CSS rule `#recent-uploads-list .vault-item img.item-thumbnail` specifies `position: static !important;`, conflicting with inline `position: absolute; inset: 0`, shoving image out of the 40x40 overflow-hidden box. |
| **6** | Sidebar: incorrect theme icon, unclear action icons, truncated email, low contrast labels, heavy footer buttons | `SegmentedThemeSelector.tsx:12`, `DashboardPage.tsx:137,141`, `AppLayout.tsx:148,195,205`, `layout.css:474,568,634,1118` | **VERIFIED** | Auto theme uses `fas fa-magic` (resembles a pencil/stylus at 12px). Quick actions use `fa-ticket-alt` for invite and `fa-hdd` for storage. Email has hard truncation without title/tooltip. `.drawer-section-label` has 3.56:1 contrast (fails WCAG AA 4.5:1). APK download and Sign Out are visually dominant full-width colored blocks. |
| **7** | Inconsistent theme styles (dark green block in light mode, pure black illegible surfaces in dark mode) | `variables.css:48-49,149-163`, `layout.css:530` | **VERIFIED** | Light sidebar header uses `--drawer-header-bg: linear-gradient(135deg, #064E3B 0%, #047857 100%)`. Dark mode uses AMOLED pitch black `#000000` with `#111113` cards and `#26262B` borders (1.10:1 contrast, indistinguishable). Dark active nav uses white text on `#34D399` (1.79:1 contrast, extreme WCAG failure). |
| **8** | "Connected" lacks context; monospace font overused | `ConnectionPill.tsx:35`, `dashboard.css:224,294,393`, `vault.css:479` | **VERIFIED** | Pill only states "Connected". Monospace `JetBrains Mono` is applied to non-code labels like "Pooled Cloud Storage", file format pills, sizes, and chips. |

---

## 2. Inventory of Screens, Routes, Shared Components & Modals

### A. Screens & Routes
1. **Public Landing Page** (`/` or `/#/`) — `frontend/src/pages/LandingPage.tsx`
2. **Login Page** (`/#/login`) — `frontend/src/pages/auth/LoginPage.tsx`
3. **Register Page** (`/#/register`) — `frontend/src/pages/auth/RegisterPage.tsx`
4. **Join Family Page** (`/#/join`) — `frontend/src/pages/auth/JoinPage.tsx`
5. **Forgot Password Page** (`/#/forgot-password`) — `frontend/src/pages/auth/ForgotPasswordPage.tsx`
6. **Public Share Page** (`/#/share/:token`) — `frontend/src/pages/SharedPage.tsx`
7. **Dashboard Page** (`/#/dashboard`) — `frontend/src/pages/DashboardPage.tsx`
8. **Shared Vault Page** (`/#/vault`) — `frontend/src/pages/VaultPage.tsx`
9. **Cloud Storage Pool Page** (`/#/storage`) — `frontend/src/pages/StoragePage.tsx`
10. **Family Group Page** (`/#/family`) — `frontend/src/pages/FamilyPage.tsx`
11. **Recycle Bin Page** (`/#/trash`) — `frontend/src/pages/TrashPage.tsx`
12. **Profile & Security Page** (`/#/profile`) — `frontend/src/pages/ProfilePage.tsx`

### B. Shared Layout & Global Components
1. **`AppLayout`** (`frontend/src/components/layout/AppLayout.tsx`):
   - Desktop collapsible sidebar (260px)
   - Mobile top App Bar header (64px) with hamburger and brand logo
   - Mobile backdrop drawer overlay (`.drawer-backdrop`)
   - Mobile floating bottom navigation pill (72px, 5 tabs)
   - Desktop re-open floating menu trigger (`.desktop-menu-toggle`)
   - Floating upload queue drawer (`UploadCard.tsx`)
2. **`ConnectionPill`** (`frontend/src/components/common/ConnectionPill.tsx`):
   - Ping status dot, latency indicator, state text.
3. **`SegmentedThemeSelector`** (`frontend/src/components/common/SegmentedThemeSelector.tsx`):
   - 3-way toggle (Auto, Light, Dark).
4. **`ThemeToggle`** (`frontend/src/components/common/ThemeToggle.tsx`):
   - 2-way toggle button.
5. **`GoogleSignInButton`** (`frontend/src/components/auth/GoogleSignInButton.tsx`):
   - Google identity federation button.
6. **`UploadCard`** (`frontend/src/components/common/UploadCard.tsx`):
   - Active upload batch monitoring card with progress bars.

### C. Modals, Dialogs & Overlays
1. **Create Folder Modal** — `VaultPage.tsx:1021` (`#modal-create-folder`)
2. **Rename File/Folder Modal** — `VaultPage.tsx:1071` (`#modal-rename`)
3. **Move Item Modal** — `VaultPage.tsx:1120` (`#modal-move`)
4. **Bulk Move Items Modal** — `VaultPage.tsx:1178` (`#modal-bulk-move`)
5. **Share File Modal** — `VaultPage.tsx:1236` (`#modal-share`)
6. **File Preview Lightbox Modal** — `VaultPage.tsx:1297` (`#modal-preview`) with image zoom, video player, PDF viewer.
7. **Invite Member Modal** — `FamilyPage.tsx:465` (`#modal-invite`)
8. **Edit Drive Label Modal** — `StoragePage.tsx:780`
9. **Assign Storage Account Modal** — `StoragePage.tsx:823`
10. **Native Confirm Dialogs** (`window.confirm`) — `FamilyPage.tsx:100,123`, `StoragePage.tsx:107`, `TrashPage.tsx:35,42,49,60`
11. **Toast Notifications** — `DashboardPage.tsx:94-102`, `FamilyPage.tsx`, `ProfilePage.tsx`

---

## 3. Comprehensive Color Inventory (Green, Teal, Emerald, Mint & Collisions)

| Path & Line | Color Value / Class | Current Usage | Theme | Category | Target Blue Token / Decision |
|---|---|---|---|---|---|
| `variables.css:13` | `#047857` | `--color-primary` (Deep Emerald Forest) | Light | **Brand/Decorative** | Primary Blue 600 (`#2563EB` or `#1D4ED8`) |
| `variables.css:14` | `#10B981` | `--color-primary-light` (Bright Mint) | Light | **Brand/Decorative** | Primary Blue 500 (`#3B82F6`) |
| `variables.css:15` | `#064E3B` | `--color-primary-dark` (Deep Spruce) | Light | **Brand/Decorative** | Primary Blue 900 (`#1E3A8A` or `#172554`) |
| `variables.css:16` | `#0D9488` | `--color-secondary` (Sage Teal) | Light | **Brand/Decorative** | Secondary Navy / Slate Blue (`#0F172A` / `#334155`) |
| `variables.css:17` | `#D1FAE5` | `--color-primary-container` (Mint Highlight) | Light | **Brand/Decorative** | Soft Blue Tint 50/100 (`#EFF6FF` / `#DBEAFE`) |
| `variables.css:18` | `#064E3B` | `--color-on-primary-container` | Light | **Brand/Decorative** | Deep Blue Ink (`#1E3A8A`) |
| `variables.css:21` | `#F6FAF8` | `--bg-linen` (Mint-tinted white canvas) | Light | **Brand/Decorative** | Clean Neutral Slate 50 (`#F8FAFC`) |
| `variables.css:23` | `#EEF5F1` | `--surface-paper-tint` (Subtle sage tint) | Light | **Brand/Decorative** | Neutral Surface Tint (`#F1F5F9`) |
| `variables.css:24` | `#F2F7F4` | `--surface-paper-hover` (Card hover) | Light | **Brand/Decorative** | Elevated Hover (`#E2E8F0` / `#EDF2F7`) |
| `variables.css:30` | `#0F2A1D` | `--text-ink` (Deep Emerald Black) | Light | **Brand/Decorative** | High-Contrast Slate Black (`#0F172A`) |
| `variables.css:31` | `#4B6B5D` | `--text-ink-muted` (Sage Slate) | Light | **Brand/Decorative** | Muted Slate (`#64748B`) |
| `variables.css:34` | `#D9E5DE` | `--border-paper` (Sage-tinted border) | Light | **Brand/Decorative** | Neutral Slate Border (`#E2E8F0`) |
| `variables.css:36` | `rgba(16,185,129,0.22)` | `--card-glow-border` (Mint glow) | Light | **Brand/Decorative** | Blue Glow Border (`rgba(37,99,235,0.18)`) |
| `variables.css:42` | `linear-gradient(#047857,#0D9488)` | `--accent-gradient` | Light | **Brand/Decorative** | Royal Blue Gradient (`#2563EB` to `#1D4ED8`) |
| `variables.css:48-49` | `linear-gradient(#064E3B,#047857)` | `--appbar-bg`, `--drawer-header-bg` | Light | **Brand/Decorative** | Replace dark green header with clean elevated surface |
| `variables.css:76` | `#047857` | `--folder-color` | Light | **Brand/Decorative** | Warm Folder Amber (`#D97706` / `#F59E0B`) or Vault Indigo |
| `variables.css:85-87` | `#D1FAE5`, `#047857`, `#A7F3D0` | `--syncing-*` (Sync badge tokens) | Light | **Semantic** | Decision: Sky Blue (`#0284C7`) or Emerald |
| `variables.css:90-91` | `#E1EFE7`, `#F5FCF8` | `--shimmer-*` (Greenish skeleton shimmer) | Light | **Brand/Decorative** | Neutral Shimmer (`#F1F5F9` / `#FFFFFF`) |
| `variables.css:141` | `#34D399` | `--color-primary` (Luminous Mint) | Dark | **Brand/Decorative** | Electric Blue 400 (`#60A5FA` or `#38BDF8`) |
| `variables.css:142` | `#6EE7B7` | `--color-primary-light` (Soft Mint) | Dark | **Brand/Decorative** | Light Blue 300 (`#93C5FD`) |
| `variables.css:144` | `#2DD4BF` | `--color-secondary` (Bright Teal) | Dark | **Brand/Decorative** | Cyan / Sky 400 (`#38BDF8`) |
| `variables.css:145-146` | `#14291F`, `#A7F3D0` | `--color-primary-container`, `--color-on-*` | Dark | **Brand/Decorative** | Dark Blue Pill (`#1E293B`, `#93C5FD`) |
| `variables.css:149` | `#000000` | `--bg-linen` (Pitch Black AMOLED) | Dark | **Brand/Decorative** | Rich Dark Navy Obsidian (`#0B0F17` / `#0F172A`) |
| `variables.css:150` | `#111113` | `--surface-card` (Indistinguishable card) | Dark | **Brand/Decorative** | Elevated Obsidian Surface (`#151C2C` / `#1E293B`) |
| `variables.css:162` | `#26262B` | `--border-paper` (Faint border) | Dark | **Brand/Decorative** | Visible Dark Border (`#283548` / `#334155`) |
| `variables.css:164` | `rgba(52,211,153,0.2)` | `--card-glow-border` | Dark | **Brand/Decorative** | Blue Glow Border (`rgba(96,165,250,0.2)`) |
| `variables.css:170` | `linear-gradient(#34D399,#2DD4BF)` | `--accent-gradient` | Dark | **Brand/Decorative** | Electric Blue Gradient (`#3B82F6` to `#60A5FA`) |
| `variables.css:204` | `#34D399` | `--folder-color` | Dark | **Brand/Decorative** | Dark Folder Warm Gold / Indigo (`#FBBF24` / `#818CF8`) |
| `frontend/index.html:8` | `#047857` | `<meta name="theme-color">` | Both | **Brand/Decorative** | Brand Blue (`#1E3A8A` light, `#0B0F17` dark) |
| `AppLayout.tsx:91` | `#6EE7B7` | Inline brand text `Fam<span style="#6EE7B7">Doc</span>` | Light/Dark | **Brand/Decorative** | Brand Blue Accent (`#3B82F6`) |
| `SharedPage.tsx:67` | `text-emerald-600 dark:text-emerald-400` | Brand text `FamDoc` | Both | **Brand/Decorative** | `text-blue-600 dark:text-blue-400` |
| `ConnectionPill.tsx:8` | `bg-emerald-500` | Status dot for "Connected" | Both | **Semantic** | Decision: keep semantic green `#10B981` or cyan |
| `UploadCard.tsx:36,75` | `text-emerald-500`, `bg-emerald-500` | Upload success icon & bar | Both | **Semantic** | Decision: keep semantic green `#10B981` or blue |
| `DashboardPage.tsx:44` | `#10b981` | Sheet category segment | Both | **Data-viz** | Category Emerald Green (distinguishable from Blue) |
| `DashboardPage.tsx:99` | `text-emerald-500` | Toast success checkmark | Both | **Semantic** | Semantic Success Green (`#10B981`) |
| `DashboardPage.tsx:399` | `var(--color-primary-light)` | Live stream dot | Both | **Brand/Decorative** | Electric Blue Dot (`#3B82F6`) |
| `dashboard.css:106` | `#10B981` | Total Files icon color | Light | **Brand/Decorative** | Blue 600 (`#2563EB`) |
| `dashboard.css:128` | `#0D9488` | Space Occupied icon color | Light | **Brand/Decorative** | Indigo / Slate 600 (`#4F46E5`) |
| `layout.css:84,95` | `rgba(16,185,129,0.12)`, `rgba(52,211,153,0.12)` | Ambient background glowing orbs | Light/Dark | **Brand/Decorative** | Ambient Soft Blue (`rgba(59,130,246,0.08)`) |
| `layout.css:516,530` | `var(--color-primary)` | Active navigation background | Light/Dark | **Brand/Decorative** | Primary Blue 600 (`#2563EB`) |
| `backend/utils/email.py:25-32` | `#047857`, `#064E3B`, `#10B981`, `#F0FAF4` | Email template header & code card | Both | **Brand/Decorative** | Brand Royal Blue & Slate Blue |
| `android/Color.kt:9-20` | `MintPrimary`, `MintBackground`, etc. | Android Light theme tokens | Light | **Brand/Decorative** | Android Blue Palette (documented in spec) |

### D. Colliding Existing Blues and Purples
1. **Existing Category Color for Images:** `--cat-images: #3B82F6` (Modern Blue).  
   *Collision Risk:* If brand becomes primary blue, images and brand identity collide directly.  
   *Recommendation:* Re-assign Images to **Vibrant Cyan / Sky Blue (`#0EA5E9`)** or **Turquoise**, keeping Primary Blue dedicated to the brand and action layers.
2. **Existing Category Color for Docs vs Folders:** `--cat-docs: #8B5CF6` (Vault Violet) and `#card-stat-folders: #8B5CF6`.  
   *Collision Risk:* Folders stat icon is purple, identical to Docs files.  
   *Recommendation:* Keep Folders as **Warm Keepsake Amber (`#F59E0B`)** or **Cobalt Blue (`#2563EB`)**, reserving Purple (`#8B5CF6`) strictly for document files.
3. **Google Drive Integration Colors:** Google uses `#4285F4` (Google Blue), `#EA4335` (Red), `#FBBC05` (Yellow), `#34A853` (Green).  
   *Collision Risk:* The primary blue should be deeper and more dignified (e.g. Royal Blue `#1D4ED8` or `#0052FF`) so it is never confused with a third-party Google Drive account.

---

## 4. WCAG 2.2 Contrast & Accessibility Analysis

Relative luminance $L = 0.2126 R' + 0.7152 G' + 0.0722 B'$. Contrast Ratio = $(L_1 + 0.05) / (L_2 + 0.05)$.

| Element & State | Foreground Color | Background Color | Computed Ratio | WCAG 2.2 AA Result | Severity & Impact |
|---|---|---|---|---|---|
| Light Primary Text | `#0F2A1D` ($L=0.021$) | `#FFFFFF` ($L=1.000$) | **14.79:1** | **PASS AAA** (>=7.0:1) | Optimal reading contrast |
| Light Muted Text | `#4B6B5D` ($L=0.128$) | `#FFFFFF` ($L=1.000$) | **5.90:1** | **PASS AA** (>=4.5:1) | Acceptable |
| Sidebar APPEARANCE Label | `#4B6B5D` @ 0.8 opacity (~`#6F897D`, $L=0.245$) | `#FFFFFF` ($L=1.000$) | **3.56:1** | **FAIL AA** (<4.5:1 for 0.68rem) | **P2** — hard to read for elderly family members |
| Primary Button Text (Light) | `#FFFFFF` ($L=1.000$) | `#047857` ($L=0.139$) | **5.56:1** | **PASS AA** (>=4.5:1) | Legible |
| Stat Icon Text (Files) | `#10B981` ($L=0.359$) | `#FFFFFF` ($L=1.000$) | **2.57:1** | **FAIL AA** (<3.0:1 UI component) | **P1** — icon washed out against white |
| Dark Background to Card Surface | `#111113` ($L=0.005$) | `#000000` ($L=0.000$) | **1.10:1** | **SEVERE FAIL** (<3.0:1 boundary) | **P0** — card surfaces completely invisible |
| Dark Card Border | `#26262B` ($L=0.019$) | `#111113` ($L=0.005$) | **1.25:1** | **SEVERE FAIL** (<3.0:1 boundary) | **P0** — card outlines disappear on OLED |
| Dark Active Nav Item Text | `#FFFFFF` ($L=1.000$) | `#34D399` ($L=0.536$) | **1.79:1** | **SEVERE FAIL** (<4.5:1 text) | **P0** — active menu text completely illegible |
| Dark Muted Text | `#A1A1AA` ($L=0.353$) | `#111113` ($L=0.005$) | **7.33:1** | **PASS AAA** (>=7.0:1) | Legible |
| Dark Preview Format Badge | `#34D399` ($L=0.536$) | `rgba(16,185,129,0.22)` (~`#15382B`, $L=0.038$) | **6.66:1** | **PASS AA** | Legible |

---

## 5. Prioritized Issue Table (Top 30 Issues)

| ID | Screen / Area | Issue Description & Heuristic Violation | Exact Code Evidence | Severity | Effort |
|---|---|---|---|---|---|
| **ISS-01** | Global / Shell | **Dark Mode Active Nav Item has 1.79:1 contrast (White text on neon mint).** Extreme accessibility failure. | `layout.css:530-539` | **P0** | **S** |
| **ISS-02** | Global / Shell | **Dark mode pure black AMOLED `#000000` canvas leaves card surfaces (`#111113`, 1.10:1 contrast) and borders (`#26262B`, 1.25:1) invisible.** | `variables.css:149-163` | **P0** | **M** |
| **ISS-03** | Dashboard | **Recent Vault Uploads image thumbnails clipped or invisible due to CSS `position: static !important` overriding inline `position: absolute`.** | `DashboardPage.tsx:350`, `dashboard.css:357` | **P0** | **S** |
| **ISS-04** | Dashboard | **Storage category progress bar fill invisible for small vaults (computes `< 1%` of 15GB). Empty categories clutter grid with `0 B (0)` monospace.** | `DashboardPage.tsx:216,244-300`, `dashboard.css:241` | **P1** | **M** |
| **ISS-05** | Dashboard | **"Other" category chip wraps alone onto second row due to hardcoded `repeat(6, 1fr)` grid with 7 items.** | `dashboard.css:241-249` | **P1** | **S** |
| **ISS-06** | Dashboard | **Space Occupied card has arbitrary 4% sliver glitch (`Math.max(4, ...)`) and no used-of-total quota context.** | `DashboardPage.tsx:176-184` | **P1** | **S** |
| **ISS-07** | Dashboard | **Vault Activity displays raw uppercase constants (`DOWNLOAD_FILE`, `UPLOAD_FILE`, `CREATE_FOLDER`) instead of human sentences.** | `DashboardPage.tsx:418-420` | **P1** | **S** |
| **ISS-08** | Sidebar / Shell | **Light theme sidebar header is a dark spruce/green block (`#064E3B`), conflicting with the light, airy theme.** | `variables.css:48-49` | **P1** | **S** |
| **ISS-09** | Sidebar | **Appearance toggle uses `fas fa-magic` for Auto, looking like a tilted pencil/stylus at 12px instead of standard system/display icon.** | `SegmentedThemeSelector.tsx:12` | **P1** | **S** |
| **ISS-10** | Sidebar | **APPEARANCE section header label has 3.56:1 contrast against white background, failing WCAG AA (4.5:1 required).** | `layout.css:568,572` | **P1** | **S** |
| **ISS-11** | Quick Actions | **Invite Member uses `fas fa-ticket-alt` (admission ticket voucher) instead of user-add icon; Cloud Storage uses `fas fa-hdd` instead of cloud.** | `DashboardPage.tsx:137,141` | **P1** | **S** |
| **ISS-12** | Global / Header | **"Connected" pill dot is green and does not indicate what system it is connected to (FamDoc Cloud Vault).** | `ConnectionPill.tsx:8,35` | **P1** | **S** |
| **ISS-13** | Sidebar | **Sidebar secondary actions (Get Android App and Sign Out) are visually dominant full-width colored blocks, overpowering primary nav.** | `layout.css:634-650,1118-1150` | **P1** | **M** |
| **ISS-14** | Sidebar | **User email truncates abruptly in sidebar without tooltip or full display.** | `layout.css:474-479` | **P2** | **S** |
| **ISS-15** | Vault | **Vault folder color is hardcoded green (`#047857` / `#34D399`) and conflicts with document category colors.** | `variables.css:76,204` | **P1** | **S** |
| **ISS-16** | Vault | **Search bar and filter type dropdown lack accessible focus-visible rings.** | `vault.css:120-160` | **P2** | **S** |
| **ISS-17** | Vault | **Empty state in Vault has generic icon without clear guidance or drag-and-drop cue.** | `VaultPage.tsx:610-630` | **P2** | **M** |
| **ISS-18** | Storage | **Storage page capacity hero uses green gradient (`#10B981` to `#059669`) and green category indicators.** | `StoragePage.tsx:438,461`, `storage.css:130` | **P1** | **S** |
| **ISS-19** | Storage | **Unconnected Google Drive card uses hardcoded yellow warning borders without subtle dark mode elevation.** | `storage.css:429,478,588` | **P2** | **S** |
| **ISS-20** | Family | **Family group invite link expiration text uses hardcoded green `#10b981` instead of design tokens.** | `FamilyPage.tsx:215,517` | **P2** | **S** |
| **ISS-21** | Family | **Member actions (promote/demote/remove) rely on browser `window.confirm` dialogs rather than polished branded modals.** | `FamilyPage.tsx:100,123` | **P2** | **M** |
| **ISS-22** | Trash | **Permanently delete and restore actions use browser native `window.confirm` rather than destructive modal dialogs.** | `TrashPage.tsx:35,42,49,60` | **P2** | **M** |
| **ISS-23** | Profile | **2FA active indicators use hardcoded `#10b981` green inline styles.** | `ProfilePage.tsx:261,305,593,598` | **P2** | **S** |
| **ISS-24** | Auth Pages | **Auth pages (Login, Register, Join, Forgot Password) have green focus outlines and green submit buttons.** | `auth.css:45-120` | **P1** | **M** |
| **ISS-25** | Public Share | **Shared page uses Tailwind `emerald-600` and `emerald-400` classes in spinner, logo, and download card.** | `SharedPage.tsx:67,78,104` | **P1** | **S** |
| **ISS-26** | Global | **HTML `<meta name="theme-color">` is hardcoded to emerald green `#047857`.** | `frontend/index.html:8` | **P2** | **S** |
| **ISS-27** | Global | **Background ambient radial glow orbs use green rgba values (`rgba(16,185,129,0.12)`).** | `layout.css:84,95` | **P2** | **S** |
| **ISS-28** | Email Template | **Backend password reset email has emerald borders, headings, and green background.** | `backend/utils/email.py:25-32` | **P1** | **S** |
| **ISS-29** | Microcopy | **Inconsistent naming between "Cloud Storage & Quotas" (sidebar) and "Cloud Storage Pool" (quick action).** | `AppLayout.tsx:46`, `DashboardPage.tsx:142` | **P2** | **S** |
| **ISS-30** | Mobile Nav | **Mobile bottom nav active tab indicator pill is mint container (`#D1FAE5`) with green text.** | `layout.css:276,291` | **P1** | **S** |

---

## 6. Top 10 High-Impact Issues

1. **ISS-01 (P0): Illegible Active Nav Item in Dark Mode.** White text on luminous mint has a 1.79:1 contrast ratio, failing WCAG AA (4.5:1 required).
2. **ISS-02 (P0): Indistinguishable Dark Mode Surfaces.** AMOLED black `#000000` with `#111113` cards and `#26262B` borders (1.10:1 ratio) renders card boundaries completely invisible on most displays.
3. **ISS-03 (P0): Broken Recent Uploads Thumbnails.** CSS `position: static !important` conflicts with inline `position: absolute`, clipping or hiding thumbnails in the dashboard feed.
4. **ISS-04 (P1): Invisible Storage Breakdown Bar & Monospace Clutter.** Bar segments for smaller files calculate to sub-1% width; empty categories take up chip slots showing raw `0 B (0)`.
5. **ISS-05 (P1): Orphaned "Other" Storage Chip.** 7 categories inside a 6-column grid leaves "Other" stranded on row 2.
6. **ISS-06 (P1): Space Occupied Slivers & Missing Quota Context.** 4% minimum sliver glitch masks empty state and provides no total capacity ratio (e.g., "3.2 GB of 15 GB").
7. **ISS-07 (P1): Raw Constant Strings in Vault Activity.** Displays backend tokens (`DOWNLOAD_FILE`, `UPLOAD_FILE`) instead of readable sentences with relative timestamps.
8. **ISS-08 (P1): Dark Green Block Header in Light Sidebar.** The dark emerald spruce header banner `#064E3B` creates visual discord with light cards and clean white surfaces.
9. **ISS-09 (P1): Misleading Theme Icon.** `fa-magic` in `SegmentedThemeSelector` renders as a pencil/stylus at small scale instead of a desktop/system monitor icon.
10. **ISS-13 (P1): Secondary Actions Overpowering Sidebar.** "Get Android App" and "Sign Out" full-width colored buttons distract from primary navigation.

---

## 7. Baseline Screenshots Captured

All 48 before-screenshots (12 screens × 2 themes × 2 viewports) have been captured using Playwright and saved to `docs/ui-polish/before-screenshots/`:

- `landing_light_desktop.png`, `landing_light_mobile.png`, `landing_dark_desktop.png`, `landing_dark_mobile.png`
- `login_light_desktop.png`, `login_light_mobile.png`, `login_dark_desktop.png`, `login_dark_mobile.png`
- `register_light_desktop.png`, `register_light_mobile.png`, `register_dark_desktop.png`, `register_dark_mobile.png`
- `join_light_desktop.png`, `join_light_mobile.png`, `join_dark_desktop.png`, `join_dark_mobile.png`
- `forgot-password_light_desktop.png`, `forgot-password_light_mobile.png`, `forgot-password_dark_desktop.png`, `forgot-password_dark_mobile.png`
- `share_light_desktop.png`, `share_light_mobile.png`, `share_dark_desktop.png`, `share_dark_mobile.png`
- `dashboard_light_desktop.png`, `dashboard_light_mobile.png`, `dashboard_dark_desktop.png`, `dashboard_dark_mobile.png`
- `vault_light_desktop.png`, `vault_light_mobile.png`, `vault_dark_desktop.png`, `vault_dark_mobile.png`
- `storage_light_desktop.png`, `storage_light_mobile.png`, `storage_dark_desktop.png`, `storage_dark_mobile.png`
- `family_light_desktop.png`, `family_light_mobile.png`, `family_dark_desktop.png`, `family_dark_mobile.png`
- `trash_light_desktop.png`, `trash_light_mobile.png`, `trash_dark_desktop.png`, `trash_dark_mobile.png`
- `profile_light_desktop.png`, `profile_light_mobile.png`, `profile_dark_desktop.png`, `profile_dark_mobile.png`
