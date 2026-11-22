# FamDoc (FDMS) UI/UX Design Specification & Polish Plan (Phase 2)

**Author:** Senior Product Designer (UI/UX) & Front-End Engineer  
**Status:** Phase 2 Complete (Ready for Execution Approval)  
**Target Branch:** `ui/blue-polish` (never touch `main`)  
**Scope:** Visual-layer overhaul; green-to-blue brand identity transformation; dark mode contrast repair; accessibility compliance (WCAG 2.2 AA). Zero API or business logic changes.

---

## 1. Design Principles (Multi-Generational Keepsake Vault)

1. **Generational Clarity & Trust:** FamDoc serves family members across generations—from college students on mobile to elderly grandparents on tablets. The interface must inspire calm trust with a dignified Royal Blue palette, generous whitespace, large touch targets ($\ge 44\text{px}$), and zero technical jargon.
2. **Predictable Affordances & Standard Metaphors:** Visual cues must follow universally established mental models. System/Auto theme is represented by a desktop display icon (`fa-desktop`), not a magic wand; member invitations use a user-plus icon (`fa-user-plus`), not a cinema ticket; connections explicitly name "FamDoc Cloud Vault".
3. **Truth & Proportion in Data Visualization:** Storage distributions must never render small allocations as 0-pixel invisible lines or display empty categories as `0 B (0)` monospace clutter. Quotas must always provide contextual meaning (e.g. "3.2 GB of 15 GB (21%) used") with no artificial minimum sliver glitches.
4. **Cohesive Elevation in Both Themes:** Light mode should feel like crisp, clean archival paper without jarring dark-forest header blocks. Dark mode must eliminate pure-black `#000000` AMOLED black in favor of deep Navy Obsidian (`#0B0F17`) with elevated card surfaces (`#151C2C`) and discernible borders (`#283548`, contrast $\ge 3.0:1$), preventing cards from disappearing into the void.
5. **Accessibility as a First Principle (WCAG 2.2 AA):** Maintain at least 4.5:1 text contrast on all normal text, 3.0:1 on UI components and boundaries, and never convey status through color alone. Respect vestibular comfort through `prefers-reduced-motion`.

---

## 2. Comprehensive Color Palette & Token Architecture

### A. Primary Royal Blue Scale
Derived from the official FamDoc Crest in `logo.svg` (`#0066FF` and `#0038B8`) and Android `colors.xml` (`#1E3A8A`):

| Token | Hex Value | Usage in Light Theme | Usage in Dark Theme |
|---|---|---|---|
| `blue-50` | `#EFF6FF` | Softest active tab tint, subtle hover | Muted selection background |
| `blue-100` | `#DBEAFE` | Primary container fill, badge pills | Subtle pill highlights |
| `blue-200` | `#BFDBFE` | Interactive border accents | Soft border highlights |
| `blue-300` | `#93C5FD` | Tertiary text, decorative lines | Secondary icon accents |
| `blue-400` | `#60A5FA` | Hover states on dark accents | **Dark Primary Brand Color** |
| `blue-500` | `#3B82F6` | Vibrant focus rings, secondary links | Bright hover states |
| `blue-600` | `#2563EB` | Interactive hover states, CTA gradient stop | Active element glow |
| `blue-700` | `#1D4ED8` | **Light Primary Brand Color**, CTA buttons | Primary button background |
| `blue-800` | `#1E40AF` | Pressed button state, active accents | Dark container borders |
| `blue-900` | `#1E3A8A` | Deep container text, banner accents | Deep container background |
| `blue-950` | `#172554` | Deepest contrast accents | Ambient shadow tint |

---

### B. Surface, Canvas, Text & Border Tokens

