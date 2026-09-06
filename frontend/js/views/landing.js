/**
 * Landing Page View Manager
 * Matches Android App LandingScreen.kt with Enhanced AEO/GEO Discoverability
 * Author: Akshaysinh Rajput
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  window.FamDocViews.landing = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Check if pre-rendered content already exists to avoid redundant DOM thrashing
    const existingLanding = mount.querySelector(".landing-wrapper");
    if (!existingLanding) {
      mount.innerHTML = `
        <div class="landing-wrapper fd-page-enter">
          <!-- Symmetrical Top Navigation Bar -->
          <div class="landing-top-bar">
            <button class="landing-top-btn guest-theme-toggle" aria-label="Toggle visual theme between light and dark" id="landingThemeToggle">
              <i class="fas fa-moon" aria-hidden="true"></i>
              <span>Theme</span>
            </button>
            <div class="landing-top-pill">
              <i class="fas fa-shield-alt" aria-hidden="true"></i>
              <span>Private Family Vault</span>
            </div>
            <a href="#/login" class="landing-top-btn" aria-label="Log in to your existing vault" id="landingTopLogin">
              <i class="fas fa-sign-in-alt" aria-hidden="true"></i>
              <span>Log In</span>
            </a>
          </div>

          <!-- Bespoke Hero Crest & Brand Typography -->
          <header role="banner" class="landing-brand-hero">
            <div class="landing-crest-container">
              <img src="/img/logo.svg" alt="FamDoc Family Keepsake Crest Logo" class="landing-crest-img" width="72" height="72">
            </div>
            <div class="landing-brand-title">
              <span class="fam-text">Fam</span><span class="doc-text">Doc</span>
            </div>
            <div class="landing-brand-tagline">
              <span class="tagline-rule" aria-hidden="true"></span>
              <span>Family Document Vault</span>
              <span class="tagline-rule" aria-hidden="true"></span>
            </div>
          </header>
          
          <main role="main">
            <h1 class="landing-hero" id="main-heading">Gather your family's records in one timeless vault.</h1>
            
            <p class="landing-subtitle">
              Preserve your deeds, certificates, family heirlooms, and documents in a warm, private vault. Built to feel like a timeless keepsake box, not a cold cloud drive. Powered by resilient dual-tier Google Drive pooling and native Android biometrics.
            </p>
            
            <div class="landing-actions" role="region" aria-label="Primary Actions">
              <div class="landing-buttons-group">
                <a href="#/register" class="btn btn-primary" id="btn-register-vault" aria-label="Create a new Family Vault">
                  <i class="fas fa-plus-circle" aria-hidden="true"></i>
                  <span>Create a Family Vault</span>
                </a>
                <a href="#/join" class="btn btn-secondary" id="btn-join-family" aria-label="Join an existing family with a code">
                  <i class="fas fa-key icon-stub" aria-hidden="true"></i>
                  <span>Join with Family Code</span>
                </a>
                <a href="/apk/FamDoc.apk" download class="btn btn-secondary" id="btn-download-apk" aria-label="Download the native Android App APK">
                  <i class="fab fa-android icon-apk" aria-hidden="true"></i>
                  <span>Download Android App</span>
                </a>
              </div>
              <div class="landing-login-prompt">
                <a href="#/login" class="btn-login-link" id="btn-login" aria-label="Log in to your existing vault">
                  <span>Already have a vault? <strong>Log In &rarr;</strong></span>
                </a>
              </div>
            </div>
            
            <!-- 3 Feature Cards matching Android FeatureCard in LandingScreen.kt -->
            <section class="landing-features" aria-labelledby="features-section-title">
              <h2 id="features-section-title" class="sr-only">Key Platform Features</h2>

              <article class="landing-feature-card">
                <div class="feature-icon-badge badge-shield">
                  <i class="fas fa-shield-alt" aria-hidden="true"></i>
                </div>
                <h3 class="feature-title">Private &amp; Self-Contained</h3>
                <p class="feature-desc">All uploads are isolated exclusively in your family's dedicated vault under Google's restricted <code>drive.file</code> scope. No external tracking or unauthorized access.</p>
              </article>
              
              <article class="landing-feature-card">
                <div class="feature-icon-badge badge-stub">
                  <i class="fas fa-ticket-alt" aria-hidden="true"></i>
                </div>
                <h3 class="feature-title">Simple Family Onboarding</h3>
                <p class="feature-desc">One-time perforated family code stubs make onboarding grandparents and parents seamless without complex passwords or setups.</p>
              </article>
              
              <article class="landing-feature-card">
                <div class="feature-icon-badge badge-search">
                  <i class="fas fa-search" aria-hidden="true"></i>
                </div>
                <h3 class="feature-title">Immediate Full-Text Discovery</h3>
                <p class="feature-desc">Locate vital records, certificates, and photos instantly across all family folders with zero-latency cached indexing and previews.</p>
              </article>
            </section>

            <!-- AEO / GEO Direct Answer Knowledge Section -->
            <section class="landing-knowledge-section" aria-labelledby="knowledge-section-title">
              <h2 id="knowledge-section-title" class="knowledge-section-title">
                Frequently Asked Questions &amp; Architecture Insights
              </h2>
              
              <div class="faq-list">
                <details class="faq-item">
                  <summary>
                    <span>How does FamDoc pool multiple Google Drive accounts?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <p class="faq-answer">
                    FamDoc connects to individual family members' Google accounts using OAuth 2.0. Credentials are encrypted via Fernet AES-128-CBC. The storage router balances uploads across accounts using a round-robin quota engine, effectively multiplying your free cloud storage without extra cost.
                  </p>
                </details>

                <details class="faq-item">
                  <summary>
                    <span>What happens if an upload fails due to network outage?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <p class="faq-answer">
                    FamDoc incorporates a dual-tier storage architecture. If Google Drive is unreachable or the network disconnects, the file seamlessly writes to an encrypted local server disk cache. When the connection restores, an asynchronous background worker safely promotes the file to cloud storage.
                  </p>
                </details>

                <details class="faq-item">
                  <summary>
                    <span>Can FamDoc read my personal Google Photos or existing Drive documents?</span>
                    <i class="fas fa-chevron-down faq-chevron" aria-hidden="true"></i>
                  </summary>
                  <p class="faq-answer">
                    <strong>No.</strong> FamDoc exclusively requests Google's restricted <code>drive.file</code> OAuth scope. This permission physically prevents the application from viewing, listing, or modifying any files, photos, or emails not explicitly uploaded through FamDoc.
                  </p>
                </details>
              </div>
            </section>

            <!-- Verified Author & Entity Section -->
            <section class="landing-author-badge" aria-label="Author and Engineering Attribution">
              <p class="landing-author-text">
                Architected &amp; Engineered by <strong>Akshaysinh Rajput</strong> (MCA)
              </p>
              <div class="landing-author-links">
                <a href="https://portfolioakshay.in" target="_blank" rel="noopener" class="author-chip-link">
                  <i class="fas fa-globe" aria-hidden="true"></i> <span>Portfolio</span>
                </a>
                <a href="https://github.com/ra901625072-boop/FamDoc" target="_blank" rel="noopener" class="author-chip-link">
                  <i class="fab fa-github" aria-hidden="true"></i> <span>GitHub Repository</span>
                </a>
                <a href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/" target="_blank" rel="noopener" class="author-chip-link">
                  <i class="fab fa-linkedin" aria-hidden="true"></i> <span>LinkedIn</span>
                </a>
              </div>
            </section>
          </main>

          <!-- Footer Navigation Links -->
          <footer role="contentinfo" class="landing-footer">
            <span>FamDoc — Shared Family Keepsake Vault</span>
            <div class="landing-footer-links">
              <a href="/privacy.html">Privacy Policy</a>
              <a href="/terms.html">Terms of Service</a>
              <a href="/apk/FamDoc.apk" download class="highlight"><i class="fab fa-android" aria-hidden="true"></i> Android APK (v1.0)</a>
            </div>
          </footer>
        </div>
      `;
    }

    // Sync theme controls
    if (window.FamDocTheme) {
      window.FamDocTheme.updateAllControls();
    }

    // Direct Login click checking
    const loginBtn = document.getElementById("btn-login");
    if (loginBtn) {
      // Clean previous listener to prevent duplicate calls
      const newLoginBtn = loginBtn.cloneNode(true);
      loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

      newLoginBtn.addEventListener("click", async (e) => {
        const token = localStorage.getItem("famdoc_token");
        if (token) {
          e.preventDefault();
          newLoginBtn.style.pointerEvents = "none";
          newLoginBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="margin-right: 0.25rem;"></i>
            <span>Verifying...</span>
          `;
          
          try {
            await FamDocAPI.auth.me();
            window.FamDocRouter.navigate('/dashboard');
          } catch (err) {
            window.FamDocApp.clearSession();
            window.FamDocRouter.navigate('/login');
          }
        }
      });
    }
  };
})();
