/**
 * Landing Page View Manager — FamDoc Modern Product Architecture
 * Redesigned 13-Section UI/UX for Secure Family Document & Keepsake Management
 * Author: Akshaysinh Rajput (MCA)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  window.FamDocViews.landing = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    mount.innerHTML = `
      <div class="landing-page-root fd-page-enter">
        
        <!-- Ambient Radial Glows -->
        <div class="landing-glow-orb orb-emerald" aria-hidden="true"></div>
        <div class="landing-glow-orb orb-amber" aria-hidden="true"></div>

        <!-- ================================================================
             1. HEADER / NAVBAR (Sticky Glassmorphic)
             ================================================================ -->
        <header class="landing-nav" id="landingNav" role="banner">
          <div class="landing-nav-inner">
            <a href="#/" class="landing-nav-brand" aria-label="FamDoc Home">
              <div class="landing-nav-logo">
                <img src="/img/logo.svg" alt="FamDoc Crest" width="30" height="30">
              </div>
              <div class="landing-nav-title">
                <span class="brand-fam">Fam</span><span class="brand-doc">Doc</span>
                <span class="landing-nav-version">v1.0</span>
              </div>
            </a>

            <!-- Desktop Nav Links (Router-Safe data-scroll) -->
            <nav class="landing-nav-menu" role="navigation" aria-label="Main Navigation">
              <a href="#features" class="landing-nav-link" data-scroll="features">Features</a>
              <a href="#problem-solution" class="landing-nav-link" data-scroll="problem-solution">Why FamDoc</a>
              <a href="#how-it-works" class="landing-nav-link" data-scroll="how-it-works">How It Works</a>
              <a href="#showcase" class="landing-nav-link" data-scroll="showcase">Product Tour</a>
              <a href="#use-cases" class="landing-nav-link" data-scroll="use-cases">Use Cases</a>
              <a href="#faq" class="landing-nav-link" data-scroll="faq">FAQ</a>
            </nav>

            <!-- Navbar Actions -->
            <div class="landing-nav-actions">
              <button type="button" class="theme-toggle-btn" id="landingThemeToggle" aria-label="Toggle light/dark theme">
                <i class="fas fa-moon" aria-hidden="true"></i>
              </button>
              <a href="#/login" class="nav-btn-login btn-auth-login" id="navLoginBtn">Log In</a>
              <a href="#/register" class="nav-btn-cta" id="navRegisterBtn">
                <i class="fas fa-plus-circle" aria-hidden="true"></i>
                <span>Create Vault</span>
              </a>
              <button type="button" class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Open mobile navigation menu">
                <i class="fas fa-bars" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- Mobile Slide-Over Drawer -->
        <div class="drawer-backdrop" id="drawerBackdrop" aria-hidden="true"></div>
        <aside class="landing-mobile-drawer" id="landingMobileDrawer" aria-label="Mobile Navigation Drawer">
          <div class="drawer-header">
            <div class="landing-nav-title">
              <span class="brand-fam">Fam</span><span class="brand-doc">Doc</span>
            </div>
            <button type="button" class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close navigation menu">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
          <ul class="drawer-nav-list">
            <li><a href="#features" class="drawer-nav-link" data-scroll="features"><i class="fas fa-shield-alt"></i> <span>Features</span></a></li>
            <li><a href="#problem-solution" class="drawer-nav-link" data-scroll="problem-solution"><i class="fas fa-balance-scale"></i> <span>Why FamDoc</span></a></li>
            <li><a href="#how-it-works" class="drawer-nav-link" data-scroll="how-it-works"><i class="fas fa-layer-group"></i> <span>How It Works</span></a></li>
            <li><a href="#showcase" class="drawer-nav-link" data-scroll="showcase"><i class="fas fa-laptop-code"></i> <span>Product Tour</span></a></li>
            <li><a href="#use-cases" class="drawer-nav-link" data-scroll="use-cases"><i class="fas fa-archive"></i> <span>Use Cases</span></a></li>
            <li><a href="#faq" class="drawer-nav-link" data-scroll="faq"><i class="fas fa-question-circle"></i> <span>FAQ</span></a></li>
          </ul>
          <div class="drawer-actions">
            <a href="#/register" class="btn btn-hero-primary" style="height: 48px;"><i class="fas fa-plus-circle"></i> <span>Create a Family Vault</span></a>
            <a href="#/join" class="btn btn-hero-secondary" style="height: 48px;"><i class="fas fa-key" style="color: var(--brand-accent);"></i> <span>Join with Family Code</span></a>
            <a href="#/login" class="btn-login-link btn-auth-login" style="justify-content: center; padding: 0.5rem;">Already have a vault? <strong>Log In &rarr;</strong></a>
          </div>
        </aside>

        <main role="main">
          <!-- ================================================================
               2. HERO SECTION
               ================================================================ -->
          <section class="landing-section-container landing-hero-section" id="hero">
            <div class="hero-pill-badge">
              <span class="pill-dot" aria-hidden="true"></span>
              <span>Private Family Vault &amp; Keepsake Platform</span>
            </div>

            <h1 class="hero-headline" id="mainHeading">
              The Timeless Digital Vault for Everything Your Family <span class="highlight-gradient">Cherishes</span>.
            </h1>

            <p class="hero-subheadline">
              Consolidate your deeds, wills, certificates, health dossiers, and generational memories into a warm, private vault. Built to feel like a timeless keepsake box, not a cold cloud drive. Powered by resilient Google Drive pooling and native Android biometrics.
            </p>

            <div class="hero-cta-group" role="region" aria-label="Hero Call to Actions">
              <a href="#/register" class="btn btn-hero-primary" id="heroBtnRegister">
                <i class="fas fa-plus-circle" aria-hidden="true"></i>
                <span>Create a Family Vault</span>
              </a>
              <a href="#/join" class="btn btn-hero-secondary" id="heroBtnJoin">
                <i class="fas fa-key" style="color: var(--brand-accent, #F59E0B);" aria-hidden="true"></i>
                <span>Join with Family Code</span>
              </a>
              <a href="/apk/FamDoc.apk" download class="btn btn-hero-apk" id="heroBtnApk">
                <i class="fab fa-android" aria-hidden="true"></i>
                <span>Download Android App</span>
              </a>
            </div>

            <div>
              <a href="#/login" class="hero-login-link btn-auth-login" id="heroLoginPrompt">
                <span>Already have a vault? <strong>Log In &rarr;</strong></span>
              </a>
            </div>

            <div class="hero-trust-bullets">
              <span><i class="fas fa-check-circle" aria-hidden="true"></i> Zero monthly subscription fees</span>
              <span><i class="fas fa-check-circle" aria-hidden="true"></i> Google <code>drive.file</code> restricted scope</span>
              <span><i class="fas fa-check-circle" aria-hidden="true"></i> Dual-tier failover protection</span>
            </div>
          </section>

          <!-- ================================================================
               3. TRUST & SECURITY SIGNALS RIBBON
               ================================================================ -->
          <section class="landing-trust-ribbon" id="trust-signals" aria-label="Trust and Security Architecture Signals">
            <div class="trust-ribbon-grid">
              <div class="trust-ribbon-item">
                <i class="fas fa-shield-alt" aria-hidden="true"></i>
                <div class="trust-ribbon-text">
                  <span class="trust-ribbon-title">Restricted Scope</span>
                  <span class="trust-ribbon-desc">Google drive.file isolated</span>
                </div>
              </div>
              <div class="trust-ribbon-item">
                <i class="fas fa-lock" aria-hidden="true"></i>
                <div class="trust-ribbon-text">
                  <span class="trust-ribbon-title">Fernet AES-128</span>
                  <span class="trust-ribbon-desc">Encrypted cloud tokens</span>
                </div>
              </div>
              <div class="trust-ribbon-item">
                <i class="fas fa-hdd" aria-hidden="true"></i>
                <div class="trust-ribbon-text">
                  <span class="trust-ribbon-title">Dual-Tier Resilient</span>
                  <span class="trust-ribbon-desc">Zero upload data loss</span>
                </div>
              </div>
              <div class="trust-ribbon-item">
                <i class="fas fa-fingerprint" aria-hidden="true"></i>
                <div class="trust-ribbon-text">
                  <span class="trust-ribbon-title">Biometric Native</span>
                  <span class="trust-ribbon-desc">AndroidX Touch / Face</span>
                </div>
              </div>
              <div class="trust-ribbon-item">
                <i class="fas fa-virus-slash" aria-hidden="true"></i>
                <div class="trust-ribbon-text">
                  <span class="trust-ribbon-title">VirusTotal Scans</span>
                  <span class="trust-ribbon-desc">SHA-256 integrity checks</span>
                </div>
              </div>
            </div>
          </section>

          <!-- ================================================================
               4. PROBLEM ➔ SOLUTION SECTION
               ================================================================ -->
          <section class="landing-section-container" id="problem-solution">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-balance-scale" aria-hidden="true"></i>
                <span>The Challenge &amp; The Vault</span>
              </div>
              <h2 class="section-title">Why Generic Cloud Drives Fail Families</h2>
              <p class="section-subtitle">
                Commercial clouds are built for corporate enterprise work, not family continuity. Here is how FamDoc transforms fragile records into permanent keepsakes.
              </p>
            </div>

            <div class="problem-solution-grid">
              <!-- Card 1 -->
              <article class="ps-card">
                <div class="ps-side">
                  <span class="ps-tag tag-problem"><i class="fas fa-times-circle"></i> The Frustration</span>
                  <h3 class="ps-title">Fragmented Across WhatsApp &amp; Old Hard Drives</h3>
                  <p class="ps-desc">Property deeds, tax filings, and insurance policies get buried in chat messages, forgotten email threads, and corrupted flash drives.</p>
                </div>
                <div class="ps-divider"><i class="fas fa-arrow-down"></i></div>
                <div class="ps-side">
                  <span class="ps-tag tag-solution"><i class="fas fa-check-circle"></i> The FamDoc Solution</span>
                  <h3 class="ps-title">One Timeless Family Keepsake Vault</h3>
                  <p class="ps-desc">A single shared, beautiful space structured with clean family folders, instant full-text search, and multi-generation accessibility.</p>
                </div>
              </article>

              <!-- Card 2 -->
              <article class="ps-card">
                <div class="ps-side">
                  <span class="ps-tag tag-problem"><i class="fas fa-times-circle"></i> The Frustration</span>
                  <h3 class="ps-title">Expensive Monthly Cloud Subscriptions</h3>
                  <p class="ps-desc">Commercial storage providers charge $10–$30/month per user as soon as a single family member fills their default 15GB quota.</p>
                </div>
                <div class="ps-divider"><i class="fas fa-arrow-down"></i></div>
                <div class="ps-side">
                  <span class="ps-tag tag-solution"><i class="fas fa-check-circle"></i> The FamDoc Solution</span>
                  <h3 class="ps-title">Multi-Account Google Drive Pooling</h3>
                  <p class="ps-desc">FamDoc aggregates multiple family members' Google accounts into one unified free pool with an automatic round-robin storage router.</p>
                </div>
              </article>

              <!-- Card 3 -->
              <article class="ps-card">
                <div class="ps-side">
                  <span class="ps-tag tag-problem"><i class="fas fa-times-circle"></i> The Frustration</span>
                  <h3 class="ps-title">Complex Password Lockouts for Elders</h3>
                  <p class="ps-desc">Grandparents and non-technical family members get locked out by complex alphanumeric password rules and confusing two-factor apps.</p>
                </div>
                <div class="ps-divider"><i class="fas fa-arrow-down"></i></div>
                <div class="ps-side">
                  <span class="ps-tag tag-solution"><i class="fas fa-check-circle"></i> The FamDoc Solution</span>
                  <h3 class="ps-title">Perforated Keepsake Code Stubs</h3>
                  <p class="ps-desc">Admins print or send one physical-looking family admission code. Family members join with zero setup headache or passwords.</p>
                </div>
              </article>

              <!-- Card 4 -->
              <article class="ps-card">
                <div class="ps-side">
                  <span class="ps-tag tag-problem"><i class="fas fa-times-circle"></i> The Frustration</span>
                  <h3 class="ps-title">Spotty Internet Drops Large Scans</h3>
                  <p class="ps-desc">Uploading multi-megabyte PDFs or deeds over weak home Wi-Fi fails silently, leaving documents missing from the family cloud.</p>
                </div>
                <div class="ps-divider"><i class="fas fa-arrow-down"></i></div>
                <div class="ps-side">
                  <span class="ps-tag tag-solution"><i class="fas fa-check-circle"></i> The FamDoc Solution</span>
                  <h3 class="ps-title">Dual-Tier Local Disk Failover Buffer</h3>
                  <p class="ps-desc">Files write instantly to the local server disk during any network hiccups, and an asynchronous worker promotes them to cloud storage safely.</p>
                </div>
              </article>
            </div>
          </section>

          <!-- ================================================================
               5. KEY FEATURES GRID (6 Cards)
               ================================================================ -->
          <section class="landing-section-container" id="features">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-star" aria-hidden="true"></i>
                <span>Platform Capabilities</span>
              </div>
              <h2 class="section-title">Engineered for Warmth, Built for Security</h2>
              <p class="section-subtitle">
                Everything required to protect, catalog, and inherit generational documents without complexity.
              </p>
            </div>

            <div class="landing-features-grid">
              <!-- Feature 1 -->
              <article class="feature-box">
                <div class="feature-box-icon icon-pool">
                  <i class="fas fa-hdd" aria-hidden="true"></i>
                </div>
                <h3 class="feature-box-title">Multi-Account Drive Pooling</h3>
                <p class="feature-box-desc">Connect multiple family Google accounts. FamDoc balances uploads across accounts using a smart quota engine, multiplying storage at $0 extra cost.</p>
                <div class="feature-box-footer">
                  <i class="fas fa-check"></i> <span>OAuth 2.0 with Fernet AES</span>
                </div>
              </article>

              <!-- Feature 2 -->
              <article class="feature-box">
                <div class="feature-box-icon icon-stub">
                  <i class="fas fa-ticket-alt" aria-hidden="true"></i>
                </div>
                <h3 class="feature-box-title">Perforated Code Stubs</h3>
                <p class="feature-box-desc">Seamless member invitations using tangible, numbered admission stubs. Grandparents and kids enter the vault in one click with role-based access.</p>
                <div class="feature-box-footer">
                  <i class="fas fa-check"></i> <span>Frictionless family onboarding</span>
                </div>
              </article>

              <!-- Feature 3 -->
              <article class="feature-box">
                <div class="feature-box-icon icon-preview">
                  <i class="fas fa-eye" aria-hidden="true"></i>
                </div>
                <h3 class="feature-box-title">Zero-Latency Previews</h3>
                <p class="feature-box-desc">Client-side PDF.js rendering and canvas thumbnail downscaling store compressed previews locally, giving instant browsing without waiting for cloud loads.</p>
                <div class="feature-box-footer">
                  <i class="fas fa-check"></i> <span>Sub-50ms thumbnail caching</span>
                </div>
              </article>

              <!-- Feature 4 -->
              <article class="feature-box">
                <div class="feature-box-icon icon-failover">
                  <i class="fas fa-cloud-upload-alt" aria-hidden="true"></i>
                </div>
                <h3 class="feature-box-title">Dual-Tier Failover Engine</h3>
                <p class="feature-box-desc">Never drop an upload. If Google Drive is slow or offline, files buffer safely to an encrypted local server disk and auto-promote to the cloud once reconnected.</p>
                <div class="feature-box-footer">
                  <i class="fas fa-check"></i> <span>Atomic distributed worker leases</span>
                </div>
              </article>

              <!-- Feature 5 -->
              <article class="feature-box">
                <div class="feature-box-icon icon-biometric">
                  <i class="fas fa-fingerprint" aria-hidden="true"></i>
                </div>
                <h3 class="feature-box-title">Native Android Biometrics</h3>
                <p class="feature-box-desc">Access family documents on the go with a native Kotlin + Jetpack Compose app featuring AndroidX Fingerprint and Face Unlock with offline previews.</p>
                <div class="feature-box-footer">
                  <i class="fas fa-check"></i> <span>Material You dynamic theme</span>
                </div>
              </article>

              <!-- Feature 6 -->
              <article class="feature-box">
                <div class="feature-box-icon icon-undo">
                  <i class="fas fa-undo-alt" aria-hidden="true"></i>
                </div>
                <h3 class="feature-box-title">Non-Destructive Recycle Bin</h3>
                <p class="feature-box-desc">Optimistic deletion with a floating 5-second countdown undo toast. Deleted items retain hierarchical tree restoration for 30 days before permanent cleanup.</p>
                <div class="feature-box-footer">
                  <i class="fas fa-check"></i> <span>Accidental deletion prevention</span>
                </div>
              </article>
            </div>
          </section>

          <!-- ================================================================
               6. HOW IT WORKS TIMELINE (4 Steps)
               ================================================================ -->
          <section class="landing-section-container" id="how-it-works">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-layer-group" aria-hidden="true"></i>
                <span>Simple Workflow</span>
              </div>
              <h2 class="section-title">Four Steps to Total Family Document Freedom</h2>
              <p class="section-subtitle">
                Setup takes under three minutes. No technical background or server configuration required.
              </p>
            </div>

            <div class="how-it-works-timeline">
              <div class="how-step-card">
                <div class="how-step-badge">01</div>
                <h3 class="how-step-title">Create Family Vault</h3>
                <p class="how-step-desc">Register your account and name your family keepsake vault. Your secure administrator dashboard initializes in seconds.</p>
              </div>

              <div class="how-step-card">
                <div class="how-step-badge">02</div>
                <h3 class="how-step-title">Connect Storage Pool</h3>
                <p class="how-step-desc">Link one or more Google Drive accounts. FamDoc securely requests restricted <code>drive.file</code> scope with Fernet encryption.</p>
              </div>

              <div class="how-step-card">
                <div class="how-step-badge">03</div>
                <h3 class="how-step-title">Invite via Code Stubs</h3>
                <p class="how-step-desc">Generate perforated family admission tickets. Share the simple code with parents, children, or siblings to join the vault.</p>
              </div>

              <div class="how-step-card">
                <div class="how-step-badge">04</div>
                <h3 class="how-step-title">Organize &amp; Protect</h3>
                <p class="how-step-desc">Upload deeds, certificates, and heirloom photos with drag-and-drop. Enjoy instant full-text search and biometric mobile access.</p>
              </div>
            </div>
          </section>

          <!-- ================================================================
               7. INTERACTIVE PRODUCT SHOWCASE
               ================================================================ -->
          <section class="landing-showcase-section" id="showcase">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-desktop" aria-hidden="true"></i>
                <span>Product Tour</span>
              </div>
              <h2 class="section-title">Experience FamDoc Across Web &amp; Mobile</h2>
              <p class="section-subtitle">
                A unified, calm visual experience designed to bring clarity to generational documents.
              </p>
            </div>

            <!-- Tab Switcher -->
            <div class="showcase-tab-controls" role="tablist">
              <button type="button" class="showcase-tab-btn active" data-tab="web" role="tab" aria-selected="true" id="tabBtnWeb">
                <i class="fas fa-laptop" aria-hidden="true"></i>
                <span>Web Desktop Dashboard</span>
              </button>
              <button type="button" class="showcase-tab-btn" data-tab="mobile" role="tab" aria-selected="false" id="tabBtnMobile">
                <i class="fas fa-mobile-alt" aria-hidden="true"></i>
                <span>Native Android App</span>
              </button>
            </div>

            <!-- Web Desktop Mockup -->
            <div class="mockup-window" id="showcaseWebMockup" role="tabpanel" aria-labelledby="tabBtnWeb">
              <div class="mockup-titlebar">
                <div class="mockup-dots" aria-hidden="true">
                  <span class="mockup-dot dot-red"></span>
                  <span class="mockup-dot dot-yellow"></span>
                  <span class="mockup-dot dot-green"></span>
                </div>
                <div class="mockup-address-bar">
                  <i class="fas fa-lock" aria-hidden="true"></i>
                  <span>https://famdoc.app/#/vault</span>
                </div>
              </div>
              <div class="mockup-content">
                <div class="mockup-header-strip">
                  <div class="mockup-greeting">Rajput Family Vault</div>
                  <div class="mockup-quick-actions">
                    <span class="mock-btn-chip primary"><i class="fas fa-cloud-upload-alt"></i> Upload File</span>
                    <span class="mock-btn-chip"><i class="fas fa-folder-plus"></i> New Folder</span>
                    <span class="mock-btn-chip"><i class="fas fa-ticket-alt"></i> Invite Member</span>
                  </div>
                </div>

                <!-- 4 Stat Cards -->
                <div class="mockup-stats-row">
                  <div class="mock-stat-card">
                    <div class="mock-stat-label">Total Files</div>
                    <div class="mock-stat-val">148</div>
                  </div>
                  <div class="mock-stat-card">
                    <div class="mock-stat-label">Folders</div>
                    <div class="mock-stat-val">22</div>
                  </div>
                  <div class="mock-stat-card">
                    <div class="mock-stat-label">Pooled Storage</div>
                    <div class="mock-stat-val">4.8 GB <span style="font-size: 0.8rem; color: var(--text-ink-muted); font-weight: 500;">/ 45 GB</span></div>
                  </div>
                  <div class="mock-stat-card">
                    <div class="mock-stat-label">Family Members</div>
                    <div class="mock-stat-val">5</div>
                  </div>
                </div>

                <!-- Mock Files Grid -->
                <div class="mockup-file-grid">
                  <div class="mock-file-card">
                    <div class="mock-file-icon pdf"><i class="fas fa-file-pdf"></i></div>
                    <div class="mock-file-info">
                      <span class="mock-file-name">Property_Deed_Ancestral.pdf</span>
                      <span class="mock-file-meta">2.4 MB • Synced to Cloud</span>
                    </div>
                  </div>
                  <div class="mock-file-card">
                    <div class="mock-file-icon image"><i class="fas fa-file-image"></i></div>
                    <div class="mock-file-info">
                      <span class="mock-file-name">Grandparents_Golden_Jubilee.jpg</span>
                      <span class="mock-file-meta">4.1 MB • Synced to Cloud</span>
                    </div>
                  </div>
                  <div class="mock-file-card">
                    <div class="mock-file-icon pdf"><i class="fas fa-file-pdf"></i></div>
                    <div class="mock-file-info">
                      <span class="mock-file-name">Family_Health_Insurance_2026.pdf</span>
                      <span class="mock-file-meta">1.8 MB • Encrypted Safe</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile Showcase Bezel -->
            <div class="mobile-mockup-frame" id="showcaseMobileMockup" role="tabpanel" aria-labelledby="tabBtnMobile">
              <div class="mobile-notch"></div>
              <div class="mobile-screen-content">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                  <span style="font-weight: 700; color: var(--color-primary);"><i class="fas fa-shield-alt"></i> FamDoc</span>
                  <span style="font-size: 0.75rem; color: var(--text-ink-muted);">Biometric Ready</span>
                </div>
                <div class="mobile-biometric-prompt">
                  <div class="biometric-icon-pulse">
                    <i class="fas fa-fingerprint"></i>
                  </div>
                  <h4 style="font-family: var(--font-serif); font-size: 1.1rem; margin-bottom: 0.35rem; color: var(--text-ink);">Unlock Family Vault</h4>
                  <p style="font-size: 0.8rem; color: var(--text-ink-muted); margin: 0;">Touch the fingerprint sensor or glance to confirm identity</p>
                </div>
                <div style="text-align: left; padding: 0.5rem 0;">
                  <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-ink-muted); margin-bottom: 0.5rem;">QUICK ACCESS</div>
                  <div style="background: var(--surface-paper-hover); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 0.5rem;">📁 Real Estate &amp; Deeds</div>
                  <div style="background: var(--surface-paper-hover); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem;">📁 Health &amp; Prescriptions</div>
                </div>
              </div>
            </div>
          </section>

          <!-- ================================================================
               8. BENEFITS / WHY CHOOSE US (Bento-Grid)
               ================================================================ -->
          <section class="landing-section-container" id="benefits">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-award" aria-hidden="true"></i>
                <span>The FamDoc Advantage</span>
              </div>
              <h2 class="section-title">Built Different. Built for Generational Trust.</h2>
              <p class="section-subtitle">
                Five architectural distinctions that set FamDoc apart from transactional cloud drives.
              </p>
            </div>

            <div class="bento-grid">
              <!-- Bento 1: Dual-Tier Architecture -->
              <div class="bento-card span-2">
                <div class="bento-icon"><i class="fas fa-shield-virus"></i></div>
                <h3 class="bento-card-title">Dual-Tier Zero-Data-Loss Architecture</h3>
                <p class="bento-card-desc">
                  Commercial clouds reject or fail uploads when network speeds fluctuate or quotas burst. FamDoc incorporates a failover local disk buffer that immediately saves the payload, verifies file integrity, and deploys an autonomous background worker to stream items to Google Drive once connectivity stabilizes.
                </p>
              </div>

              <!-- Bento 2: Zero Subscription -->
              <div class="bento-card">
                <div class="bento-icon"><i class="fas fa-hand-holding-usd"></i></div>
                <h3 class="bento-card-title">Zero Monthly Fees</h3>
                <p class="bento-card-desc">
                  Aggregate three 15GB Google accounts to yield 45GB of unified storage space without recurring monthly credit card bills.
                </p>
              </div>

              <!-- Bento 3: Strict Scope -->
              <div class="bento-card">
                <div class="bento-icon"><i class="fas fa-user-shield"></i></div>
                <h3 class="bento-card-title">100% Restricted Scope</h3>
                <p class="bento-card-desc">
                  Google's <code>drive.file</code> scope physically forbids FamDoc from reading existing photos, emails, or personal spreadsheets in your Google account.
                </p>
              </div>

              <!-- Bento 4: Elder Friendly -->
              <div class="bento-card">
                <div class="bento-icon"><i class="fas fa-users-cog"></i></div>
                <h3 class="bento-card-title">Family-First Accessibility</h3>
                <p class="bento-card-desc">
                  One-time keepsake code stubs allow non-technical family elders to explore documents without password lockouts or 2FA friction.
                </p>
              </div>

              <!-- Bento 5: Fast Caching -->
              <div class="bento-card">
                <div class="bento-icon"><i class="fas fa-bolt"></i></div>
                <h3 class="bento-card-title">Offline-First Caching</h3>
                <p class="bento-card-desc">
                  Thumbnails are compressed directly on your machine and stored locally, enabling instant browsing even in airplane mode.
                </p>
              </div>
            </div>
          </section>

          <!-- ================================================================
               9. TARGET USE CASES GRID
               ================================================================ -->
          <section class="landing-section-container" id="use-cases">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-archive" aria-hidden="true"></i>
                <span>Everyday Use Cases</span>
              </div>
              <h2 class="section-title">What Belongs Inside Your Family Vault</h2>
              <p class="section-subtitle">
                Organize documents by importance so family members can locate critical paperwork in seconds.
              </p>
            </div>

            <div class="use-cases-grid">
              <div class="use-case-card">
                <div class="use-case-badge">🏡</div>
                <h3 class="use-case-title">Property Deeds &amp; Mortgages</h3>
                <p class="use-case-desc">Land registry records, tax receipts, sale agreements, architectural blueprints, and home warranty paperwork.</p>
              </div>

              <div class="use-case-card">
                <div class="use-case-badge">📜</div>
                <h3 class="use-case-title">Vital Identity &amp; Estate Wills</h3>
                <p class="use-case-desc">Birth certificates, marriage licenses, passports, social security files, powers of attorney, and legal wills.</p>
              </div>

              <div class="use-case-card">
                <div class="use-case-badge">🏥</div>
                <h3 class="use-case-title">Medical History &amp; Policies</h3>
                <p class="use-case-desc">Immunization records, blood group dossiers, chronic prescription records, and health insurance policy documents.</p>
              </div>

              <div class="use-case-card">
                <div class="use-case-badge">🎓</div>
                <h3 class="use-case-title">Degrees &amp; Milestones</h3>
                <p class="use-case-desc">University diplomas, school transcripts, heritage portraits, family anniversary albums, and keepsakes.</p>
              </div>
            </div>
          </section>

          <!-- ================================================================
               10. SOCIAL PROOF & ARCHITECTURE TRANSPARENCY
               ================================================================ -->
          <section class="landing-social-proof" id="transparency">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-code-branch" aria-hidden="true"></i>
                <span>Engineering Integrity</span>
              </div>
              <h2 class="section-title">Built with Transparent, Open-Source Security</h2>
              <p class="section-subtitle">
                Zero telemetry trackers. Zero proprietary lock-in. Full open-source auditability.
              </p>
            </div>

            <div class="stats-counter-grid">
              <div class="stat-counter-box">
                <span class="stat-counter-number">100%</span>
                <span class="stat-counter-label">Open-Source &amp; Auditable</span>
              </div>
              <div class="stat-counter-box">
                <span class="stat-counter-number">2-Tier</span>
                <span class="stat-counter-label">Failover Storage Buffer</span>
              </div>
              <div class="stat-counter-box">
                <span class="stat-counter-number">0</span>
                <span class="stat-counter-label">Third-Party Ad Trackers</span>
              </div>
              <div class="stat-counter-box">
                <span class="stat-counter-number">&lt; 50ms</span>
                <span class="stat-counter-label">Cached Preview Latency</span>
              </div>
            </div>

            <div class="author-attribution-card">
              <p class="author-attribution-text">
                Architected &amp; Engineered by <strong>Akshaysinh Rajput</strong> (MCA)
              </p>
              <div class="author-chips-row">
                <a href="https://portfolioakshay.in" target="_blank" rel="noopener" class="author-link-chip">
                  <i class="fas fa-globe" aria-hidden="true"></i>
                  <span>Portfolio</span>
                </a>
                <a href="https://github.com/ra901625072-boop/FamDoc" target="_blank" rel="noopener" class="author-link-chip">
                  <i class="fab fa-github" aria-hidden="true"></i>
                  <span>GitHub Repository</span>
                </a>
                <a href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/" target="_blank" rel="noopener" class="author-link-chip">
                  <i class="fab fa-linkedin" aria-hidden="true"></i>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>
          </section>

          <!-- ================================================================
               11. FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION
               ================================================================ -->
          <section class="landing-section-container" id="faq">
            <div class="landing-section-header">
              <div class="section-pill-badge">
                <i class="fas fa-question-circle" aria-hidden="true"></i>
                <span>Direct Answers</span>
              </div>
              <h2 class="section-title">Frequently Asked Questions</h2>
              <p class="section-subtitle">
                Clear technical answers about privacy, pooling, storage architecture, and data ownership.
              </p>
            </div>

            <div class="landing-faq-accordion">
              <details class="faq-item">
                <summary>
                  <span>How does FamDoc pool multiple Google Drive accounts?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  FamDoc connects to individual family members' Google accounts using OAuth 2.0. Each account's credentials are encrypted via Fernet AES-128. FamDoc's storage router dynamically balances new uploads across available accounts using a round-robin quota algorithm, effectively turning three 15GB free accounts into 45GB of shared family storage.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>Can FamDoc read my personal Google Photos or existing Drive documents?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  <strong>No.</strong> FamDoc exclusively requests Google's restricted <code>drive.file</code> OAuth scope. This permission physically prevents the application from viewing, listing, or modifying any file, photo, or email that was not created or uploaded through FamDoc.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>What happens if an upload is interrupted by a network outage?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  FamDoc incorporates a dual-tier storage architecture. If Google Drive is unreachable or your home connection drops, the file immediately writes to an encrypted local server disk cache. When the connection restores, an asynchronous background worker safely promotes the file to cloud storage.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>How do grandparents and non-technical members join the vault?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  The vault administrator generates a physical-looking keepsake code stub (e.g. <code>FAM-8492-DOCS</code>). Family members click "Join with Family Code", enter the stub code, and are granted instant access without having to configure passwords or multi-factor authenticator apps.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>Is there a native Android mobile application?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  Yes. FamDoc includes a native Kotlin + Jetpack Compose Android app. It supports Material You dynamic theming, offline cached document previews, and AndroidX Biometrics (Fingerprint and Face Unlock) for secure on-the-go access.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>How are my OAuth credentials protected in the database?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  Credentials and tokens are encrypted using symmetric Fernet AES-128-CBC encryption before being written to the database. The encryption keys are securely held server-side, ensuring credentials never exist in plaintext in database dumps or query logs.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>Can I recover accidentally deleted family documents?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  Yes. Deletions feature an instant 5-second undo toast in the web interface. If the undo window passes, the document moves to the Recycle Bin with a 30-day retention guarantee and batch-aware tree restoration before permanent deletion.
                </div>
              </details>

              <details class="faq-item">
                <summary>
                  <span>How much does FamDoc cost?</span>
                  <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                </summary>
                <div class="faq-answer">
                  FamDoc is free and open-source software under the MIT license. You can host it yourself on free tiers (Render, Vercel, and Supabase) and utilize your family's existing free Google Drive quotas with zero monthly fees.
                </div>
              </details>
            </div>
          </section>

          <!-- ================================================================
               12. FINAL HIGH-IMPACT CALL-TO-ACTION
               ================================================================ -->
          <section class="landing-section-container" id="cta">
            <div class="landing-final-cta">
              <h2 class="final-cta-headline">Give Your Family Records the Safe Home They Deserve.</h2>
              <p class="final-cta-subheadline">
                Join organized families safeguarding their vital records today. Safe, private, and ready in minutes.
              </p>
              <div class="final-cta-buttons">
                <a href="#/register" class="btn btn-cta-white" id="ctaBtnRegister">
                  <i class="fas fa-plus-circle" aria-hidden="true"></i>
                  <span>Create a Family Vault — Free</span>
                </a>
                <a href="/apk/FamDoc.apk" download class="btn btn-cta-outline" id="ctaBtnDownload">
                  <i class="fab fa-android" aria-hidden="true"></i>
                  <span>Download Android App (APK)</span>
                </a>
              </div>
            </div>
          </section>
        </main>

        <!-- ================================================================
             13. MULTI-COLUMN FOOTER
             ================================================================ -->
        <footer class="landing-footer" role="contentinfo">
          <div class="footer-top-grid">
            <!-- Col 1 -->
            <div class="footer-brand-col">
              <div class="footer-brand-title">
                <div class="landing-nav-logo" style="width: 32px; height: 32px;">
                  <img src="/img/logo.svg" alt="FamDoc Crest" width="24" height="24">
                </div>
                <span>FamDoc</span>
              </div>
              <p class="footer-brand-desc">
                An enterprise-grade, resilient document and keepsake management platform engineered specifically for families.
              </p>
            </div>

            <!-- Col 2: Product -->
            <div>
              <div class="footer-col-title">Product</div>
              <ul class="footer-links-list">
                <li><a href="#features" data-scroll="features">Key Features</a></li>
                <li><a href="#how-it-works" data-scroll="how-it-works">How It Works</a></li>
                <li><a href="#showcase" data-scroll="showcase">Product Tour</a></li>
                <li><a href="/apk/FamDoc.apk" download><i class="fab fa-android"></i> Android APK (v1.0)</a></li>
              </ul>
            </div>

            <!-- Col 3: Legal & Security -->
            <div>
              <div class="footer-col-title">Security &amp; Legal</div>
              <ul class="footer-links-list">
                <li><a href="/privacy.html">Privacy Policy</a></li>
                <li><a href="/terms.html">Terms of Service</a></li>
                <li><a href="#trust-signals" data-scroll="trust-signals">Restricted Scope Policy</a></li>
                <li><a href="#faq" data-scroll="faq">Security Architecture</a></li>
              </ul>
            </div>

            <!-- Col 4: Community & Author -->
            <div>
              <div class="footer-col-title">Engineering</div>
              <ul class="footer-links-list">
                <li><a href="https://github.com/ra901625072-boop/FamDoc" target="_blank" rel="noopener"><i class="fab fa-github"></i> GitHub Repository</a></li>
                <li><a href="https://portfolioakshay.in" target="_blank" rel="noopener"><i class="fas fa-globe"></i> Akshaysinh Rajput</a></li>
                <li><a href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/" target="_blank" rel="noopener"><i class="fab fa-linkedin"></i> LinkedIn Profile</a></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom-bar">
            <span>&copy; ${new Date().getFullYear()} FamDoc. Open-Source Family Keepsake Vault. MIT Licensed.</span>
            <span>Architected with FastAPI, Kotlin Compose &amp; Vanilla JS.</span>
          </div>
        </footer>

      </div>
    `;

    // ------------------------------------------------------------------------
    // INTERACTIVE CONTROLLERS
    // ------------------------------------------------------------------------

    // 1. Sync theme toggle button
    const themeBtn = document.getElementById("landingThemeToggle");
    if (themeBtn && window.FamDocTheme) {
      themeBtn.addEventListener("click", () => {
        window.FamDocTheme.toggleTheme();
        updateThemeIcon();
      });
      updateThemeIcon();
    }

    function updateThemeIcon() {
      if (!themeBtn || !window.FamDocTheme) return;
      const currentTheme = window.FamDocTheme.getCurrentTheme();
      themeBtn.innerHTML = currentTheme === 'dark' 
        ? '<i class="fas fa-sun" aria-hidden="true"></i>' 
        : '<i class="fas fa-moon" aria-hidden="true"></i>';
    }

    // 2. In-Page Smooth Scroll (Router-Safe: Prevents hash collision with SPA router)
    mount.querySelectorAll("[data-scroll]").forEach(trigger => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = trigger.getAttribute("data-scroll");
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }
        closeMobileDrawer();
      });
    });

    // 3. Mobile Slide-Over Drawer Controls
    const mobileToggle = document.getElementById("mobileMenuToggle");
    const drawerClose = document.getElementById("drawerCloseBtn");
    const drawer = document.getElementById("landingMobileDrawer");
    const backdrop = document.getElementById("drawerBackdrop");

    function openMobileDrawer() {
      if (drawer) drawer.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeMobileDrawer() {
      if (drawer) drawer.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
      document.body.style.overflow = "";
    }

    if (mobileToggle) mobileToggle.addEventListener("click", openMobileDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeMobileDrawer);
    if (backdrop) backdrop.addEventListener("click", closeMobileDrawer);

    // 4. Interactive Product Showcase Tab Switcher
    const showcaseTabs = mount.querySelectorAll(".showcase-tab-btn");
    const webMockup = document.getElementById("showcaseWebMockup");
    const mobileMockup = document.getElementById("showcaseMobileMockup");

    showcaseTabs.forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        const targetTab = tabBtn.getAttribute("data-tab");
        showcaseTabs.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        tabBtn.classList.add("active");
        tabBtn.setAttribute("aria-selected", "true");

        if (targetTab === "web") {
          if (webMockup) webMockup.style.display = "block";
          if (mobileMockup) mobileMockup.style.display = "none";
        } else {
          if (webMockup) webMockup.style.display = "none";
          if (mobileMockup) mobileMockup.style.display = "block";
        }
      });
    });

    // 5. Intelligent Auth Check for Login Link
    const loginLinks = mount.querySelectorAll(".btn-auth-login");
    loginLinks.forEach(link => {
      link.addEventListener("click", async (e) => {
        const token = localStorage.getItem("famdoc_token");
        if (token) {
          e.preventDefault();
          const origHtml = link.innerHTML;
          link.style.pointerEvents = "none";
          link.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Verifying...</span>`;

          try {
            await FamDocAPI.auth.me();
            window.FamDocRouter.navigate('/dashboard');
          } catch (err) {
            window.FamDocApp.clearSession();
            window.FamDocRouter.navigate('/login');
          } finally {
            link.style.pointerEvents = "";
            link.innerHTML = origHtml;
          }
        }
      });
    });
  };
})();