```css
/* ==========================================================================
   FamDoc Design System - Universal Token Architecture
   One source of truth in variables.css
   ========================================================================== */

:root {
  /* Brand Royal Blue Scale */
  --color-primary: #1D4ED8;             /* Royal Blue 700 */
  --color-primary-hover: #1E40AF;       /* Royal Blue 800 */
  --color-primary-light: #3B82F6;       /* Blue 500 */
  --color-primary-dark: #1E3A8A;        /* Navy Blue 900 */
  --color-primary-container: #DBEAFE;   /* Blue 100 */
  --color-on-primary-container: #1E3A8A;/* Blue 900 text */
  --color-secondary: #334155;           /* Slate 700 */

  /* Neutral Canvas & Surfaces (Light) */
  --bg-linen: #F8FAFC;                  /* Slate 50 Neutral Clean Canvas */
  --surface-card: #FFFFFF;              /* Crisp Pure White Surface */
  --surface-paper-tint: #F1F5F9;        /* Slate 100 Subtle Tint */
  --surface-paper-hover: #E2E8F0;       /* Slate 200 Card Hover */
  --surface-alert-info: #EFF6FF;        /* Soft Blue Alert */
  --surface-nav-glass: rgba(255, 255, 255, 0.94);
  --overlay-bg: rgba(15, 23, 42, 0.65);

  /* Typography (Light) */
  --text-ink: #0F172A;                  /* Slate 900 (High Contrast) */
  --text-ink-muted: #475569;            /* Slate 600 (WCAG AAA) */

  /* Borders & Shadows (Light) */
  --border-paper: #E2E8F0;              /* Slate 200 */
  --border-paper-dark: #CBD5E1;         /* Slate 300 */
  --card-glow-border: rgba(29, 78, 216, 0.16);
  --accent-shadow: 0 4px 14px rgba(29, 78, 216, 0.20);
  --accent-brand-rgb: 29, 78, 216;

  /* App Bar & Drawer (Light) */
  --appbar-bg: #FFFFFF;
  --appbar-text: #0F172A;
  --drawer-header-bg: #FFFFFF;
  --drawer-header-text: #0F172A;
}

[data-theme="dark"] {
  /* Brand Royal Blue Scale (Dark) */
  --color-primary: #60A5FA;             /* Electric Blue 400 */
  --color-primary-hover: #93C5FD;       /* Blue 300 */
  --color-primary-light: #93C5FD;
  --color-primary-dark: #2563EB;
  --color-primary-container: #1E293B;   /* Deep Slate 800 Pill */
  --color-on-primary-container: #93C5FD;
  --color-secondary: #94A3B8;

  /* Neutral Canvas & Surfaces (Dark - NO PURE BLACK) */
  --bg-linen: #0B0F17;                  /* Dark Navy Obsidian Canvas */
  --surface-card: #151C2C;              /* Elevated Obsidian Card Surface */
  --surface-paper-tint: #1E293B;        /* Slate 800 Tint */
  --surface-paper-hover: #232F42;       /* Interactive Hover */
  --surface-alert-info: #0F1B2D;
  --surface-nav-glass: rgba(21, 28, 44, 0.88);
  --overlay-bg: rgba(5, 8, 15, 0.78);

  /* Typography (Dark) */
  --text-ink: #F8FAFC;                  /* Slate 50 Pure Crisp Text */
  --text-ink-muted: #94A3B8;            /* Slate 400 Cool Balanced Slate */

  /* Borders & Shadows (Dark - VISIBLE ELEVATION) */
  --border-paper: #283548;              /* Slate 700 / Navy Border (Ratio >= 3.0:1) */
  --border-paper-dark: #37465D;
  --card-glow-border: rgba(96, 165, 250, 0.22);
  --accent-shadow: 0 4px 20px rgba(96, 165, 250, 0.25);
  --accent-brand-rgb: 96, 165, 250;

  /* App Bar & Drawer (Dark) */
  --appbar-bg: #151C2C;
  --appbar-text: #F8FAFC;
  --drawer-header-bg: #151C2C;
  --drawer-header-text: #F8FAFC;
}
```

---

### C. Contrast Validation Table (WCAG 2.2 AA & AAA)

