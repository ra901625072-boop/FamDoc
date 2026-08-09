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

        <!-- Storage Space Breakdown Card -->
        <div class="famdoc-card storage-breakdown-card fd-fade-up" id="storage-breakdown-panel" style="display: none; margin-bottom: 2rem;">
          <h3 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-chart-pie" style="color: var(--accent-brand);"></i>
            Storage Space Breakdown
          </h3>
          <div class="storage-usage-summary">
            <div class="storage-usage-values">
              Used <strong id="storage-used-text">0 B</strong> of <span id="storage-total-text">500 MB</span>
            </div>
            <div class="storage-usage-percent" id="storage-percent-text">0%</div>
          </div>
          <div class="storage-progress-bar-container" id="storage-progress-bar">
            <!-- Progress segments will be injected dynamically -->
          </div>
          <div class="storage-legend-grid" id="storage-legend">
            <!-- Legend items will be injected dynamically -->
          </div>
        </div>

        <!-- Storage Mode Selector Card -->
        <div class="famdoc-card fd-fade-up" id="storage-mode-selector-panel" style="margin-bottom: 2rem; padding: 1.5rem 2rem;">
          <h3 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-server" style="color: var(--accent-brand);"></i>
            Active Storage Mode Selection
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.5rem;">
            Choose how your family documents are stored. Connecting both Google Drive and MEGA enables robust dual-cloud synchronization modes.
          </p>
          
          <form id="storage-mode-form">
            <div class="storage-modes-list" style="display: flex; flex-direction: column; gap: 1rem;">
              
              <!-- Local Mode -->
              <label class="storage-mode-option" style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border: 1px solid var(--border-paper-dark); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);">
                <input type="radio" name="storage_provider" value="local" style="margin-top: 0.25rem;" checked>
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-ink);">Local Storage Only</strong>
                  <span style="font-size: 0.82rem; color: var(--text-ink-muted);">Keep all files on the local vault without uploading to external cloud drives.</span>
                </div>
              </label>

              <!-- Google Drive Only -->
              <label class="storage-mode-option" id="mode-opt-google" style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border: 1px solid var(--border-paper-dark); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);">
                <input type="radio" name="storage_provider" value="google" style="margin-top: 0.25rem;">
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-ink);"><i class="fab fa-google" style="color: #4285F4; margin-right: 0.25rem;"></i> Google Drive Only</strong>
                  <span style="font-size: 0.82rem; color: var(--text-ink-muted);">Store files on your linked Google Drive account. Requires Google Drive to be connected.</span>
                </div>
              </label>

              <!-- MEGA Only -->
              <label class="storage-mode-option" id="mode-opt-mega" style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border: 1px solid var(--border-paper-dark); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);">
                <input type="radio" name="storage_provider" value="mega" style="margin-top: 0.25rem;">
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-ink);"><i class="fas fa-cloud" style="color: #D32F2F; margin-right: 0.25rem;"></i> MEGA Only</strong>
                  <span style="font-size: 0.82rem; color: var(--text-ink-muted);">Store files on your linked MEGA cloud storage. Requires MEGA to be configured.</span>
                </div>
              </label>

              <!-- Dual Mode -->
              <label class="storage-mode-option" id="mode-opt-dual" style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border: 1px solid var(--border-paper-dark); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);">
                <input type="radio" name="storage_provider" value="dual" style="margin-top: 0.25rem;">
                <div style="width: 100%;">
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-ink);"><i class="fas fa-shield-alt" style="color: var(--success-sage); margin-right: 0.25rem;"></i> Dual Cloud Storage (Google Drive + MEGA)</strong>
                  <span style="font-size: 0.82rem; color: var(--text-ink-muted); display: block; margin-bottom: 0.75rem;">Enable multi-cloud storage modes for complete redundancy. Requires both Google Drive and MEGA to be connected.</span>
                  
                  <!-- Nested Dual Options -->
                  <div id="dual-options-container" style="display: none; padding-top: 0.75rem; border-top: 1px dashed var(--border-paper-dark); margin-top: 0.5rem; flex-direction: column; gap: 1rem;">
                    
                    <div>
                      <span style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--text-ink);">Select Dual Sync Option:</span>
                      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-left: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-ink); cursor: pointer;">
                          <input type="radio" name="storage_mode" value="mirror" checked>
                          Option 1: Mirror Sync (Upload every file to both clouds simultaneously)
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-ink); cursor: pointer;">
                          <input type="radio" name="storage_mode" value="failover">
                          Option 2: Active-Passive Failover (Upload to Primary, fallback to Backup if down)
                        </label>
                      </div>
                    </div>

                    <div id="primary-provider-selection" style="display: flex; align-items: center; gap: 1rem; margin-left: 0.5rem; margin-top: 0.25rem;">
                      <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-ink);">Primary Cloud Provider:</span>
                      <select id="primary-provider-dropdown" class="form-control" style="width: auto; padding: 0.25rem 0.5rem; height: auto; font-size: 0.82rem;">
                        <option value="google">Google Drive (MEGA as Backup)</option>
                        <option value="mega">MEGA (Google Drive as Backup)</option>
                      </select>
                    </div>

                  </div>
                </div>
              </label>

            </div>

            <button type="submit" id="btn-save-storage-mode" class="btn btn-primary" style="margin-top: 1.5rem; width: 100%; justify-content: center; gap: 0.5rem;">
              <i class="fas fa-save"></i> Apply Storage Mode Settings
            </button>
          </form>
        </div>

        <div class="storage-grid">
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
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label" for="google-client-secret">Google Client Secret</label>
                <div class="password-input-wrapper">
                  <input type="password" id="google-client-secret" class="form-control" placeholder="Enter Client Secret" required style="width: 100%; box-sizing: border-box;">
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
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
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
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
      const [config, stats] = await Promise.all([
        FamDocAPI.storage.getConfig(),
        FamDocAPI.dashboard.getStats().catch(err => {
          console.error("Failed to load storage breakdown stats", err);
          return null;
        })
      ]);

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
      
      // Populate inputs regardless of whether they are active
      if (config.client_id) {
        document.getElementById("google-client-id").value = config.client_id;
      }
      if (config.email) {
        document.getElementById("mega-email").value = config.email;
      }

      if (provider === "google") {
        activeDetailEl.textContent = `Google Drive connected. Client ID: ${config.client_id || "Not set"}`;
        googleCard.classList.add("active-card");
        googleBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
      } else if (provider === "mega") {
        activeDetailEl.textContent = `Email: ${config.email || "Not set"}`;
        megaCard.classList.add("active-card");
        megaBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
      } else if (provider === "dual") {
        const modeLabel = config.storage_mode === "mirror" ? "Mirror Sync" : `Failover Sync (Primary: ${config.primary_provider === "google" ? "Google Drive" : "MEGA"})`;
        activeDetailEl.textContent = `Dual Storage enabled. Mode: ${modeLabel}`;
        
        googleCard.classList.add("active-card");
        googleBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
        megaCard.classList.add("active-card");
        megaBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
      } else {
        activeDetailEl.textContent = "Currently using local database storage folder.";
      }

      // Configure Storage Mode Panel elements state based on provider status
      const googleConfigured = config.google_configured;
      const megaConfigured = config.mega_configured;

      const optGoogle = document.getElementById("mode-opt-google");
      const optMega = document.getElementById("mode-opt-mega");
      const optDual = document.getElementById("mode-opt-dual");

      if (optGoogle) {
        if (!googleConfigured) {
          optGoogle.style.opacity = "0.5";
          optGoogle.style.pointerEvents = "none";
          optGoogle.querySelector("input").disabled = true;
        } else {
          optGoogle.style.opacity = "1";
          optGoogle.style.pointerEvents = "auto";
          optGoogle.querySelector("input").disabled = false;
        }
      }

      if (optMega) {
        if (!megaConfigured) {
          optMega.style.opacity = "0.5";
          optMega.style.pointerEvents = "none";
          optMega.querySelector("input").disabled = true;
        } else {
          optMega.style.opacity = "1";
          optMega.style.pointerEvents = "auto";
          optMega.querySelector("input").disabled = false;
        }
      }

      if (optDual) {
        if (!googleConfigured || !megaConfigured) {
          optDual.style.opacity = "0.5";
          optDual.style.pointerEvents = "none";
          optDual.querySelector("input").disabled = true;
        } else {
          optDual.style.opacity = "1";
          optDual.style.pointerEvents = "auto";
          optDual.querySelector("input").disabled = false;
        }
      }

      // Set active values in the form
      const radioInput = document.querySelector(`input[name="storage_provider"][value="${provider}"]`);
      if (radioInput) {
        radioInput.checked = true;
        const container = document.getElementById("dual-options-container");
        if (container) {
          if (provider === "dual") {
            container.style.display = "flex";
          } else {
            container.style.display = "none";
          }
        }
      }

      const activeMode = config.storage_mode || "failover";
      const modeInput = document.querySelector(`input[name="storage_mode"][value="${activeMode}"]`);
      if (modeInput) {
        modeInput.checked = true;
      }

      const primaryProvider = config.primary_provider || "google";
      const primarySelect = document.getElementById("primary-provider-dropdown");
      if (primarySelect) {
        primarySelect.value = primaryProvider;
      }

      // Render visual breakdown if stats are available
      if (stats) {
        renderStorageBreakdown(stats);
      }
    } catch (err) {
      console.error("Failed to load storage config:", err);
    }
  }


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

    // Toggle Dual Options visibility
    const providerRadios = document.querySelectorAll('input[name="storage_provider"]');
    providerRadios.forEach(radio => {
      radio.addEventListener("change", (e) => {
        const container = document.getElementById("dual-options-container");
        if (container) {
          if (e.target.value === "dual") {
            container.style.display = "flex";
          } else {
            container.style.display = "none";
          }
        }
      });
    });

    // Handle Storage Mode Form Submit
    const modeForm = document.getElementById("storage-mode-form");
    if (modeForm) {
      modeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("btn-save-storage-mode");
        
        const checkedProvider = document.querySelector('input[name="storage_provider"]:checked');
        const checkedMode = document.querySelector('input[name="storage_mode"]:checked');
        const primarySelect = document.getElementById("primary-provider-dropdown");

        const selectedProvider = checkedProvider ? checkedProvider.value : "local";
        const selectedMode = checkedMode ? checkedMode.value : "failover";
        const primaryProvider = primarySelect ? primarySelect.value : "google";
        
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
          
          await FamDocAPI.storage.updateMode(selectedProvider, selectedMode, primaryProvider);
          FamDocAPI.utils.showToast("Storage mode updated successfully!", "success");
          await loadStorageConfig();
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to update storage mode.", "error");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-save"></i> Apply Storage Mode Settings';
        }
      });
    }
  }

  function renderStorageBreakdown(stats) {
    const panel = document.getElementById("storage-breakdown-panel");
    if (!panel) return;
    
    panel.style.display = "block";
    
    const usedBytes = stats.total_size_bytes || 0;
    const quotaBytes = stats.storage_quota_bytes || 524288000;
    
    document.getElementById("storage-used-text").textContent = FamDocAPI.utils.formatBytes(usedBytes);
    document.getElementById("storage-total-text").textContent = FamDocAPI.utils.formatBytes(quotaBytes);
    
    const percent = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
    document.getElementById("storage-percent-text").textContent = `${percent}%`;
    
    const progressBar = document.getElementById("storage-progress-bar");
    const legend = document.getElementById("storage-legend");
    if (!progressBar || !legend) return;
    
    progressBar.innerHTML = "";
    legend.innerHTML = "";
    
    const breakdown = stats.storage_breakdown || {};
    
    const categories = [
      { key: "image", name: "Images", colorClass: "storage-segment-image", legendColor: "var(--image-color)" },
      { key: "pdf", name: "PDFs", colorClass: "storage-segment-pdf", legendColor: "var(--pdf-color)" },
      { key: "document", name: "Word Docs", colorClass: "storage-segment-document", legendColor: "var(--doc-color)" },
      { key: "sheet", name: "Spreadsheets", colorClass: "storage-segment-sheet", legendColor: "var(--sheet-color)" },
      { key: "text", name: "Text Files", colorClass: "storage-segment-text", legendColor: "var(--text-color)" },
      { key: "other", name: "Other Files", colorClass: "storage-segment-other", legendColor: "var(--generic-color)" }
    ];
    
    let totalAssignedPercent = 0;
    
    categories.forEach(cat => {
      const data = breakdown[cat.key] || { size: 0, count: 0 };
      if (data.size > 0) {
        let segPercent = (data.size / quotaBytes) * 100;
        if (segPercent > 0 && segPercent < 1) segPercent = 1;
        totalAssignedPercent += segPercent;
        
        const segment = document.createElement("div");
        segment.className = `storage-progress-segment ${cat.colorClass}`;
        segment.style.width = `${segPercent}%`;
        segment.title = `${cat.name}: ${FamDocAPI.utils.formatBytes(data.size)} (${data.count} items)`;
        progressBar.appendChild(segment);
      }
      
      const legendItem = document.createElement("div");
      legendItem.className = "storage-legend-item fd-fade-in";
      legendItem.innerHTML = `
        <div class="storage-legend-color" style="background-color: ${cat.legendColor};"></div>
        <div class="storage-legend-info">
          <span class="storage-legend-name">${cat.name}</span>
          <span class="storage-legend-size">${FamDocAPI.utils.formatBytes(data.size)} (${data.count})</span>
        </div>
      `;
      legend.appendChild(legendItem);
    });
    
    const remainingBytes = Math.max(0, quotaBytes - usedBytes);
    if (remainingBytes > 0 && totalAssignedPercent < 100) {
      const remainingPercent = 100 - totalAssignedPercent;
      const segment = document.createElement("div");
      segment.className = "storage-progress-segment";
      segment.style.width = `${remainingPercent}%`;
      segment.style.backgroundColor = "transparent";
      segment.title = `Free Space: ${FamDocAPI.utils.formatBytes(remainingBytes)}`;
      progressBar.appendChild(segment);
    }
  }
})();
