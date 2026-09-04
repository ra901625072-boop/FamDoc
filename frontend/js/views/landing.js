/**
 * Landing Page View Manager
 * Matches Android App LandingScreen.kt
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  window.FamDocViews.landing = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    mount.innerHTML = `
      <div class="landing-wrapper fd-page-enter">
        <button class="theme-toggle-btn guest-theme-toggle" aria-label="Toggle theme">
          <i class="fas fa-moon"></i>
        </button>

        <!-- Bespoke Hero Crest & Brand Typography matching FamDocBrandLogo.kt -->
        <div class="landing-brand-hero">
          <div class="landing-crest-container">
            <img src="/img/logo.svg" alt="FamDoc Crest" class="landing-crest-img">
          </div>
          <div class="landing-brand-title">
            <span class="fam-text">Fam</span><span class="doc-text">Doc</span>
          </div>
          <div class="landing-brand-tagline">
            <span class="tagline-rule"></span>
            <span>Family Document Vault</span>
            <span class="tagline-rule"></span>
          </div>
        </div>
        
        <h1 class="landing-hero" id="main-heading">Gather your family's records in one timeless vault.</h1>
        
        <p class="landing-subtitle">
          Preserve your deeds, certificates, family heirlooms, and documents in a warm, private vault. Built to feel like a timeless keepsake box, not a cold cloud drive.
        </p>
        
        <div class="landing-actions">
          <a href="#/register" class="btn btn-primary" id="btn-register-vault">
            <i class="fas fa-plus-circle"></i>
            <span>Create a Family Vault</span>
          </a>
          <a href="#/join" class="btn btn-secondary" id="btn-join-family">
            <i class="fas fa-key"></i>
            <span>Join with Family Code</span>
          </a>
          <a href="/apk/FamDoc.apk" download class="btn btn-secondary" id="btn-download-apk" style="gap: 0.6rem;">
            <i class="fab fa-android" style="color: var(--color-primary); font-size: 1.15rem;"></i>
            <span>Download Android App</span>
          </a>
          <a href="#/login" class="btn-login-link" id="btn-login">
            <span>Already have a vault? Log In &rarr;</span>
          </a>
        </div>
        
        <!-- 3 Feature Cards matching Android FeatureCard in LandingScreen.kt -->
        <div class="landing-features">
          <div class="landing-feature-card">
            <div class="feature-icon-badge badge-shield">
              <i class="fas fa-shield-alt"></i>
            </div>
            <h3 class="feature-title">Private & Self-Contained</h3>
            <p class="feature-desc">All uploads are isolated exclusively in your family's dedicated vault. No external third-party access.</p>
          </div>
          
          <div class="landing-feature-card">
            <div class="feature-icon-badge badge-stub">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <h3 class="feature-title">Simple Family Onboarding</h3>
            <p class="feature-desc">One-time perforated family code stubs make onboarding grandparents and parents seamless.</p>
          </div>
          
          <div class="landing-feature-card">
            <div class="feature-icon-badge badge-search">
              <i class="fas fa-search"></i>
            </div>
            <h3 class="feature-title">Immediate Full-Text Discovery</h3>
            <p class="feature-desc">Locate vital records, certificates, and photos instantly across all family folders.</p>
          </div>
        </div>

        <div class="landing-footer" style="margin-top: 3.5rem; text-align: center; font-size: 0.82rem; color: var(--text-ink-muted); display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap;">
          <span>FamDoc — Family Document Vault</span>
          <span>•</span>
          <a href="/privacy.html" style="color: var(--text-ink-muted); text-decoration: underline;">Privacy Policy</a>
          <span>•</span>
          <a href="/apk/FamDoc.apk" download style="color: var(--color-primary); font-weight: 600; text-decoration: none;"><i class="fab fa-android"></i> Android APK (v1.0)</a>
        </div>
      </div>
    `;

    // Sync theme controls
    if (window.FamDocTheme) {
      window.FamDocTheme.updateAllControls();
    }

    // Direct Login click checking
    document.getElementById("btn-login").addEventListener("click", async (e) => {
      const token = localStorage.getItem("famdoc_token");
      if (token) {
        e.preventDefault();
        const loginBtn = document.getElementById("btn-login");
        
        loginBtn.style.pointerEvents = "none";
        loginBtn.innerHTML = `
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
  };
})();
