# ⚖️ Phase 2: Modern Frontend Stack Decision & Evaluation

**Date:** 2026-11-21  
**Project:** FamDoc (FDMS) Frontend Modernization  
**Decision Lead:** Senior Frontend Architect & Migration Engineer  
**Output Target:** `docs/frontend-migration/phase2-stack-decision.md`  

---

## 1. Initial Candidate Elimination (Pruning Weak Candidates)

Starting from the 8 evaluation candidates, we eliminate the options that clearly fail project criteria:

| Candidate | Status | Elimination Justification (1 Line) |
| :--- | :--- | :--- |
| **Next.js (App Router)** | **ELIMINATED** | Overkill full-stack SSR framework adding Node/Edge runtime shims and deployment friction on Cloudflare Pages for an app with an existing Python FastAPI backend and 95% authenticated screens. |
| **Angular (v19)** | **ELIMINATED** | High bundle overhead, steep learning curve (RxJS, dependency injection, signals), and extreme migration friction for a solo maintainer working on a lightweight family vault. |
| **Astro** | **ELIMINATED** | Architecturally optimized for content-driven static sites and blogs; unsuited for an intensely stateful, authenticated application with nested client routing, heavy upload queues, and modal-heavy dashboards. |
| **SolidJS** | **ELIMINATED** | Niche ecosystem with very few mature, maintained, and accessible document/PDF viewer primitives, virtualized drag-and-drop trees, or battle-tested upload managers compared to survivors. |
| **Modernized Vanilla (Vite + TS + Web Components)** | **ELIMINATED** | Retains the exact pain point #1 identified in the audit (manual DOM manipulation, imperative event listeners, and custom state plumbing), multiplying long-term maintenance costs. |

### Surviving Candidates for Full Evaluation:
1. **React 19 + Vite 6 (SPA)**
2. **Vue 3.5 + Vite 6 (SPA)**
3. **Svelte 5 + SvelteKit (SPA mode)**

---

## 2. Weighted Decision Criteria (Sum = 100)

| ID | Criterion | Weight | Definition & Project Relevance |
| :---: | :--- | :---: | :--- |
| **C1** | **Document & Explorer Ecosystem** | **20%** | Availability and stability of battle-tested libraries for PDF canvas rendering, drag-and-drop uploads, large-list virtualization, data tables, and date/time pickers. |
| **C2** | **Fit for a Login-Only Document SPA** | **15%** | Client-side routing, protected auth guards, zero SSR runtime overhead, and clean integration with an external REST API backend on Cloudflare. |
| **C3** | **Migration Effort from Current Code** | **15%** | Ease of translating 9,221 lines of existing JS logic and 6,366 lines of custom CSS variables without rewriting core business flows. |
| **C4** | **Cloudflare Pages Compatibility** | **10%** | Zero-config static output (`dist/`), edge asset distribution, instant builds, and zero compute costs on Cloudflare's free/pages tier. |
| **C5** | **Low-End Mobile Performance** | **10%** | Runtime bundle size, CPU reactivity overhead, memory footprint, and 60fps scrolling on older family smartphones. |
| **C6** | **Learning Curve & Solo Maintainability** | **10%** | Clear mental model, declarative syntax, extensive documentation, and fast AI-assisted maintenance. |
| **C7** | **Accessibility & Testing Tooling** | **10%** | Native headless accessible primitives (WCAG 2.2 AA compliant focus traps, screen reader regions) and seamless testing with Vitest/Playwright. |
| **C8** | **Long-Term Ecosystem Stability** | **5%** | Community scale, enterprise backing, library release cadences, and multi-year longevity. |
| **C9** | **PWA & Offline Readiness** | **5%** | Ease of adding Service Worker caching, Web App Manifest, and IndexedDB sync via standard plugins (`vite-plugin-pwa`). |
| **Total** | | **100%** | |

---

## 3. Candidate Scoring Matrix (1 to 5 per Criterion)