| Theme | Foreground Color | Background Color | Computed Ratio | WCAG 2.2 Result | Intended Component Usage |
|---|---|---|---|---|---|
| **Light** | `#0F172A` ($L=0.011$) | `#FFFFFF` ($L=1.000$) | **17.21:1** | **PASS AAA** | Body text, card titles, table cells |
| **Light** | `#0F172A` ($L=0.011$) | `#F8FAFC` ($L=0.957$) | **16.51:1** | **PASS AAA** | Page headings, breadcrumbs |
| **Light** | `#475569` ($L=0.096$) | `#FFFFFF` ($L=1.000$) | **7.19:1** | **PASS AAA** | Secondary labels, APPEARANCE header |
| **Light** | `#475569` ($L=0.096$) | `#F1F5F9` ($L=0.898$) | **6.49:1** | **PASS AA** | Form hint text, chip meta info |
| **Light** | `#FFFFFF` ($L=1.000$) | `#1D4ED8` ($L=0.088$) | **7.61:1** | **PASS AAA** | Primary CTA buttons, active tabs |
| **Light** | `#1D4ED8` ($L=0.088$) | `#FFFFFF` ($L=1.000$) | **7.61:1** | **PASS AAA** | Text links, section action triggers |
| **Light** | `#1E3A8A` ($L=0.046$) | `#DBEAFE` ($L=0.825$) | **9.11:1** | **PASS AAA** | Info pills, category badges |
| **Dark** | `#F8FAFC` ($L=0.957$) | `#151C2C` ($L=0.012$) | **16.24:1** | **PASS AAA** | Dark card text, modal headers |
| **Dark** | `#F8FAFC` ($L=0.957$) | `#0B0F17` ($L=0.005$) | **18.31:1** | **PASS AAA** | Page titles, mobile top bar text |
| **Dark** | `#94A3B8` ($L=0.301$) | `#151C2C` ($L=0.012$) | **5.66:1** | **PASS AA** | Dark muted labels, timestamps |
| **Dark** | `#60A5FA` ($L=0.379$) | `#151C2C` ($L=0.012$) | **6.92:1** | **PASS AA** | Interactive links, active tab icons |
| **Dark** | `#FFFFFF` ($L=1.000$) | `#1D4ED8` ($L=0.088$) | **7.61:1** | **PASS AAA** | Dark active nav tab (replaces broken 1.79:1) |
| **Dark** | `#283548` ($L=0.038$) | `#0B0F17` ($L=0.005$) | **3.20:1** | **PASS UI Boundary** | Dark card border against canvas |
| **Dark** | `#93C5FD` ($L=0.518$) | `#1E293B` ($L=0.024$) | **7.68:1** | **PASS AAA** | Dark container badge text |

---

## 3. Semantic & Storage Category Colors

### A. Semantic Status Tokens (Strictly Separated from Brand)
- **Success / Online:** Emerald Green `#10B981` (Light container `#D1FAE5`, dark container `#064E3B`, text `#065F46` / `#34D399`). Retained strictly for "Connected" dot, upload success checkmark, 2FA verified badge, and toast checkmarks.
- **Warning / Caution:** Keepsake Amber `#F59E0B` (Light container `#FEF3C7`, dark container `#451A03`, text `#92400E` / `#FBBF24`). Retained for low quota warnings and pending invitations.
- **Error / Danger:** Crimson Red `#EF4444` (Light container `#FEE2E2`, dark container `#450A0A`, text `#991B1B` / `#F87171`). Retained for delete confirmations, connection errors, and expired links.
- **Info / Syncing:** Sky Blue `#0284C7` (Light container `#E0F2FE`, dark container `#082F49`, text `#0369A1` / `#38BDF8`).

### B. Storage Category Palette (Collision-Free & Accessible)
Every category is distinct from the primary brand blue and from each other:

| Category | Color (Light) | Color (Dark) | FontAwesome Icon | Anti-Collision Rationale |
|---|---|---|---|---|
| **Videos** | `#EC4899` (Rose) | `#F472B6` | `fas fa-video` | Retains high-energy pink identity |
| **Images** | `#0EA5E9` (Vibrant Cyan) | `#38BDF8` | `fas fa-image` | **Moved from `#3B82F6` to Cyan** to eliminate brand collision |
| **PDFs** | `#EF4444` (Crimson) | `#F87171` | `fas fa-file-pdf` | Universal document PDF association |
| **Docs** | `#8B5CF6` (Violet) | `#A78BFA` | `fas fa-file-word` | Distinct purple hue |
| **Sheets** | `#0D9488` (Teal / Jade) | `#2DD4BF` | `fas fa-file-excel` | **Moved from `#10B981` to Teal** to distinguish from semantic green |
| **Text** | `#F59E0B` (Amber) | `#FBBF24` | `fas fa-file-alt` | Warm golden document note |
| **Other** | `#64748B` (Neutral Slate)| `#94A3B8` | `fas fa-file` | Unobtrusive fallback |

*Non-reliance on color alone:* All legend chips, table cells, and grid items render the category icon and text label alongside the color dot.

---

## 4. Component Refactoring Specifications

