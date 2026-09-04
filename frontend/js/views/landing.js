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
            <h3 class="feature-title">Shared Keepsake Code</h3>
            <p class="feature-desc">Invite members using a single physical-looking code. Admins manage rosters, families upload and search effortlessly.</p>
          </div>
          
          <div class="landing-feature-card">
            <div class="feature-icon-badge badge-search">
              <i class="fas fa-search"></i>
            </div>
            <h3 class="feature-title">Instant Document Previews</h3>
            <p class="feature-desc">Filter by type, uploader, date, and keyword with built-in instant PDF, image, and text previews right in your browser.</p>
          </div>
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
