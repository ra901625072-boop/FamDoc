/**
 * Storage Config View Manager (Consolidates storage-config.html)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let currentUser = null;

  window.FamDocViews.storage = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Check for Google OAuth callback parameters on entry
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("google_auth")) {
      const authStatus = urlParams.get("google_auth");
      if (authStatus === "success") {
        FamDocAPI.utils.showToast("Google Drive connected successfully!", "success");
      } else if (authStatus === "error") {
        const detail = urlParams.get("detail") || "Unknown error";
        FamDocAPI.utils.showToast(`Failed to connect Google Drive: ${detail}`, "error");
      }
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    mount.innerHTML = `
      <div class="content-header fd-fade-in">
        <div>
          <h1 class="page-title">Cloud Storage Settings</h1>
          <p class="page-subtitle">Configure external storage providers to synchronize family files.</p>
        </div>
      </div>

      <div id="storage-layout-content" class="fd-fade-in">
        <!-- Storage Status Banner -->
        <div class="famdoc-card" style="margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding: 1.5rem 2rem;">
          <div>
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-ink-muted);">Current Active Storage:</span>
            <span id="storage-active-provider" class="badge badge-primary" style="font-size: 0.85rem; padding: 0.25rem 0.6rem; margin-left: 0.5rem; vertical-align: middle;">LOCAL</span>
          </div>
          <div id="storage-active-detail" style="font-size: 0.88rem; color: var(--text-ink-muted); font-weight: 500;">
            Currently using local database storage folder.
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;" class="storage-grid">
          <!-- Google Drive card -->
          <div class="famdoc-card storage-config-card" id="google-card">
            <div class="famdoc-card-header">
              <h2 class="famdoc-card-title"><i class="fab fa-google" style="color: #4285F4; margin-right: 0.5rem;"></i>Google Drive Link</h2>
              <div id="google-active-badge-container"></div>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.5rem;">
              Connect your family's personal Google Drive account. Files uploaded to FamDoc will automatically sync to a dedicated folder.
            </p>

            <form id="google-storage-form">
              <div class="form-group">
                <label class="form-label" for="google-client-id">Google Client ID</label>
                <div class="password-input-wrapper">
                  <input type="password" id="google-client-id" class="form-control" placeholder="Enter Client ID" required style="width: 100%; box-sizing: border-box;">
                  <button type="button" class="password-toggle-btn" onclick="window.togglePasswordVisibility('google-client-id')" aria-label="Toggle visibility">
                    <i class="far fa-eye"></i>
                  </button>
                </div>
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label" for="google-client-secret">Google Client Secret</label>
                <div class="password-input-wrapper">
                  <input type="password" id="google-client-secret" class="form-control" placeholder="Enter Client Secret" required style="width: 100%; box-sizing: border-box;">
                  <button type="button" class="password-toggle-btn" onclick="window.togglePasswordVisibility('google-client-secret')" aria-label="Toggle visibility">
                    <i class="far fa-eye"></i>
                  </button>
                </div>
              </div>
              <button type="submit" id="btn-save-google-storage" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; justify-content: center; gap: 0.5rem;">
                <i class="fab fa-google"></i> Link Google Drive Account
              </button>
            </form>
          </div>

          <!-- MEGA card -->
          <div class="famdoc-card storage-config-card" id="mega-card">
            <div class="famdoc-card-header">
              <h2 class="famdoc-card-title"><i class="fas fa-cloud" style="color: #D32F2F; margin-right: 0.5rem;"></i>MEGA Account Link</h2>
              <div id="mega-active-badge-container"></div>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.5rem;">
              Connect your family's MEGA.nz cloud storage account. Sync your family documents to a folder on MEGA.
            </p>

            <form id="mega-storage-form">
              <div class="form-group">
                <label class="form-label" for="mega-email">MEGA Email</label>
                <input type="email" id="mega-email" class="form-control" placeholder="email@mega.nz" required style="width: 100%; box-sizing: border-box;">
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label" for="mega-password">MEGA Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="mega-password" class="form-control" placeholder="••••••••" required style="width: 100%; box-sizing: border-box;">
                  <button type="button" class="password-toggle-btn" onclick="window.togglePasswordVisibility('mega-password')" aria-label="Toggle visibility">
                    <i class="far fa-eye"></i>
                  </button>
                </div>
              </div>
              <button type="submit" id="btn-save-mega-storage" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; justify-content: center; gap: 0.5rem;">
                <i class="fas fa-save"></i> Configure MEGA Cloud
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    setupEvents();
    loadProfileAndStorage();
  };

  async function loadProfileAndStorage() {
    currentUser = await window.FamDocApp.getUser();
    if (!currentUser) return;

    if (currentUser.role !== "admin") {
      document.getElementById("storage-layout-content").innerHTML = `
        <div class="famdoc-alert warning" style="margin-top: 2rem;">
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <strong>Access Denied:</strong> Only family administrators are permitted to configure cloud storage settings.
          </div>
        </div>
        <div style="margin-top: 1.5rem; text-align: center;">
          <a href="#/dashboard" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-arrow-left"></i> Back to Dashboard
          </a>
        </div>
      `;
      return;
    }

    await loadStorageConfig();
  }

  async function loadStorageConfig() {
    try {
      const config = await FamDocAPI.storage.getConfig();
      const activeProviderEl = document.getElementById("storage-active-provider");
      const activeDetailEl = document.getElementById("storage-active-detail");
      
      const googleCard = document.getElementById("google-card");
      const megaCard = document.getElementById("mega-card");
      const googleBadgeContainer = document.getElementById("google-active-badge-container");
      const megaBadgeContainer = document.getElementById("mega-active-badge-container");
      
      if (!activeProviderEl) return;

      googleCard.classList.remove("active-card");
      megaCard.classList.remove("active-card");
      googleBadgeContainer.innerHTML = "";
      megaBadgeContainer.innerHTML = "";
      
      const provider = config.storage_provider || "local";
      activeProviderEl.className = "badge badge-primary fd-fade-in";
      activeProviderEl.style.cssText = "font-size: 0.85rem; padding: 0.25rem 0.6rem; vertical-align: middle;";
      activeProviderEl.textContent = provider.toUpperCase();
      
      if (provider === "google") {
        activeDetailEl.textContent = `Google Drive connected. Client ID: ${config.client_id || "Not set"}`;
        document.getElementById("google-client-id").value = config.client_id || "";
        
        googleCard.classList.add("active-card");
        googleBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
      } else if (provider === "mega") {
        activeDetailEl.textContent = `Email: ${config.email || "Not set"}`;
        document.getElementById("mega-email").value = config.email || "";
        
        megaCard.classList.add("active-card");
        megaBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
      } else {
        activeDetailEl.textContent = "Currently using local database storage folder.";
      }
    } catch (err) {
      console.error("Failed to load storage config:", err);
    }
  }

  window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const btn = input.nextElementSibling;
    const icon = btn.querySelector("i");
    if (input.type === "password") {
      input.type = "text";
      icon.className = "far fa-eye-slash";
    } else {
      input.type = "password";
      icon.className = "far fa-eye";
    }
  };

  function setupEvents() {
    const googleForm = document.getElementById("google-storage-form");
    if (googleForm) {
      googleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const clientIdInput = document.getElementById("google-client-id");
        const clientSecretInput = document.getElementById("google-client-secret");
        const submitBtn = document.getElementById("btn-save-google-storage");
        
        const clientId = clientIdInput.value.trim();
        const clientSecret = clientSecretInput.value.trim();
        
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
          
          const result = await FamDocAPI.storage.getGoogleAuthUrl(clientId, clientSecret);
          if (result && result.url) {
            window.location.href = result.url;
          } else {
            throw new Error("Failed to get authorization URL");
          }
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to start Google OAuth process.", "error");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fab fa-google"></i> Link Google Drive Account';
        }
      });
    }

    const megaForm = document.getElementById("mega-storage-form");
    if (megaForm) {
      megaForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("mega-email");
        const passwordInput = document.getElementById("mega-password");
        const submitBtn = document.getElementById("btn-save-mega-storage");
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configuring...';
          
          await FamDocAPI.storage.configureMega(email, password);
          FamDocAPI.utils.showToast("MEGA storage configured successfully!", "success");
          passwordInput.value = "";
          await loadStorageConfig();
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to configure MEGA.", "error");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-save"></i> Configure MEGA Cloud';
        }
      });
    }
  }
})();