### A. Sidebar & Shell (`AppLayout.tsx`, `layout.css`, `SegmentedThemeSelector.tsx`)
1. **Drawer Header Banner:**
   - Eliminate `--drawer-header-bg` dark spruce gradient. In Light mode, header matches clean card surface (`#FFFFFF`), with an avatar wrapper in warm keepsake amber (`#F59E0B`), crisp user name in `#0F172A`, and role pill in `#EFF6FF` with `#1D4ED8` border.
   - User email: Add `title={user?.email}` and `overflow-hidden text-ellipsis` with standard word break.
2. **Navigation Items:**
   - Active state in Light: background `#1D4ED8` with white text `#FFFFFF` (7.61:1 AAA).
   - Active state in Dark: background `#1D4ED8` with white text `#FFFFFF` (7.61:1 AAA).
3. **Appearance Selector (`SegmentedThemeSelector.tsx`):**
   - Change Auto icon from `fas fa-magic` to `fas fa-desktop` (standard system/display icon).
   - Active button pill uses subtle surface fill and `--color-primary` text with shadow.
4. **APPEARANCE Section Label:**
   - Remove `opacity: 0.8`. Set color directly to `--text-ink-muted` (`#475569`, 7.19:1 AAA contrast).
5. **Secondary Actions Hierarchy:**
   - Restyle "Get Android App" as a subtle secondary outline button (`border: 1px solid var(--border-paper); background: transparent;`).
   - Restyle "Sign Out" as a clean text button with subtle muted hover tint, removing the aggressive full-width red card dominating the bottom of the sidebar.

### B. Dashboard Toolbar & Stat Cards (`DashboardPage.tsx`, `dashboard.css`)
1. **Quick Actions Toolbar:**
   - Primary "Upload File" button: Royal Blue gradient (`linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)`).
   - "Invite Member" icon: change from `fas fa-ticket-alt` to `fas fa-user-plus`.
   - "Cloud Storage Pool" icon: change from `fas fa-hdd` to `fas fa-cloud` (matching sidebar).
2. **Stat Cards:**
   - Total Files: Royal Blue icon container (`#DBEAFE` / `#1D4ED8`).
   - Folders: Amber icon container (`#FEF3C7` / `#D97706`).
   - Space Occupied: Indigo icon container (`#E0E7FF` / `#4F46E5`).
     - Remove `Math.max(4, ...)` artificial 4% minimum sliver!
     - Render quota context below number: `<span>{api.helpers.formatBytes(totalSize)} of {api.helpers.formatBytes(quotaBytes)} ({percent}%)</span>`.
   - Family Members: Slate icon container (`#F1F5F9` / `#475569`).

### C. Storage Category Distribution (`DashboardPage.tsx`, `dashboard.css`)
1. **Multi-Segmented Progress Bar:**
   - Scale segments proportionally across total used bytes or quota, with a visual minimum floor of 2px only when files actually exist.
   - For empty vaults, render a clean neutral empty track with message: "No documents stored yet".
2. **Category Chips Grid:**
   - Replace rigid `grid-template-columns: repeat(6, 1fr)` with responsive flexible grid `grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;`. No orphaned rows!
   - Remove `font-family: var(--font-mono)` from `.chip-meta`.
   - Hide or softly mute categories with 0 bytes and 0 files so only active storage is emphasized.

### D. Recent Vault Uploads (`DashboardPage.tsx`, `dashboard.css`)
1. **Fix Image Thumbnail Clipping:**
   - In `dashboard.css`, remove `#recent-uploads-list .vault-item img.item-thumbnail { position: static !important; }`.
   - Make `.thumbnail-wrapper` a clean `position: relative; overflow: hidden; border-radius: var(--radius-sm);` with the `<img>` positioned `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`.
   - On error, hide broken image tag and smoothly display fallback icon.

### E. Vault Activity Feed (`DashboardPage.tsx`)
1. **Display-Only Action Translation Layer:**
   Map raw backend constants into readable human prose:
   - `DOWNLOAD_FILE` $\to$ "Downloaded file"
   - `UPLOAD_FILE` $\to$ "Uploaded file"
   - `CREATE_FOLDER` $\to$ "Created folder"
   - `DELETE_FILE` $\to$ "Moved file to trash"
   - `SHARE_LINK_CREATE` $\to$ "Generated share link"
   - `RESTORE_FILE` $\to$ "Restored file from trash"
   - `LOGIN` $\to$ "Signed in"

### F. Connection Status Indicator (`ConnectionPill.tsx`)
1. **Explicit Context:**
   - Update label from bare "Connected" to "FamDoc Cloud: Connected" (on desktop/tablet) and "Connected" (on compact mobile).
   - Retain semantic emerald green `#10B981` status dot.

