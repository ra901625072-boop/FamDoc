/**
 * FamDoc Modern Home Page View Manager
 * Designed from scratch as a UI/UX Designer specifically for FamDoc
 * Architecture: Multi-Account Google Drive Pooling, Dual-Tier Failover Vault,
 * Native Android Biometrics, Elder-Friendly Family Stubs, and Timeless Keepsakes.
 * Author: Akshaysinh Rajput
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  // Curated family keepsakes & documents structured by real family vault categories
  const VAULT_CATEGORIES = {
    deeds: {
      label: "Vital Deeds & Legal",
      icon: "fas fa-file-contract",
      docs: [
        {
          id: "doc-1",
          title: "Ancestral Property Deed 2024.pdf",
          type: "pdf",
          icon: "fas fa-file-pdf",
          iconClass: "doc-icon-pdf",
          size: "2.4 MB",
          uploader: "Dad",
          badge: "Notarized Deed",
          drive: "Google Drive Pool A",
          date: "Sep 2026",
          sha: "SHA-256: 4f8b92a1...c8e4",
          previewSummary: "Official land registry certificate and certified title deed for ancestral home. Verified with digital seal and legal registry records."
        },
        {
          id: "doc-2",
          title: "Last Will & Family Testament.pdf",
          type: "pdf",
          icon: "fas fa-file-pdf",
          iconClass: "doc-icon-pdf",
          size: "1.1 MB",
          uploader: "Dad",
          badge: "Sealed Vault",
          drive: "Google Drive Pool B",
          date: "Aug 2026",
          sha: "SHA-256: e71c4509...31ab",
          previewSummary: "Signed family testament and asset allocation directives. Encrypted with restricted family permissions and zero cloud tracking."
        },
        {
          id: "doc-3",
          title: "Passport & Citizenship Scans.pdf",
          type: "pdf",
          icon: "fas fa-passport",
          iconClass: "doc-icon-pdf",
          size: "3.8 MB",
          uploader: "Mom",
          badge: "Identity Vault",
          drive: "Google Drive Pool A",
          date: "Jul 2026",
          sha: "SHA-256: a82d6341...19fe",
          previewSummary: "High-resolution color biometric passport and national ID scans for all 4 family members, stored with Fernet AES-128 encryption."
        },
        {
          id: "doc-4",
          title: "Vehicle Title & Registration.pdf",
          type: "pdf",
          icon: "fas fa-car",
          iconClass: "doc-icon-pdf",
          size: "820 KB",
          uploader: "Dad",
          badge: "Official Record",
          drive: "Google Drive Pool C",
          date: "Jun 2026",
          sha: "SHA-256: d03a985e...77c2",
          previewSummary: "Original vehicular certificate, road tax receipts, insurance endorsement, and transfer authorization papers."
        }
      ]
    },
    health: {
      label: "Health & Medical",
      icon: "fas fa-heartbeat",
      docs: [
        {
          id: "doc-5",
          title: "Comprehensive Family Health Policy 2026.pdf",
          type: "pdf",
          icon: "fas fa-file-medical",
          iconClass: "doc-icon-pdf",
          size: "4.2 MB",
          uploader: "Mom",
          badge: "Active Policy",
          drive: "Google Drive Pool B",
          date: "Sep 2026",
          sha: "SHA-256: 3c9f104d...821e",
          previewSummary: "Annual health coverage policy terms, cashless hospital network directory, and member medical insurance ID cards."
        },
        {
          id: "doc-6",
          title: "Grandpa Cardiology History & ECG.pdf",
          type: "pdf",
          icon: "fas fa-notes-medical",
          iconClass: "doc-icon-pdf",
          size: "1.9 MB",
          uploader: "Grandma",
          badge: "Critical Medical",
          drive: "Google Drive Pool A",
          date: "Aug 2026",
          sha: "SHA-256: 9b20ea61...f04c",
          previewSummary: "Detailed cardiologist assessment reports, stress test records, and specialist medication consultation notes."
        },
        {
          id: "doc-7",
          title: "Childhood Immunization & Vaccine Chart.pdf",
          type: "pdf",
          icon: "fas fa-syringe",
          iconClass: "doc-icon-pdf",
          size: "760 KB",
          uploader: "Mom",
          badge: "Pediatric Log",
          drive: "Google Drive Pool C",
          date: "Jul 2026",
          sha: "SHA-256: 12de48ac...9b74",
          previewSummary: "Complete birth-to-adolescence vaccination records, dosage milestones, and pediatrician signatures."
        },
        {
          id: "doc-8",
          title: "Family Blood Groups & Emergency Allergies.docx",
          type: "doc",
          icon: "fas fa-file-word",
          iconClass: "doc-icon-doc",
          size: "310 KB",
          uploader: "Dad",
          badge: "Emergency Reference",
          drive: "Google Drive Pool B",
          date: "May 2026",
          sha: "SHA-256: f4619d82...50ea",
          previewSummary: "Emergency clinical cheat-sheet containing blood typings, antibiotic allergies, and 24/7 doctor contact numbers."
        }
      ]
    },
    keepsakes: {
      label: "Family Keepsakes & Memories",
      icon: "fas fa-gem",
      docs: [
        {
          id: "doc-9",
          title: "Grandparents Wedding Day 1968.jpg",
          type: "img",
          icon: "fas fa-image",
          iconClass: "doc-icon-img",
          size: "5.4 MB",
          uploader: "Grandma",
          badge: "Restored Photo",
          drive: "Google Drive Pool A",
          date: "Sep 2026",
          sha: "SHA-256: 8a71c390...4f18",
          previewSummary: "Digitally remastered vintage wedding photograph captured on Kodak black-and-white negative film, preserved in ultra high resolution."
        },
        {
          id: "doc-10",
          title: "Ancestral Handwritten Recipe Journal.pdf",
          type: "pdf",
          icon: "fas fa-book-open",
          iconClass: "doc-icon-pdf",
          size: "3.2 MB",
          uploader: "Grandma",
          badge: "Generational Heirloom",
          drive: "Google Drive Pool B",
          date: "Aug 2026",
          sha: "SHA-256: c68201de...63a9",
          previewSummary: "High-resolution scan of 48-page handwritten culinary heritage notebook dating back to 1942, featuring traditional spices and dishes."
        },
        {
          id: "doc-11",
          title: "Family Reunion Golden Jubilee 2025.jpg",
          type: "img",
          icon: "fas fa-camera",
          iconClass: "doc-icon-img",
          size: "6.8 MB",
          uploader: "Mom",
          badge: "Original RAW",
          drive: "Google Drive Pool C",
          date: "Jun 2026",
          sha: "SHA-256: b10438cf...241d",
          previewSummary: "Panoramic family portrait gathered for 50th jubilee celebration in lossless RAW resolution."
        },
        {
          id: "doc-12",
          title: "University Gold Medal Certificate.png",
          type: "img",
          icon: "fas fa-award",
          iconClass: "doc-icon-img",
          size: "2.1 MB",
          uploader: "Dad",
          badge: "Milestone",
          drive: "Google Drive Pool A",
          date: "Apr 2026",
          sha: "SHA-256: 7d1a5802...11b5",
          previewSummary: "Original scanned master degree with distinction honors and university chancellor gold seal."
        }
      ]
    },
    tax: {
      label: "Tax & Financials",
      icon: "fas fa-calculator",
      docs: [
        {
          id: "doc-13",
          title: "Property Municipal Tax Receipt FY25.pdf",
          type: "pdf",
          icon: "fas fa-receipt",
          iconClass: "doc-icon-pdf",
          size: "1.4 MB",
          uploader: "Dad",
          badge: "Tax Clearance",
          drive: "Google Drive Pool B",
          date: "Aug 2026",
          sha: "SHA-256: 22ea4518...90cf",
          previewSummary: "Official electronic assessment and zero-liability payment confirmation issued by city municipal corporation."
        },
        {
          id: "doc-14",
          title: "Annual Income Tax Return Acknowledgment.pdf",
          type: "pdf",
          icon: "fas fa-file-invoice-dollar",
          iconClass: "doc-icon-pdf",
          size: "2.7 MB",
          uploader: "Dad",
          badge: "Filed & Verified",
          drive: "Google Drive Pool A",
          date: "Jul 2026",
          sha: "SHA-256: 550b7194...e32a",
          previewSummary: "Statutory tax audit confirmation and digital acknowledgement receipt for FY2025-2026."
        },
        {
          id: "doc-15",
          title: "Fixed Deposit & Treasury Bond Receipts.pdf",
          type: "pdf",
          icon: "fas fa-university",
          iconClass: "doc-icon-pdf",
          size: "950 KB",
          uploader: "Grandma",
          badge: "Banking Vault",
          drive: "Google Drive Pool C",
          date: "May 2026",
          sha: "SHA-256: 4180f6bc...5710",
          previewSummary: "Certificates of deposit and sovereign gold bond certificates with interest maturity schedule tables."
        },
        {
          id: "doc-16",
          title: "Home Loan Discharge & NOC Certificate.pdf",
          type: "pdf",
          icon: "fas fa-home",
          iconClass: "doc-icon-pdf",
          size: "1.8 MB",
          uploader: "Dad",
          badge: "Debt Free",
          drive: "Google Drive Pool A",
          date: "Feb 2026",
          sha: "SHA-256: a918342f...08dc",
          previewSummary: "Official bank no-objection certificate confirming 100% full repayment and release of residential property mortgage."
        }
      ]
    }
  };

  window.FamDocViews.landing = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Render the complete, modern, designer-grade layout
    mount.innerHTML = `
      <div class="landing-page fd-page-enter">
        <!-- Multi-Layered Ambient Glow Lighting -->
        <div class="landing-ambient-glow" aria-hidden="true"></div>

        <!-- Sticky Glassmorphism Header Bar -->
        <div class="landing-header-wrap">
          <div class="landing-container">
            <header role="banner" class="landing-navbar">
              <a href="#/" class="nav-brand-group" aria-label="FamDoc Home">
                <div class="nav-brand-crest">
                  <img src="/img/logo.svg" alt="FamDoc Crest Logo" class="nav-brand-logo" width="30" height="30">
                </div>
                <div class="nav-brand-text">
                  <span class="nav-brand-name">Fam<span class="accent">Doc</span></span>
                  <span class="nav-brand-tagline">Family Vault</span>
                </div>
              </a>

              <!-- In-Page Smooth Scroll Links (Safe with SPA Router) -->
              <nav role="navigation" aria-label="Main Navigation">
                <ul class="nav-links-menu">
                  <li class="nav-link-item">
                    <button type="button" data-scroll="section-showcase">
                      <i class="fas fa-layer-group" aria-hidden="true"></i>
                      <span>Live Vault</span>
                      <span class="nav-badge">Test Drive</span>
                    </button>
                  </li>
                  <li class="nav-link-item">
                    <button type="button" data-scroll="section-pillars">
                      <i class="fas fa-cubes" aria-hidden="true"></i>
                      <span>Architecture</span>
                    </button>
                  </li>
                  <li class="nav-link-item">
                    <button type="button" data-scroll="section-android">
                      <i class="fab fa-android" aria-hidden="true"></i>
                      <span>Android App</span>
                    </button>
                  </li>
                  <li class="nav-link-item">
                    <button type="button" data-scroll="section-faq">
                      <i class="fas fa-question-circle" aria-hidden="true"></i>
                      <span>FAQ</span>
                    </button>
                  </li>
                </ul>
              </nav>

              <!-- Controls: Theme Toggle, Mobile Toggle, Sign In -->
              <div class="nav-controls-group">
                <button type="button" class="nav-theme-btn guest-theme-toggle" id="landingThemeToggle" aria-label="Toggle theme mode between light and dark">
                  <i class="fas fa-moon" aria-hidden="true"></i>
                </button>
                <a href="#/login" class="nav-login-btn" id="navLoginBtn">
                  <i class="fas fa-sign-in-alt" aria-hidden="true"></i>
                  <span>Sign In</span>
                </a>
                <button type="button" class="nav-mobile-toggle" id="mobileMenuToggle" aria-label="Open navigation menu">
                  <i class="fas fa-bars" aria-hidden="true"></i>
                </button>
              </div>
            </header>

            <!-- Mobile Navigation Dropdown Drawer -->
            <div class="mobile-nav-drawer" id="mobileNavDrawer" aria-hidden="true">
              <button type="button" data-scroll="section-showcase">
                <span><i class="fas fa-layer-group" style="margin-right: 0.6rem;"></i> Live Vault</span>
                <span class="nav-badge">Test Drive</span>
              </button>
              <button type="button" data-scroll="section-pillars">
                <span><i class="fas fa-cubes" style="margin-right: 0.6rem;"></i> Architecture</span>
                <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
              </button>
              <button type="button" data-scroll="section-android">
                <span><i class="fab fa-android" style="margin-right: 0.6rem;"></i> Android App</span>
                <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
              </button>
              <button type="button" data-scroll="section-faq">
                <span><i class="fas fa-question-circle" style="margin-right: 0.6rem;"></i> FAQ</span>
                <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
              </button>
            </div>
          </div>
        </div>

        <main role="main">
          <!-- 1. Hero Section -->
          <section class="landing-hero-section">
            <div class="landing-container">
              <div class="hero-pill-badge">
                <i class="fas fa-shield-alt" aria-hidden="true"></i>
                <span>Private Family Keepsake &amp; Document Platform</span>
              </div>

              <h1 class="hero-title" id="main-headline">
                Your Family's Legacy &amp; Keepsakes,<br>
                <span class="hero-title-highlight">Guarded in One Timeless Vault.</span>
              </h1>

              <p class="hero-description">
                Aggregate free Google Drive storage into an unbreakable family pool. Protected by dual-tier failover encryption, native Android biometrics, and zero subscription fees.
              </p>

              <!-- Action Cluster -->
              <div class="hero-cta-cluster" role="region" aria-label="Primary Call to Actions">
                <a href="#/register" class="hero-btn-primary" id="btn-create-vault">
                  <i class="fas fa-plus-circle" aria-hidden="true"></i>
                  <span>Create a Family Vault</span>
                </a>
                <a href="#/join" class="hero-btn-secondary" id="btn-join-code">
                  <i class="fas fa-key key-icon" aria-hidden="true"></i>
                  <span>Join with Family Code</span>
                </a>
                <a href="/apk/FamDoc.apk" download class="hero-btn-apk" id="btn-hero-apk">
                  <i class="fab fa-android" aria-hidden="true"></i>
                  <span>Get Android App</span>
                  <span class="apk-badge-size">19.6 MB</span>
                </a>
              </div>

              <div class="hero-login-sublink">
                Already part of a family vault?
                <a href="#/login" id="heroLoginSubLink">Sign In to Your Vault &rarr;</a>
              </div>

              <!-- Trust Signals Strip -->
              <div class="hero-trust-strip" aria-label="Platform Guarantees">
                <div class="trust-chip">
                  <i class="fas fa-lock" aria-hidden="true"></i>
                  <span>Google Restricted <code>drive.file</code> Scope</span>
                </div>
                <div class="trust-chip">
                  <i class="fas fa-key" aria-hidden="true"></i>
                  <span>Fernet AES-128 Encryption</span>
                </div>
                <div class="trust-chip">
                  <i class="fas fa-hdd" aria-hidden="true"></i>
                  <span>Dual-Tier Local Vault Failover</span>
                </div>
                <div class="trust-chip">
                  <i class="fas fa-fingerprint" aria-hidden="true"></i>
                  <span>Jetpack Compose Biometrics</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. Interactive Live Vault Showcase (Test Drive) -->
          <section class="vault-showcase-section" id="section-showcase" aria-labelledby="showcase-title">
            <div class="landing-container">
              <div class="section-header-block">
                <div class="section-pretitle">Interactive Experience</div>
                <h2 class="section-title" id="showcase-title">Experience the FamDoc Vault First-Hand</h2>
                <p class="section-subtitle">
                  Click through our real family document categories below to see how records are categorized, pooled, and previewed with sub-50ms speed.
                </p>
              </div>

              <!-- Vault Window Container -->
              <div class="vault-window-frame">
                <!-- Mac-Style Window Top Bar -->
                <div class="vault-window-topbar">
                  <div class="window-dots" aria-hidden="true">
                    <span class="window-dot dot-red"></span>
                    <span class="window-dot dot-yellow"></span>
                    <span class="window-dot dot-green"></span>
                  </div>
                  <div class="window-title">
                    <i class="fas fa-shield-alt" aria-hidden="true"></i>
                    <span>The Rajput Family Vault &bull; Multi-Account Pool Active</span>
                  </div>
                  <div class="window-status-pill">
                    <span class="pulse-dot"></span>
                    <span>3 Accounts Connected</span>
                  </div>
                </div>

                <!-- Live Multi-Account Google Drive Pool Meter -->
                <div class="vault-storage-meter-box">
                  <div class="storage-meter-header">
                    <span class="storage-pool-label">
                      <i class="fab fa-google-drive" aria-hidden="true"></i>
                      <span>Unified Google Drive Storage Pool</span>
                    </span>
                    <span class="storage-pool-stats" id="storage-pool-stats">
                      <strong>17.6 GB</strong> of <strong>45.0 GB</strong> Pooled (61% Free)
                    </span>
                  </div>
                  <div class="storage-progress-track" role="progressbar" aria-valuenow="39" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-segment seg-mom" style="width: 14%;" title="Mom's Google Drive: 6.3 GB used"></div>
                    <div class="progress-segment seg-dad" style="width: 16%;" title="Dad's Google Drive: 7.2 GB used"></div>
                    <div class="progress-segment seg-grandma" style="width: 7%;" title="Grandma's Google Drive: 3.1 GB used"></div>
                    <div class="progress-segment seg-local" style="width: 2%;" title="Local Failover Buffer: 1.0 GB"></div>
                  </div>
                  <div class="storage-accounts-legend">
                    <div class="legend-item">
                      <span class="legend-dot seg-mom"></span>
                      <span>Mom's Drive (15 GB)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-dot seg-dad"></span>
                      <span>Dad's Drive (15 GB)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-dot seg-grandma"></span>
                      <span>Grandma's Drive (15 GB)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-dot seg-local"></span>
                      <span>Encrypted Local Cache</span>
                    </div>
                  </div>
                </div>

                <!-- Interactive Category Filter Tabs with Count Badges -->
                <div class="vault-category-tabs" role="tablist" aria-label="Vault Categories">
                  <button type="button" class="vault-tab-btn active" data-category="deeds" role="tab" aria-selected="true">
                    <i class="fas fa-file-contract" aria-hidden="true"></i>
                    <span>Vital Deeds &amp; Legal</span>
                    <span class="tab-count-badge">4</span>
                  </button>
                  <button type="button" class="vault-tab-btn" data-category="health" role="tab" aria-selected="false">
                    <i class="fas fa-heartbeat" aria-hidden="true"></i>
                    <span>Health &amp; Medical</span>
                    <span class="tab-count-badge">4</span>
                  </button>
                  <button type="button" class="vault-tab-btn" data-category="keepsakes" role="tab" aria-selected="false">
                    <i class="fas fa-gem" aria-hidden="true"></i>
                    <span>Family Keepsakes</span>
                    <span class="tab-count-badge">4</span>
                  </button>
                  <button type="button" class="vault-tab-btn" data-category="tax" role="tab" aria-selected="false">
                    <i class="fas fa-calculator" aria-hidden="true"></i>
                    <span>Tax &amp; Financials</span>
                    <span class="tab-count-badge">4</span>
                  </button>
                </div>

                <!-- Dynamic Documents Grid Container -->
                <div class="vault-documents-grid" id="vault-documents-mount" role="region" aria-live="polite">
                  <!-- Rendered dynamically via JavaScript with staggered animation -->
                </div>
              </div>
            </div>
          </section>

          <!-- 3. The 3 Core FamDoc Superpowers -->
          <section class="landing-pillars-section" id="section-pillars" aria-labelledby="pillars-title">
            <div class="landing-container">
              <div class="section-header-block">
                <div class="section-pretitle">Engineered For Resilience</div>
                <h2 class="section-title" id="pillars-title">The Three Pillars of FamDoc</h2>
                <p class="section-subtitle">
                  Built specifically to eliminate the frustrations of fragmented cloud drives, monthly subscriptions, and elder confusion.
                </p>
              </div>

              <div class="pillars-bento-grid">
                <!-- Pillar 1 -->
                <article class="pillar-card">
                  <div class="pillar-icon-badge badge-pool">
                    <i class="fas fa-cloud-upload-alt" aria-hidden="true"></i>
                  </div>
                  <h3 class="pillar-title">Multi-Account Drive Pooling</h3>
                  <p class="pillar-desc">
                    Pool Mom, Dad, and Grandma's individual 15 GB Google Drive accounts into one combined, shared storage volume. Expand capacity as your family grows with zero monthly subscription fees.
                  </p>
                  <ul class="pillar-feature-list">
                    <li><i class="fas fa-check" aria-hidden="true"></i> Zero monthly cloud subscription bills</li>
                    <li><i class="fas fa-check" aria-hidden="true"></i> Transparent round-robin quota balancing</li>
                    <li><i class="fas fa-check" aria-hidden="true"></i> Restricted <code>drive.file</code> permissions</li>
                  </ul>
                </article>

                <!-- Pillar 2 -->
                <article class="pillar-card">
                  <div class="pillar-icon-badge badge-failover">
                    <i class="fas fa-shield-virus" aria-hidden="true"></i>
                  </div>
                  <h3 class="pillar-title">Unbreakable Dual-Tier Vault</h3>
                  <p class="pillar-desc">
                    Never lose a file during an upload. Direct uploads stream to Google Drive; if home Wi-Fi drops or API quotas throttle, files immediately write to an encrypted local server disk cache and auto-promote when reconnected.
                  </p>
                  <ul class="pillar-feature-list">
                    <li><i class="fas fa-check" aria-hidden="true"></i> Zero data loss during network outages</li>
                    <li><i class="fas fa-check" aria-hidden="true"></i> Automatic background promotion queue</li>
                    <li><i class="fas fa-check" aria-hidden="true"></i> Local encrypted failover disk cache</li>
                  </ul>
                </article>

                <!-- Pillar 3 -->
                <article class="pillar-card">
                  <div class="pillar-icon-badge badge-generations">
                    <i class="fas fa-users" aria-hidden="true"></i>
                  </div>
                  <h3 class="pillar-title">Engineered For Every Generation</h3>
                  <p class="pillar-desc">
                    Grandparents onboard effortlessly with simple one-click family code stubs — no complex passwords. Parents get one-touch biometric fingerprint lock on Android, and everyone enjoys lightning-fast web previews.
                  </p>
                  <ul class="pillar-feature-list">
                    <li><i class="fas fa-check" aria-hidden="true"></i> Perforated family code stubs for elders</li>
                    <li><i class="fas fa-check" aria-hidden="true"></i> AndroidX Biometrics (Fingerprint / Face)</li>
                    <li><i class="fas fa-check" aria-hidden="true"></i> Sub-50ms cached preview engine</li>
                  </ul>
                </article>
              </div>
            </div>
          </section>

          <!-- 4. Native Android App Showcase -->
          <section class="android-showcase-section" id="section-android" aria-labelledby="android-title">
            <div class="landing-container">
              <div class="android-showcase-card">
                <div class="android-info-content">
                  <div class="android-badge-chip">
                    <i class="fab fa-android" aria-hidden="true"></i>
                    <span>Native Android App &bull; Kotlin &amp; Jetpack Compose</span>
                  </div>
                  <h2 class="android-headline" id="android-title">Your Family Vault in Your Pocket</h2>
                  <p class="android-text">
                    Experience FamDoc natively on Android. Built with Material 3 dynamic theming, offline-first cached previews, camera document scanning, and hardware-backed biometric security.
                  </p>

                  <div class="android-highlights-grid">
                    <div class="android-highlight-item">
                      <i class="fas fa-fingerprint" aria-hidden="true"></i>
                      <div>
                        <div class="hl-title">Biometric Lock</div>
                        <div class="hl-sub">Instant Fingerprint &amp; Face Unlock</div>
                      </div>
                    </div>
                    <div class="android-highlight-item">
                      <i class="fas fa-wifi-slash" aria-hidden="true"></i>
                      <div>
                        <div class="hl-title">Offline Cache</div>
                        <div class="hl-sub">View critical documents without Internet</div>
                      </div>
                    </div>
                    <div class="android-highlight-item">
                      <i class="fas fa-camera" aria-hidden="true"></i>
                      <div>
                        <div class="hl-title">Instant Camera Scan</div>
                        <div class="hl-sub">Snap certificates directly into the vault</div>
                      </div>
                    </div>
                    <div class="android-highlight-item">
                      <i class="fas fa-palette" aria-hidden="true"></i>
                      <div>
                        <div class="hl-title">Material You Design</div>
                        <div class="hl-sub">Emerald Mint &amp; AMOLED Dark theme</div>
                      </div>
                    </div>
                  </div>

                  <div class="android-cta-box">
                    <a href="/apk/FamDoc.apk" download class="android-download-btn" id="btn-download-apk-card">
                      <i class="fas fa-download" aria-hidden="true"></i>
                      <span>Download FamDoc APK (v1.0)</span>
                    </a>
                    <span class="android-apk-details">Direct APK &bull; 19.6 MB &bull; Android 8.0+</span>
                  </div>
                </div>

                <!-- Android Phone Mockup Graphic -->
                <div class="android-phone-mockup" aria-hidden="true">
                  <div class="phone-screen">
                    <div class="phone-status-bar">
                      <span>9:41 AM</span>
                      <span><i class="fas fa-wifi"></i> <i class="fas fa-battery-full"></i></span>
                    </div>
                    <div class="phone-app-bar">
                      <span><i class="fas fa-shield-alt"></i> FamDoc</span>
                      <i class="fas fa-search"></i>
                    </div>
                    <div class="phone-doc-item">
                      <i class="fas fa-file-pdf" style="color: #EF4444;"></i>
                      <div>
                        <div>Ancestral Property Deed</div>
                        <span style="font-size: 0.68rem; color: var(--text-ink-muted);">2.4 MB &bull; Verified</span>
                      </div>
                    </div>
                    <div class="phone-doc-item">
                      <i class="fas fa-image" style="color: #3B82F6;"></i>
                      <div>
                        <div>Grandparents Wedding 1968</div>
                        <span style="font-size: 0.68rem; color: var(--text-ink-muted);">5.4 MB &bull; Restored</span>
                      </div>
                    </div>
                    <div class="phone-biometric-prompt">
                      <i class="fas fa-fingerprint"></i>
                      <span>Touch sensor to unlock private vault</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 5. Family FAQ Accordion Section -->
          <section class="landing-faq-section" id="section-faq" aria-labelledby="faq-title">
            <div class="landing-container">
              <div class="section-header-block">
                <div class="section-pretitle">Transparency &amp; Trust</div>
                <h2 class="section-title" id="faq-title">Frequently Asked Questions</h2>
                <p class="section-subtitle">
                  Clear, honest answers about privacy, pooling, outages, and family onboarding.
                </p>
              </div>

              <div class="faq-list-container">
                <details class="faq-card" open>
                  <summary>
                    <span>How does FamDoc pool multiple Google Drive accounts without monthly fees?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <div class="faq-answer-content">
                    Google provides 15 GB of free cloud storage for every Google account. FamDoc connects to Mom, Dad, and other family members' accounts using OAuth 2.0. Our backend storage manager aggregates these into a unified volume (e.g. 3 accounts = 45 GB). Uploads are intelligently balanced across connected accounts, giving your family abundant cloud storage at zero monthly subscription cost.
                  </div>
                </details>

                <details class="faq-card">
                  <summary>
                    <span>Can FamDoc read my personal Google Photos or existing Drive documents?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <div class="faq-answer-content">
                    <strong>No, absolutely not.</strong> FamDoc exclusively requests Google's restricted <code>drive.file</code> OAuth scope. This strict permission physically prevents the application from viewing, reading, or listing any photos, emails, or files not explicitly created or uploaded through FamDoc. Your personal Drive stays completely untouched.
                  </div>
                </details>

                <details class="faq-card">
                  <summary>
                    <span>What happens if our home Wi-Fi drops while uploading large files?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <div class="faq-answer-content">
                    FamDoc is built with a dual-tier storage architecture. If Google Drive is unreachable or your internet connection disconnects mid-upload, the file safely buffers to an encrypted local server disk cache (<code>local_vault</code>). Once internet connectivity is restored, an asynchronous background queue automatically promotes the file to your Google Drive pool with zero data loss.
                  </div>
                </details>

                <details class="faq-card">
                  <summary>
                    <span>How do elderly grandparents join without creating complex passwords?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <div class="faq-answer-content">
                    The vault organizer (such as a parent) generates a simple, perforated family code stub (e.g., <code>FAM-7K9W2X</code>). Grandparents simply enter this code on the Join screen or scan a QR code to be instantly enrolled into the vault. No complicated password requirements, two-factor authenticator apps, or confusing cloud setups.
                  </div>
                </details>

                <details class="faq-card">
                  <summary>
                    <span>What happens if a family member accidentally deletes an important deed?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <div class="faq-answer-content">
                    FamDoc incorporates non-destructive soft deletion. When a file is removed, it moves to the family Recycle Bin where it is safely preserved with full recovery capability. Only designated vault administrators have the authority to permanently purge records.
                  </div>
                </details>
              </div>
            </div>
          </section>

          <!-- 6. Reassuring Call To Action Banner -->
          <section class="landing-cta-banner-section">
            <div class="landing-container">
              <div class="cta-banner-box">
                <h2 class="cta-banner-title">Give Your Family Records the Sanctuary They Deserve</h2>
                <p class="cta-banner-desc">
                  Start pooling your family's storage today. Set up in less than two minutes, invite your loved ones, and keep your precious memories and vital papers safe for generations.
                </p>
                <div class="cta-banner-actions">
                  <a href="#/register" class="cta-btn-light" id="btn-cta-register">
                    <i class="fas fa-plus-circle" aria-hidden="true"></i>
                    <span>Create Free Family Vault</span>
                  </a>
                  <a href="#/join" class="cta-btn-ghost" id="btn-cta-join">
                    <i class="fas fa-key" aria-hidden="true"></i>
                    <span>Join Existing Family</span>
                  </a>
                  <a href="/apk/FamDoc.apk" download class="cta-btn-ghost" id="btn-cta-apk">
                    <i class="fab fa-android" aria-hidden="true"></i>
                    <span>Download Android App</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <!-- 7. Symmetrical Modern Footer -->
        <footer role="contentinfo" class="landing-footer-section">
          <div class="landing-container">
            <div class="footer-content-grid">
              <div class="footer-brand-column">
                <a href="#/" class="nav-brand-group">
                  <div class="nav-brand-crest">
                    <img src="/img/logo.svg" alt="FamDoc Crest" class="nav-brand-logo" width="28" height="28">
                  </div>
                  <div class="nav-brand-text">
                    <span class="nav-brand-name">Fam<span class="accent">Doc</span></span>
                    <span class="nav-brand-tagline">Family Vault</span>
                  </div>
                </a>
                <p>
                  Enterprise-grade, resilient family keepsake &amp; document vault platform with native Android biometrics and multi-account Google Drive storage pooling.
                </p>
              </div>

              <div>
                <div class="footer-column-title">Product</div>
                <ul class="footer-links-list">
                  <li><a href="#/register">Create Vault</a></li>
                  <li><a href="#/join">Join with Code</a></li>
                  <li><a href="#/login">Sign In</a></li>
                  <li><a href="/apk/FamDoc.apk" download>Download Android APK</a></li>
                </ul>
              </div>

              <div>
                <div class="footer-column-title">Legal &amp; Privacy</div>
                <ul class="footer-links-list">
                  <li><a href="/privacy.html">Privacy Policy</a></li>
                  <li><a href="/terms.html">Terms of Service</a></li>
                  <li><a href="https://developers.google.com/drive/api/guides/api-specific-auth" target="_blank" rel="noopener">Google API Disclosure</a></li>
                </ul>
              </div>

              <div>
                <div class="footer-column-title">Author &amp; Source</div>
                <ul class="footer-links-list">
                  <li><a href="https://portfolioakshay.in" target="_blank" rel="noopener">Author Portfolio</a></li>
                  <li><a href="https://github.com/ra901625072-boop/FamDoc" target="_blank" rel="noopener">GitHub Repository</a></li>
                  <li><a href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/" target="_blank" rel="noopener">LinkedIn Profile</a></li>
                </ul>
              </div>
            </div>

            <div class="footer-bottom-bar">
              <div class="footer-author-attribution">
                Architected &amp; Engineered by <strong>Akshaysinh Rajput</strong> (MCA) &bull; FamDoc Platform v1.0
              </div>
              <div class="footer-social-chips">
                <a href="https://portfolioakshay.in" target="_blank" rel="noopener" class="social-chip" aria-label="Portfolio">
                  <i class="fas fa-globe" aria-hidden="true"></i> <span>Portfolio</span>
                </a>
                <a href="https://github.com/ra901625072-boop/FamDoc" target="_blank" rel="noopener" class="social-chip" aria-label="GitHub">
                  <i class="fab fa-github" aria-hidden="true"></i> <span>GitHub</span>
                </a>
                <a href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/" target="_blank" rel="noopener" class="social-chip" aria-label="LinkedIn">
                  <i class="fab fa-linkedin" aria-hidden="true"></i> <span>LinkedIn</span>
                </a>
              </div>
            </div>
          </div>
        </footer>

        <!-- Interactive Document Preview Modal -->
        <div class="vault-modal-overlay" id="vaultPreviewModal" role="dialog" aria-modal="true" aria-hidden="true">
          <div class="vault-modal-box">
            <div class="modal-header">
              <h3 id="modalDocTitle">Document Preview</h3>
              <button type="button" class="modal-close-btn" id="modalCloseBtn" aria-label="Close preview modal">
                <i class="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-preview-canvas">
                <i class="fas fa-file-pdf" id="modalDocIcon" aria-hidden="true"></i>
                <h4 id="modalDocHeadline">Deed Preview</h4>
                <p id="modalDocSummary">Document summary details will appear here.</p>
              </div>
              <div class="modal-meta-grid">
                <div class="meta-row">
                  <span class="label">Vault Storage Node</span>
                  <span class="val" id="modalDocDrive">Google Drive Pool A</span>
                </div>
                <div class="meta-row">
                  <span class="label">Uploader</span>
                  <span class="val" id="modalDocUploader">Dad</span>
                </div>
                <div class="meta-row">
                  <span class="label">File Size</span>
                  <span class="val" id="modalDocSize">2.4 MB</span>
                </div>
                <div class="meta-row">
                  <span class="label">Security Seal</span>
                  <span class="val" id="modalDocSecurity">Fernet AES-128 Encrypted</span>
                </div>
                <div class="meta-row" style="grid-column: span 2;">
                  <span class="label">Cryptographic Checksum</span>
                  <span class="val" id="modalDocSha" style="font-family: var(--font-mono); font-size: 0.8rem;">SHA-256</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="modalDismissBtn">Close</button>
              <a href="#/register" class="btn btn-primary" id="modalCtaBtn">Secure Your Documents &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    `;

    // ------------------------------------------------------------------------
    // Dynamic Interactive Document Rendering Helper with Staggered Animations
    // ------------------------------------------------------------------------
    function renderCategoryDocs(categoryKey) {
      const container = document.getElementById("vault-documents-mount");
      if (!container) return;

      const categoryData = VAULT_CATEGORIES[categoryKey] || VAULT_CATEGORIES.deeds;
      const docs = categoryData.docs;

      container.innerHTML = docs.map((doc, idx) => `
        <article class="showcase-doc-card doc-card-anim" data-doc-id="${doc.id}" tabindex="0" role="button" aria-label="Preview ${doc.title}" style="animation-delay: ${idx * 60}ms;">
          <div class="doc-icon-box ${doc.iconClass}">
            <i class="${doc.icon}" aria-hidden="true"></i>
          </div>
          <div class="doc-content">
            <h4 class="doc-title">${doc.title}</h4>
            <div class="doc-meta">
              <span>${doc.size}</span>
              <span>&bull;</span>
              <span>${doc.date}</span>
              <span>&bull;</span>
              <span class="doc-owner-tag">
                <i class="fas fa-user-circle" aria-hidden="true"></i> ${doc.uploader}
              </span>
            </div>
            <div class="doc-actions">
              <span class="doc-security-seal">
                <i class="fas fa-lock" aria-hidden="true"></i> ${doc.badge}
              </span>
              <button type="button" class="doc-preview-trigger" data-preview-id="${doc.id}">
                <i class="fas fa-eye" aria-hidden="true"></i> Preview
              </button>
            </div>
          </div>
        </article>
      `).join("");

      // Attach click listeners to cards and preview triggers
      container.querySelectorAll(".showcase-doc-card").forEach(card => {
        card.addEventListener("click", () => {
          const docId = card.getAttribute("data-doc-id");
          const found = docs.find(d => d.id === docId);
          if (found) openPreviewModal(found);
        });
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const docId = card.getAttribute("data-doc-id");
            const found = docs.find(d => d.id === docId);
            if (found) openPreviewModal(found);
          }
        });
      });
    }

    // Modal Opening Handler
    function openPreviewModal(doc) {
      const modal = document.getElementById("vaultPreviewModal");
      if (!modal) return;

      document.getElementById("modalDocTitle").textContent = doc.title;
      document.getElementById("modalDocHeadline").textContent = doc.title;
      document.getElementById("modalDocSummary").textContent = doc.previewSummary;
      document.getElementById("modalDocDrive").textContent = doc.drive;
      document.getElementById("modalDocUploader").textContent = doc.uploader;
      document.getElementById("modalDocSize").textContent = doc.size;
      document.getElementById("modalDocSecurity").textContent = doc.badge;
      
      const shaElem = document.getElementById("modalDocSha");
      if (shaElem) shaElem.textContent = doc.sha || "SHA-256: Verified";

      const iconElem = document.getElementById("modalDocIcon");
      if (iconElem) {
        iconElem.className = doc.icon;
      }

      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    }

    // Modal Closing Handler
    function closePreviewModal() {
      const modal = document.getElementById("vaultPreviewModal");
      if (!modal) return;
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }

    // Attach Category Tab Click Handlers
    const tabButtons = mount.querySelectorAll(".vault-tab-btn");
    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        tabButtons.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        const categoryKey = btn.getAttribute("data-category");
        renderCategoryDocs(categoryKey);
      });
    });

    // Initial render of default category (deeds)
    renderCategoryDocs("deeds");

    // Modal Dismiss Handlers
    const closeBtn = document.getElementById("modalCloseBtn");
    const dismissBtn = document.getElementById("modalDismissBtn");
    const modalOverlay = document.getElementById("vaultPreviewModal");

    if (closeBtn) closeBtn.addEventListener("click", closePreviewModal);
    if (dismissBtn) dismissBtn.addEventListener("click", closePreviewModal);
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closePreviewModal();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePreviewModal();
    });

    // ------------------------------------------------------------------------
    // Mobile Navigation Drawer Toggle
    // ------------------------------------------------------------------------
    const mobileToggle = document.getElementById("mobileMenuToggle");
    const mobileDrawer = document.getElementById("mobileNavDrawer");
    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener("click", () => {
        const isActive = mobileDrawer.classList.toggle("active");
        mobileDrawer.setAttribute("aria-hidden", !isActive);
        mobileToggle.innerHTML = isActive 
          ? '<i class="fas fa-times" aria-hidden="true"></i>' 
          : '<i class="fas fa-bars" aria-hidden="true"></i>';
      });

      // Close drawer on clicking any item inside drawer
      mobileDrawer.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          mobileDrawer.classList.remove("active");
          mobileDrawer.setAttribute("aria-hidden", "true");
          if (mobileToggle) mobileToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
        });
      });
    }

    // ------------------------------------------------------------------------
    // In-Page Smooth Scrolling (Router-Safe)
    // ------------------------------------------------------------------------
    mount.querySelectorAll("[data-scroll]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute("data-scroll");
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // ------------------------------------------------------------------------
    // Theme Switcher Synchronization
    // ------------------------------------------------------------------------
    const themeBtn = document.getElementById("landingThemeToggle");
    if (themeBtn && window.FamDocTheme) {
      themeBtn.addEventListener("click", () => {
        window.FamDocTheme.toggleTheme();
      });
      window.FamDocTheme.updateAllControls();
    }

    // ------------------------------------------------------------------------
    // Session Detection for Login Buttons
    // ------------------------------------------------------------------------
    const loginLinks = [
      document.getElementById("navLoginBtn"),
      document.getElementById("heroLoginSubLink")
    ];

    loginLinks.forEach(link => {
      if (!link) return;
      link.addEventListener("click", async (e) => {
        const token = localStorage.getItem("famdoc_token");
        if (token) {
          e.preventDefault();
          try {
            await FamDocAPI.auth.me();
            window.FamDocRouter.navigate("/dashboard");
          } catch (err) {
            window.FamDocApp.clearSession();
            window.FamDocRouter.navigate("/login");
          }
        }
      });
    });
  };
})();