| Criterion (Weight) | React 19 + Vite 6 SPA | Vue 3.5 + Vite 6 SPA | Svelte 5 (SPA Mode) |
| :--- | :---: | :---: | :---: |
| **C1. Document Ecosystem (20%)** | **5.0** — Unrivaled document tooling: `react-pdf`, `@tanstack/react-virtual`, `react-dropzone`, `@tanstack/react-table`. | **4.0** — Solid ecosystem (VueUse, TanStack Vue), but PDF and complex tree libraries are fewer and smaller. | **3.5** — Svelte 5 runes transition caused gaps; fewer enterprise-grade PDF and virtual list components. |
| **C2. Login-Only App Fit (15%)** | **5.0** — Pure static SPA output; zero-SSR overhead; clean client-side protected route boundaries. | **5.0** — Natural SPA architecture with Vue Router navigation guards; zero-SSR overhead. | **4.0** — SvelteKit is SSR-first by design; requires disabling SSR via `export const ssr = false` or static adapter. |
| **C3. Migration Effort (15%)** | **4.5** — Existing closures, Sets, and state maps map directly into React hooks/Zustand; CSS classes map 1:1. | **4.0** — Requires converting template strings into Vue `<template>` directives and refactoring global CSS. | **3.5** — Svelte's scoped CSS model clashes with the 6,366 lines of global design tokens unless overridden with `:global()`. |
| **C4. Cloudflare Pages (10%)** | **5.0** — Standard `vite build` outputs to `dist/`; instant zero-config edge hosting with `_redirects`. | **5.0** — Identical zero-config static output to `dist/` on Cloudflare Pages. | **4.5** — Requires `@sveltejs/adapter-static` or Cloudflare adapter configuration. |
| **C5. Mobile Performance (10%)** | **4.0** — ~45KB gzipped runtime; fast with Vite code-splitting and list virtualization, but larger than Svelte. | **4.5** — ~33KB gzipped runtime; highly efficient reactivity with minimal CPU overhead. | **5.0** — Compiler-driven with ~15KB runtime; minimal overhead on low-end Android mobile CPUs. |
| **C6. Solo Maintainability (10%)** | **4.5** — Highest community familiarity, extensive tutorials, and best-in-class AI agent understanding. | **4.5** — Intuitive Composition API (`ref`, `computed`) and clean single-file component structure. | **3.5** — Shifting syntax from Svelte 4 stores to Svelte 5 runes (`$state`, `$derived`) increases ramp-up time. |
| **C7. A11y & Testing (10%)** | **5.0** — Gold standard: Radix UI primitives guarantee WCAG 2.2 AA; Vitest + Testing Library + Playwright. | **4.0** — Radix Vue / Reka UI has matured, but headless a11y primitive options are narrower. | **3.5** — Melt UI / Bits UI is promising but less established for complex modals and focus traps. |
| **C8. Stability & Future (5%)** | **5.0** — Decades of commitment, backed by Meta, Vercel, and millions of active enterprise production apps. | **4.5** — Highly stable, backed by Vue core team, Evan You, and steady global adoption. | **4.0** — Strong backing (Vercel), but frequent architectural changes between major releases create churn. |
| **C9. PWA Readiness (5%)** | **5.0** — First-class `vite-plugin-pwa` with automated Workbox precaching and manifest generation. | **5.0** — Same `vite-plugin-pwa` integration and Workbox capabilities. | **4.0** — SvelteKit handles service workers through internal routing conventions (`src/service-worker.js`). |
| **Weighted Total Score** | **4.78 / 5.0 (95.5%)** | **4.43 / 5.0 (88.5%)** | **3.88 / 5.0 (77.5%)** |
| **Final Ranking** | 🥇 **RECOMMENDED WINNER** | 🥈 **RUNNER-UP** | 🥉 **THIRD PLACE** |

---

## 4. Recommended Target Stack: React 19 + Vite 6 SPA

### Complete Toolchain Specification

