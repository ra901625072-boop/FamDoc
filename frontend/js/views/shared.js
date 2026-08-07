/**
 * Standalone Shared File Public Download View Manager (Consolidates shared.html)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let linkToken = null;
  let isPasswordProtected = false;

  window.FamDocViews.shared = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Token extracted from router parameter mapping
    linkToken = params.token;

    mount.innerHTML = `
      <div class="guest-wrapper">
        <button class="theme-toggle-btn guest-theme-toggle" aria-label="Toggle dark mode">
          <i class="fas fa-moon"></i>
        </button>
        <div class="famdoc-card shared-layout fd-page-enter" style="width: 100%; max-width: 450px; padding: 2.5rem;">
          
          <!-- Logo header -->
          <div style="text-align: center; margin-bottom: 2rem; border-bottom: 1px solid var(--border-paper); padding-bottom: 1rem;">
            <div class="auth-logo" style="margin-bottom: 0; display: inline-flex; align-items: center; justify-content: center;">
              <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img" style="width: 2rem; margin-right: 0.5rem;">
              <span class="brand-text">Fam<span class="highlight">Doc</span></span>
            </div>
            <p style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-ink-muted); margin-top: 0.25rem;">Family Keepsake Vault</p>
          </div>

          <!-- Loading State -->
          <div id="shared-loading" style="padding: 1rem 0;">
            <div class="shared-file-info skel-row">
              <div class="fd-skel fd-skel-circle" style="width: 2.5rem; height: 2.5rem; flex-shrink: 0;"></div>
              <div class="shared-file-details" style="flex: 1; display: flex; flex-direction: column; gap: 0.35rem;">
                <div class="fd-skel fd-skel-text lg"></div>
                <div class="fd-skel fd-skel-text md"></div>
              </div>
            </div>
            <div class="fd-skel skel-block-large" style="height: 48px; margin-top: 1rem;"></div>
          </div>

          <!-- Error State -->
          <div id="shared-error" style="display: none; text-align: center; padding: 2rem 0;">
            <i class="fas fa-exclamation-triangle state-icon error"></i>
            <h3 class="famdoc-card-title" style="margin-bottom: 0.5rem;">Shared Link Invalid</h3>
            <p id="error-desc" style="color: var(--text-ink-muted); margin-bottom: 1.5rem;">This link has expired or reached its maximum download limit.</p>
            <a href="#/" class="btn btn-secondary">Go to FamDoc Homepage</a>
          </div>

          <!-- Active Content State -->
          <div id="shared-content" style="display: none;">
            <div class="shared-file-info" style="display: flex; gap: 1rem; align-items: center; background-color: var(--surface-paper-tint); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-paper); margin-bottom: 1.5rem;">
              <i id="file-icon" class="shared-file-icon file-generic fas fa-file" style="font-size: 2.5rem;"></i>
              <div class="shared-file-details" style="display: flex; flex-direction: column; min-width: 0;">
                <div id="file-name" class="shared-file-name" style="font-weight: 700; word-break: break-all; color: var(--text-ink);">filename.txt</div>
                <div id="file-size" class="shared-file-size" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-ink-muted); margin-top: 0.15rem;">0 Bytes</div>
              </div>
            </div>

            <div id="expiry-notice" style="font-size: 0.8rem; color: var(--text-ink-muted); text-align: center; margin-bottom: 1.5rem; display: none;">
              <i class="far fa-clock" style="margin-right: 0.25rem;"></i> Link expires on: <span id="expiry-date">Jan 1, 2026</span>
            </div>

            <!-- Password verification passcode (if protected) -->
            <div id="password-section" style="display: none; background-color: var(--warning-red-light); border: 1px solid var(--warning-red-border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
              <h4 style="font-family: var(--font-serif); color: var(--warning-red-dark); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                <i class="fas fa-lock"></i> Password Protected
              </h4>
              <p style="font-size: 0.85rem; color: var(--warning-red-dark); margin-bottom: 1rem;">This download link requires a verification password.</p>
              
              <div class="form-group" style="margin-bottom: 0;">
                <div class="password-input-wrapper">
                  <input type="password" id="share-passcode" class="form-control" placeholder="Enter password to unlock" style="border-color: var(--warning-red-border); width: 100%; box-sizing: border-box;">
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Download button -->
            <button id="btn-download" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1rem;">
              <i class="fas fa-download"></i>
              <span>Download Shared File</span>
            </button>
          </div>

        </div>
      </div>
    `;

    if (window.FamDocTheme) {
      window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
    }

    if (!linkToken) {
      showError("Invalid link token. Please check the URL.");
      return;
    }

    loadSharedFileInfo();
  };

  async function loadSharedFileInfo() {
    const loading = document.getElementById("shared-loading");
    const content = document.getElementById("shared-content");
    if (!loading || !content) return;
    
    try {
      const info = await FamDocAPI.sharing.getPublicInfo(linkToken);
      
      loading.style.display = "none";
      content.classList.add("fd-fade-in");
      content.style.display = "block";

      document.getElementById("file-name").textContent = info.filename;
      document.getElementById("file-size").textContent = FamDocAPI.utils.formatBytes(info.size_bytes);
      
      const iconClass = FamDocAPI.utils.getFileIconClass(info.file_type, info.filename);
      document.getElementById("file-icon").className = `shared-file-icon ${iconClass}`;

      if (info.expires_at) {
        const formatted = FamDocAPI.utils.formatDate(info.expires_at);
        document.getElementById("expiry-date").textContent = formatted;
        document.getElementById("expiry-notice").style.display = "block";
      }

      isPasswordProtected = info.is_password_protected;
      if (isPasswordProtected) {
        document.getElementById("password-section").style.display = "block";
      }

      document.getElementById("btn-download").addEventListener("click", triggerDownload);

    } catch (err) {
      showError(err.message || "Shared link not found or expired.");
    }
  }

  async function triggerDownload() {
    const downloadBtn = document.getElementById("btn-download");
    const passwordInput = document.getElementById("share-passcode");
    if (!downloadBtn) return;
    
    const originalText = downloadBtn.querySelector("span").textContent;
    let password = null;

    if (isPasswordProtected && passwordInput) {
      password = passwordInput.value.trim();
      if (!password) {
        FamDocAPI.utils.showToast("Password is required to unlock this file.", "error");
        passwordInput.focus();
        return;
      }
    }

    try {
      downloadBtn.disabled = true;
      downloadBtn.querySelector("span").textContent = "Downloading File...";

      await FamDocAPI.sharing.downloadPublic(linkToken, password);
      FamDocAPI.utils.showToast("File downloaded successfully!", "success");
    } catch (err) {
      FamDocAPI.utils.showToast(err.message || "Failed to download. Check the password.", "error");
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.querySelector("span").textContent = originalText;
    }
  }

  function showError(msg) {
    const loading = document.getElementById("shared-loading");
    const content = document.getElementById("shared-content");
    const errorDiv = document.getElementById("shared-error");
    const errorDesc = document.getElementById("error-desc");

    if (loading) loading.style.display = "none";
    if (content) content.style.display = "none";
    
    if (errorDiv && errorDesc) {
      errorDesc.textContent = msg;
      errorDiv.classList.add("fd-fade-in");
      errorDiv.style.display = "block";
    }
  }
})();
