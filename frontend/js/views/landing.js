/**
 * Landing Page View Manager
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  window.FamDocViews.landing = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    mount.innerHTML = `
      <div class="landing-wrapper fd-page-enter">
        <button class="theme-toggle-btn guest-theme-toggle" aria-label="Toggle dark mode">
          <i class="fas fa-moon"></i>
        </button>
        <div class="landing-logo">
          <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
          <span class="brand-text">Fam<span class="highlight">Doc</span></span>
        </div>
        
        <h1 class="landing-hero" id="main-heading">The digital keepsake vault for your family's records.</h1>
        
        <p class="landing-subtitle">
          Gather your deeds, certificates, memories, and files in a safe, warm space. Made to feel like a keepsake box, not a corporate spreadsheet.
        </p>
        
        <div class="landing-actions">
          <a href="#/register" class="btn btn-primary" id="btn-register-vault">
            <i class="fas fa-plus"></i>
            <span>Create a Family Vault</span>
          </a>
          <a href="#/join" class="btn btn-secondary" id="btn-join-family">
            <i class="fas fa-key"></i>
            <span>Join with Family Code</span>
          </a>
          <a href="#/login" class="btn btn-text" id="btn-login" style="font-weight: 600;">
            <span>Log In</span>
            <i class="fas fa-arrow-right" style="font-size: 0.8rem; margin-left: 0.25rem;"></i>
          </a>
        </div>
        
        <div class="landing-features">
          <div class="feature-card">
            <div class="icon-chip lg" style="margin-bottom: 1.5rem;">
              <i class="fas fa-shield-alt"></i>
            </div>
            <h3 class="feature-title">Secure & Confidential</h3>
            <p class="feature-desc">All uploads are securely stored in your family's dedicated vault. No middleman storage access.</p>
          </div>
          
          <div class="feature-card">
            <div class="icon-chip lg" style="margin-bottom: 1.5rem;">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <h3 class="feature-title">Shared Keepsake Stub</h3>
            <p class="feature-desc">Invite members using a single physical-looking code. Admins manage rosters, families upload and search with ease.</p>
          </div>
          
          <div class="feature-card">
            <div class="icon-chip lg" style="margin-bottom: 1.5rem;">
              <i class="fas fa-search"></i>
            </div>
            <h3 class="feature-title">Intuitive File Discovery</h3>
            <p class="feature-desc">Filter by type, uploader, date, and keyword. Built-in interactive document and image previews right inside your browser.</p>
          </div>
        </div>
      </div>
    `;

    // Local theme toggle click delegator binds automatically, but let's sync icon state
    if (window.FamDocTheme) {
      window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
    }

    // Direct Login click checking
    document.getElementById("btn-login").addEventListener("click", async (e) => {
      const token = sessionStorage.getItem("famdoc_token");
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