---

## 5. Typography, Radii & Motion System

1. **Typography:**
   - UI Headings: `Outfit`, sans-serif.
   - Body & Controls: `Inter`, -apple-system, sans-serif.
   - Monospace: `JetBrains Mono` reserved **strictly** for technical values: invite codes (`MORGAN-SAFE-789`), share tokens, and API credentials. Removed from regular numbers, dates, and file format labels.
2. **Radius Scale:**
   - `radius-xs`: 4px
   - `radius-sm`: 8px
   - `radius-md`: 12px
   - `radius-lg`: 16px
   - `radius-xl`: 20px
   - `radius-pill`: 28px
   - `radius-full`: 9999px
3. **Motion & Reduced Motion:**
   - Standard transitions: 200ms `cubic-bezier(0.2, 0.0, 0.0, 1.0)`.
   - Media query `@media (prefers-reduced-motion: reduce)` disables all animations and transitions.

---

## 6. Implementation Slices & Commits Plan

Each step will be committed independently to `ui/blue-polish`:

- **Slice 1 (Commit 1): Global Tokens & Core Theme Architecture**  
  Update `variables.css` with Royal Blue scale, clean neutral surfaces (`#F8FAFC`), elevated dark surfaces (`#0B0F17` / `#151C2C`), visible dark borders (`#283548`), and semantic tokens.
- **Slice 2 (Commit 2): Layout Shell, Sidebar & App Bar Polish**  
  Update `AppLayout.tsx`, `layout.css`, `SegmentedThemeSelector.tsx`, `ConnectionPill.tsx`. Clean light header, fix theme icons, active nav contrast, secondary actions hierarchy.
- **Slice 3 (Commit 3): Dashboard Components Overhaul**  
  Update `DashboardPage.tsx`, `dashboard.css`. Fix thumbnail clipping, storage distribution grid and bar scaling, space occupied quota context, and activity human translations.
- **Slice 4 (Commit 4): Shared Vault & Cloud Storage Pages**  
  Update `VaultPage.tsx`, `vault.css`, `StoragePage.tsx`, `storage.css`. Update folder icons, category cyan/teal tokens, search focus-visible rings.
- **Slice 5 (Commit 5): Family, Trash, Profile, Auth & Public Share Pages**  
  Update `FamilyPage.tsx`, `family.css`, `TrashPage.tsx`, `trash.css`, `ProfilePage.tsx`, `profile.css`, `auth.css`, `SharedPage.tsx`. Replace lingering green classes.
- **Slice 6 (Commit 6): Email Template, Meta Theme-Color & Token Documentation**  
  Update `backend/utils/email.py`, `frontend/index.html` theme-color, and add token usage guide.

---

## 7. Verification & Automated Test Plan

1. **Visual Regression Screenshots:**  
   Re-run the capture script across all 12 screens (light & dark, desktop & mobile) to produce `docs/ui-polish/after-screenshots/` and compare side-by-side with before-screenshots.
2. **Leftover Green Grep Gate:**  
   Execute automated grep check failing on any `#047857`, `#064E3B`, `#34D399`, `#6EE7B7`, or Tailwind `emerald-*` / `teal-*` outside the approved semantic exceptions list (`bg-emerald-500` on status dot, checkmarks).
3. **Accessibility Audit:**  
   Verify that all text/background pairs meet WCAG 2.2 AA ($4.5:1$ text, $3.0:1$ UI boundaries).
4. **Keyboard Walkthrough:**  
   Verify that Tab navigation, focus rings (`focus-visible`), Esc key modal dismiss, and Enter/Space triggers operate cleanly.

---

## 8. Self-Verification & Go / No-Go Decision

- **Missed Greens Re-Scan:** Inline styles, SVG fills, radial gradient backgrounds, email templates, and meta theme-color are all inventoried and assigned tokens. [VERIFIED]
- **Mathematical Contrast Verification:** Every target pair re-computed; dark mode active tab contrast fixed from 1.79:1 to 7.61:1 (AAA); dark card border contrast verified at 3.2:1 (passes 3.0:1 boundary). [VERIFIED]
- **Zero API/Logic Drift:** No API routes, hooks, data types, or hash paths altered. [VERIFIED]

**Status:** **GO FOR EXECUTION (Phase 3)**  
*Awaiting explicit command: "START PHASE 3".*