| Layer | Recommended Choice | Rationale & Trade-Offs |
| :--- | :--- | :--- |
| **Language** | **TypeScript 5.7+ (Strict Mode)** | Enforces strict compile-time types for all 43 backend API models, eliminating runtime type bugs. |
| **Bundler & Dev Server** | **Vite 6** (with Rolldown / ESBuild) | Instant sub-second HMR, optimized tree-shaking, automated route code-splitting, static `dist/` output. |
| **Routing** | **TanStack Router** (or React Router v7 in SPA mode) | 100% type-safe routing, typed search params for `folder_id` and `preview`, and built-in route-level auth loaders. |
| **Server State & Data Fetching** | **TanStack Query v5 (`@tanstack/react-query`)** | Replaces the 150+ lines of custom in-memory caching in `api.js` with declarative query keys, auto-refetching, and mutation invalidation. |
| **Client State** | **Zustand (v5)** | Ultra-lightweight (1.1KB) store for client-only state: user session, active theme, sidebar collapse, and file selection Sets. |
| **Forms & Validation** | **React Hook Form + Zod** | High-performance uncontrolled form inputs matching backend Pydantic schema validation rules without re-render lag. |
| **Headless UI & Accessibility** | **Radix UI Primitives (`@radix-ui/*`)** | Unstyled, fully accessible WCAG 2.2 AA compliant primitives for Dialogs, DropdownMenus, Tooltips, and Focus Traps. |
| **Styling Strategy** | **Tailwind CSS v4 + Scoped CSS Modules** | Retains existing design tokens (`variables.css`: Forest Emerald & warm paper palettes) while eliminating CSS collisions. |
| **Document & PDF Preview** | **`react-pdf` (Mozilla PDF.js 4+)** | Battle-tested in-modal canvas PDF rendering with page navigation, zoom, and text-layer selection. |
| **List Virtualization** | **`@tanstack/react-virtual`** | Renders only visible rows/cards in view, guaranteeing 60fps scrolling on folders with 1,000+ files. |
| **File Upload** | **`react-dropzone`** | Accessible drag-and-drop file target integrated with our IndexedDB queue and presigned R2 direct uploader. |
| **Icons** | **Lucide React (`lucide-react`)** | Modern, tree-shakeable SVG icons replacing external CDN FontAwesome stylesheets. |
| **PWA & Offline** | **`vite-plugin-pwa`** | Workbox-powered service worker precaching static assets, offline fallback page, and Web App Manifest. |
| **Unit & Component Testing** | **Vitest + React Testing Library** | Lightning-fast test runner using the same Vite config and plugins. |
| **End-to-End Testing** | **Playwright** | Cross-browser parity tests (Chromium, Firefox, Mobile Safari) verifying login, uploads, and previews. |
| **Linter & Formatter** | **ESLint 9 (Flat Config) + Prettier** | Consistent code style and React Hooks dependency rule enforcement. |

---

## 5. Why the Runners-Up Lost

### Vue 3.5 + Vite (Runner-Up, Score: 4.43 / 5.0)
- **Why it lost**: While Vue 3.5 is an exceptional framework with slightly smaller runtime size, its document ecosystem for complex PDF canvas inspection, accessible multi-level tree controls, and headless drag-and-drop file explorers is noticeably smaller. React's ecosystem dominance in document management systems gives it a significant edge.
- **When to choose it instead**: If the team had strong existing Vue 2/3 experience, or if the project was an administrative data-entry dashboard primarily built around standard grid forms rather than custom document previews and canvas rendering.

### Svelte 5 / SvelteKit (Third Place, Score: 3.88 / 5.0)
- **Why it lost**: Svelte 5's recent paradigm shift to Runes (`$state`, `$derived`, `$effect`) has created ecosystem fragmentation; many community libraries for file trees, PDF wrappers, and tables are still in transition. Additionally, SvelteKit is designed primarily for SSR/full-stack architectures, making it slightly more cumbersome to use as a pure static SPA compared to Vite + React.
- **When to choose it instead**: For greenfield public consumer-facing websites where sub-15KB bundle sizes, zero hydration overhead, and minimal CPU execution on budget devices are the primary architectural drivers.

---

## 6. Architecture Decision: Pure SPA vs SSR

### Decision: **Pure Static SPA on Cloudflare Pages**

1. **Application Nature**:
   - FamDoc is a **private family vault**. Over 95% of all screens and interactions (Dashboard, Vault, Storage, Family, Recycle Bin, Profile) are behind strict authentication (`requiresAuth: true`).
   - Private document vaults derive **zero benefit from Server-Side Rendering (SSR) or search engine indexing (SEO)**.
2. **Operational Simplicity & Cost**:
   - A static SPA compiles to pure static HTML, CSS, JavaScript, and asset bundles in `dist/`.
   - Hosted on **Cloudflare Pages**, this costs **$0/month**, requires **zero edge worker compute time**, suffers from **zero cold-start latency**, and is cached globally across 330+ Cloudflare edge locations.
3. **SEO for Public Pages**:
   - The only public pages are Landing (`/`), Login (`/login`), Privacy (`/privacy`), and Terms (`/terms`).
   - These pages have static metadata already pre-rendered into `index.html`, `privacy.html`, and `terms.html`, satisfying social sharing cards (OpenGraph) and indexing needs without requiring an SSR Node/Edge server.

---

### Phase 2 Decision Gate

The recommended modern stack for FDMS is **React 19 + TypeScript + Vite 6 (SPA) deployed to Cloudflare Pages**.

*Waiting for your approval on this stack decision before proceeding to Phase 3 (Plan & Verification).*
