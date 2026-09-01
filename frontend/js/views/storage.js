/**
 * Storage Config View Manager (Modern Minimalist Multi-Account Storage Pooling)
 * Designed for effortless 1-click setup, member self-service, and clear visual capacity.
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let currentUser = null;
  let familyMembersList = [];
  let currentStorageConfig = null;

  window.FamDocViews.storage = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Check for Google OAuth callback parameters on entry
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("google_auth")) {
      const authStatus = urlParams.get("google_auth");
      if (authStatus === "success") {
        FamDocAPI.utils.showToast("Google Drive account linked to family vault successfully!", "success");
      } else if (authStatus === "error") {
        const detail = urlParams.get("detail") || "Unknown error";
        FamDocAPI.utils.showToast(`Failed to connect Google Drive: ${detail}`, "error");
      }
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

    mount.innerHTML = `
      <div class="storage-header-container fd-fade-in">
        <div>
          <h1 class="page-title">Cloud Storage & Quotas</h1>
          <p class="page-subtitle">Multi-account Google Drive pooling, family storage quotas, and live capacity.</p>
        </div>
        <div class="storage-header-actions" id="storage-header-actions-slot">
          <!-- Populated based on user role -->
        </div>
      </div>

      <!-- Collapsible OAuth Credentials & Setup Drawer (Admin Only) -->
      <div id="oauth-config-drawer" class="oauth-config-drawer fd-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 style="font-family: var(--font-serif); font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fab fa-google" style="color: #4285F4;"></i> Google OAuth Setup & Credentials
          </h3>
          <button type="button" id="btn-close-oauth-drawer" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <p style="font-size: 0.84rem; color: var(--text-ink-muted); margin-bottom: 1.25rem;">
          Configure Google Cloud OAuth credentials once so all family members can link their Google Drive accounts with 1 click.
        </p>

        <!-- 1. Authorized Redirect URI Copy Box -->
        <div style="margin-bottom: 1.25rem; background: var(--surface-paper-tint); border: 1px solid var(--border-paper-dark); border-radius: var(--radius-md); padding: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-ink); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fas fa-link" style="color: #3b82f6;"></i> Authorized Redirect URI for Google Cloud Console:</span>
            <span style="font-size: 0.75rem; color: var(--text-ink-muted);">Add this in OAuth Client Credentials</span>
          </div>
          <div class="uri-copy-container">
            <span id="txt-redirect-uri" style="flex: 1; user-select: all;">...</span>
            <button type="button" id="btn-copy-redirect-uri" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fas fa-copy"></i> Copy URI
            </button>
          </div>
        </div>

        <!-- 2. Drag & Drop credentials.json zone -->
        <div class="credentials-dropzone" id="credentials-dropzone">
          <input type="file" id="file-credentials-input" accept=".json" style="display: none;">
          <div class="credentials-dropzone-icon"><i class="fas fa-file-import"></i></div>
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-ink);">
            Drag & drop your <code>credentials.json</code> file here
          </div>
          <p style="font-size: 0.78rem; color: var(--text-ink-muted); margin: 0.25rem 0 0 0;">
            Or click to browse and auto-fill Client ID & Secret from Google Cloud Console download.
          </p>
        </div>

        <!-- 3. Form fields -->
        <form id="google-credentials-form">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="google-client-id">Google Client ID</label>
              <div class="password-input-wrapper">
                <input type="password" id="google-client-id" class="form-control" placeholder="e.g. 12345-abc.apps.googleusercontent.com" required style="width: 100%; box-sizing: border-box;">
                <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="google-client-secret">Google Client Secret</label>
              <div class="password-input-wrapper">
                <input type="password" id="google-client-secret" class="form-control" placeholder="e.g. GOCSPX-xxxxxxxxxxxxxx" required style="width: 100%; box-sizing: border-box;">
                <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: var(--accent-brand); text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fas fa-external-link-alt"></i> Open Google Cloud Console
            </a>
            <button type="submit" id="btn-save-credentials-action" class="btn btn-primary btn-sm">
              <i class="fas fa-save"></i> Save & Connect Account
            </button>
          </div>
        </form>
      </div>

      <div id="storage-layout-content" class="fd-fade-in">
        <div class="empty-state" style="padding: 3rem 0;">
          <i class="fas fa-spinner fa-spin state-icon loading"></i>
          <p class="empty-state-text">Loading cloud storage details...</p>
        </div>
      </div>

      <!-- Invite Family Drives Modal Container -->
      <div id="storage-invite-modal-container" style="display: none;"></div>
    `;

    setupEvents();
    loadProfileAndStorage();

    // Register synchronization callback
    if (window.FamDocDataSync) {
      window.FamDocDataSync.register("storage", loadStorageConfig);
    }
  };

  async function loadProfileAndStorage() {
    currentUser = await window.FamDocApp.getUser();
    if (!currentUser) return;

    // Set Redirect URI text
    const redirectUri = `${window.location.origin}/api/storage/oauth2callback`;
    const uriEl = document.getElementById("txt-redirect-uri");
    if (uriEl) uriEl.textContent = redirectUri;

    // Setup Header Actions
    const actionsSlot = document.getElementById("storage-header-actions-slot");
    if (actionsSlot) {
      if (currentUser.role === "admin") {
        actionsSlot.innerHTML = `
          <button id="btn-invite-family-storage" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.45rem;">
            <i class="fas fa-user-plus" style="color: var(--accent-brand);"></i> Invite Family Drives
          </button>
          <button id="btn-toggle-oauth-config" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.45rem;">
            <i class="fas fa-cog" style="color: #f59e0b;"></i> API Credentials
          </button>
        `;
        document.getElementById("btn-invite-family-storage")?.addEventListener("click", openInviteModal);
        document.getElementById("btn-toggle-oauth-config")?.addEventListener("click", () => {
          document.getElementById("oauth-config-drawer")?.classList.toggle("open");
        });
      } else {
        actionsSlot.innerHTML = `
          <button id="btn-member-connect-drive-header" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.45rem;">
            <i class="fab fa-google"></i> Connect My Drive (+15 GB)
          </button>
        `;
        document.getElementById("btn-member-connect-drive-header")?.addEventListener("click", () => {
          handleInitiateConnect();
        });
      }
    }

    await loadStorageConfig();
  }

  async function loadStorageConfig() {
    try {
      const [config, stats, members] = await Promise.all([
        FamDocAPI.storage.getConfig(),
        FamDocAPI.dashboard.getStats().catch(err => null),
        FamDocAPI.family.getMembers().catch(err => [])
      ]);

      currentStorageConfig = config;
      familyMembersList = members || [];

      // Auto-fill Client ID in credentials drawer if exists
      if (config.client_id) {
        const gInput = document.getElementById("google-client-id");
        if (gInput && !gInput.value) gInput.value = config.client_id;
      }

      const layoutMount = document.getElementById("storage-layout-content");
      if (!layoutMount) return;

      if (currentUser.role === "admin") {
        renderAdminDashboard(layoutMount, config, stats, familyMembersList);
      } else {
        renderMemberSelfServiceView(layoutMount, config, stats, familyMembersList);
      }

    } catch (err) {
      console.error("Failed to load storage config:", err);
      FamDocAPI.utils.showToast("Failed to load storage configuration.", "error");
    }
  }

  function renderAdminDashboard(container, config, stats, members) {
    container.innerHTML = `
      <!-- 1. HERO STORAGE POOL SUMMARY CARD -->
      <div class="storage-hero-card fd-fade-up">
        <div class="storage-hero-header">
          <div class="storage-hero-title-group">
            <span id="hero-status-pill" class="badge badge-primary" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;">
              <i class="fas fa-spinner fa-spin"></i> Loading...
            </span>
            <h2 class="storage-hero-title">Family Storage Capacity</h2>
          </div>
          <div class="storage-hero-metrics">
            <div class="hero-metric-item">
              <span class="hero-metric-label">Total Pool</span>
              <span class="hero-metric-value" id="hero-total-cap">0 B</span>
            </div>
            <div class="hero-metric-item">
              <span class="hero-metric-label">Used Space</span>
              <span class="hero-metric-value accent" id="hero-used-space">0 B</span>
            </div>
            <div class="hero-metric-item">
              <span class="hero-metric-label">Free Space</span>
              <span class="hero-metric-value" id="hero-free-space">0 B</span>
            </div>
          </div>
        </div>

        <!-- Progress Bar & Breakdown -->
        <div class="hero-progress-wrapper">
          <div class="hero-progress-bar-container" id="hero-progress-bar">
            <!-- Dynamically rendered -->
          </div>
          <div class="hero-legend-row" id="hero-legend-row">
            <!-- Dynamically rendered -->
          </div>
        </div>

        <!-- Hero Footer: Mode Switcher -->
        <div class="storage-hero-footer">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-ink-muted);">Active Storage Mode:</span>
            <div class="mode-segmented-control">
              <button type="button" class="mode-segment-btn" data-mode="google" id="mode-btn-google">
                <i class="fab fa-google" style="color: #4285F4;"></i> Google Drive Pool
              </button>
              <button type="button" class="mode-segment-btn" data-mode="local" id="mode-btn-local">
                <i class="fas fa-hdd"></i> Local Storage
              </button>
            </div>
          </div>
          <div id="hero-mode-note" style="font-size: 0.8rem; color: var(--text-ink-muted); font-style: italic;">
            Uploads route automatically to the drive with most free space.
          </div>
        </div>
      </div>

      <!-- 2. TWO-COLUMN DASHBOARD GRID -->
      <div class="storage-dashboard-grid">
        
        <!-- LEFT COLUMN: Connected Google Drives -->
        <div class="storage-panel-card fd-fade-up">
          <div class="storage-panel-header">
            <div>
              <h3 class="storage-panel-title">
                <i class="fab fa-google" style="color: #4285F4;"></i>
                Connected Google Drives
              </h3>
              <span id="drives-count-badge" style="font-size: 0.76rem; color: var(--text-ink-muted); font-weight: 500;">
                0 Active Drives
              </span>
            </div>
            <button id="btn-quick-connect-drive" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              <i class="fas fa-plus"></i> Connect Drive (+15 GB)
            </button>
          </div>

          <!-- Drives List Container -->
          <div id="accounts-cards-container" class="account-cards-list">
            <!-- Dynamically rendered -->
          </div>
        </div>

        <!-- RIGHT COLUMN: Family Storage Contributors Roster -->
        <div class="storage-panel-card fd-fade-up">
          <div class="storage-panel-header">
            <div>
              <h3 class="storage-panel-title">
                <i class="fas fa-users" style="color: var(--accent-brand);"></i>
                Family Contributors
              </h3>
              <span id="contributors-count-badge" style="font-size: 0.76rem; color: var(--text-ink-muted); font-weight: 500;">
                0 of 0 Contributing
              </span>
            </div>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-ink-muted); margin-bottom: 1rem;">
            Every family member who links their free personal Google Drive adds 15 GB to your shared family vault.
          </p>

          <!-- Contributors List -->
          <div id="contributors-roster-container" class="contributors-roster-list">
            <!-- Dynamically rendered -->
          </div>
        </div>

      </div>
    `;

    renderHeroSummary(config, stats);
    renderAccountCards(config.accounts || [], config.client_id, members);
    renderContributorsRoster(members, config.accounts || []);
    setupAdminInteractions();
  }

  function renderMemberSelfServiceView(container, config, stats, members) {
    const totalBytes = config.total_capacity_bytes || 524288000;
    const usedBytes = stats ? (stats.total_size_bytes || 0) : (config.total_used_bytes || 0);
    const freeBytes = Math.max(0, totalBytes - usedBytes);
    const percentUsed = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

    // Find this member's linked accounts
    const userAccounts = (config.accounts || []).filter(a => 
      (a.user_id === currentUser.id) || (a.email && currentUser.email && a.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    const isConnected = userAccounts.length > 0 && userAccounts.some(a => a.status === "active");

    let memberHeroHtml = "";
    if (isConnected) {
      const myAcct = userAccounts[0];
      const myQuota = myAcct.cached_quota_total || (15 * 1024 * 1024 * 1024);
      const myUsed = myAcct.cached_quota_used || 0;
      memberHeroHtml = `
        <div class="member-self-storage-card fd-fade-up">
          <div class="member-storage-hero-flex">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                <span class="status-badge-active"><i class="fas fa-check-circle"></i> Connected</span>
                <span style="font-weight: 700; font-size: 1.05rem; color: var(--text-ink);">${FamDocAPI.utils.escapeHtml(myAcct.label || "Your Google Drive")}</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin: 0 0 0.5rem 0;">
                Google Account: <strong>${FamDocAPI.utils.escapeHtml(myAcct.email || "—")}</strong> • Contributing <strong>${FamDocAPI.utils.formatBytes(myQuota)}</strong> to the family vault.
              </p>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm btn-member-disconnect" data-id="${myAcct.id}" data-email="${FamDocAPI.utils.escapeHtml(myAcct.email || '')}">
                <i class="fas fa-unlink"></i> Disconnect My Drive
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      memberHeroHtml = `
        <div class="member-self-storage-card fd-fade-up" style="background: linear-gradient(135deg, rgba(66, 133, 244, 0.05), rgba(99, 102, 241, 0.08));">
          <div class="member-storage-hero-flex">
            <div>
              <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-ink); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fab fa-google" style="color: #4285F4;"></i> Boost Family Vault Storage (+15 GB)
              </div>
              <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin: 0; max-width: 580px;">
                Link your free personal Google Drive account to add +15 GB of cloud capacity to your family's shared vault.
              </p>
            </div>
            <div>
              <button id="btn-member-connect-action" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1.25rem;">
                <i class="fab fa-google"></i> Connect My Google Drive
              </button>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Member Contribution Card -->
      ${memberHeroHtml}

      <!-- Family Shared Capacity Card -->
      <div class="storage-hero-card fd-fade-up">
        <div class="storage-hero-header">
          <div class="storage-hero-title-group">
            <span class="badge badge-success" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;">
              <i class="fas fa-cloud"></i> Shared Family Pool
            </span>
            <h2 class="storage-hero-title">Family Vault Storage</h2>
          </div>
          <div class="storage-hero-metrics">
            <div class="hero-metric-item">
              <span class="hero-metric-label">Total Pool</span>
              <span class="hero-metric-value">${FamDocAPI.utils.formatBytes(totalBytes)}</span>
            </div>
            <div class="hero-metric-item">
              <span class="hero-metric-label">Used Space</span>
              <span class="hero-metric-value accent">${FamDocAPI.utils.formatBytes(usedBytes)} (${percentUsed}%)</span>
            </div>
            <div class="hero-metric-item">
              <span class="hero-metric-label">Free Space</span>
              <span class="hero-metric-value">${FamDocAPI.utils.formatBytes(freeBytes)}</span>
            </div>
          </div>
        </div>

        <div class="hero-progress-wrapper">
          <div class="hero-progress-bar-container" id="hero-progress-bar"></div>
          <div class="hero-legend-row" id="hero-legend-row"></div>
        </div>
      </div>

      <!-- Family Contributors Roster -->
      <div class="storage-panel-card fd-fade-up">
        <div class="storage-panel-header">
          <div>
            <h3 class="storage-panel-title"><i class="fas fa-users" style="color: var(--accent-brand);"></i> Family Contributors</h3>
            <span style="font-size: 0.76rem; color: var(--text-ink-muted); font-weight: 500;">
              Pooled drives from all family members
            </span>
          </div>
        </div>
        <div id="contributors-roster-container" class="contributors-roster-list"></div>
      </div>
    `;

    renderHeroProgressBar(stats, totalBytes, usedBytes);
    renderContributorsRoster(members, config.accounts || []);

    document.getElementById("btn-member-connect-action")?.addEventListener("click", () => {
      handleInitiateConnect();
    });

    container.querySelectorAll(".btn-member-disconnect").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirmed = await FamDocAPI.utils.confirm({
          title: "Disconnect Storage Drive",
          message: "Are you sure you want to disconnect your Google Drive? Your uploaded files will be safely migrated to remaining family drives.",
          confirmText: "Disconnect Drive",
          type: "danger"
        });
        if (confirmed) {
          try {
            await FamDocAPI.storage.disconnectAccount(id);
            FamDocAPI.utils.showToast("Drive disconnect started. Migration in progress.", "info");
            await loadStorageConfig();
          } catch (err) {
            FamDocAPI.utils.showToast(err.message || "Failed to disconnect drive", "error");
          }
        }
      });
    });
  }

  function renderHeroSummary(config, stats) {
    const statusPill = document.getElementById("hero-status-pill");
    const totalCapEl = document.getElementById("hero-total-cap");
    const usedSpaceEl = document.getElementById("hero-used-space");
    const freeSpaceEl = document.getElementById("hero-free-space");
    const modeNote = document.getElementById("hero-mode-note");
    
    const btnGoogle = document.getElementById("mode-btn-google");
    const btnLocal = document.getElementById("mode-btn-local");

    if (!statusPill) return;

    const provider = config.storage_provider || "local";
    const totalBytes = config.total_capacity_bytes || 524288000;
    const usedBytes = stats ? (stats.total_size_bytes || 0) : (config.total_used_bytes || 0);
    const freeBytes = Math.max(0, totalBytes - usedBytes);
    const percentUsed = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

    // Update Metrics
    totalCapEl.textContent = FamDocAPI.utils.formatBytes(totalBytes);
    usedSpaceEl.textContent = `${FamDocAPI.utils.formatBytes(usedBytes)} (${percentUsed}%)`;
    freeSpaceEl.textContent = FamDocAPI.utils.formatBytes(freeBytes);

    // Update Mode Buttons & Status Pill
    const activeAccounts = (config.accounts || []).filter(a => a.status === "active");

    if (provider === "google") {
      statusPill.className = "badge badge-success";
      statusPill.innerHTML = `<i class="fab fa-google"></i> Google Cloud Active (${activeAccounts.length} Drive${activeAccounts.length === 1 ? '' : 's'})`;
      
      if (btnGoogle) btnGoogle.classList.add("active");
      if (btnLocal) btnLocal.classList.remove("active");
      if (modeNote) modeNote.textContent = `Uploads route automatically to the drive with most free space.`;
    } else {
      statusPill.className = "badge badge-secondary";
      statusPill.innerHTML = `<i class="fas fa-hdd"></i> Local Storage Mode`;
      
      if (btnGoogle) btnGoogle.classList.remove("active");
      if (btnLocal) btnLocal.classList.add("active");
      if (modeNote) modeNote.textContent = `Files are saved securely to your local family database storage folder.`;
    }

    if (btnGoogle) {
      if (!config.google_configured && activeAccounts.length === 0) {
        btnGoogle.disabled = true;
        btnGoogle.title = "Connect a Google Drive account first to enable cloud mode";
      } else {
        btnGoogle.disabled = false;
        btnGoogle.title = "";
      }
    }

    renderHeroProgressBar(stats, totalBytes, usedBytes);
  }

  function renderHeroProgressBar(stats, totalBytes, usedBytes) {
    const progressBar = document.getElementById("hero-progress-bar");
    const legendRow = document.getElementById("hero-legend-row");
    if (!progressBar || !legendRow) return;

    progressBar.innerHTML = "";
    legendRow.innerHTML = "";

    const breakdown = stats ? (stats.storage_breakdown || {}) : {};

    const categories = [
      { key: "image", name: "Images", colorClass: "storage-segment-image", hex: "#3b82f6" },
      { key: "pdf", name: "PDFs", colorClass: "storage-segment-pdf", hex: "#ef4444" },
      { key: "document", name: "Docs", colorClass: "storage-segment-document", hex: "#8b5cf6" },
      { key: "sheet", name: "Sheets", colorClass: "storage-segment-sheet", hex: "#10b981" },
      { key: "text", name: "Text", colorClass: "storage-segment-text", hex: "#f59e0b" },
      { key: "other", name: "Other", colorClass: "storage-segment-other", hex: "#6b7280" }
    ];

    let totalAssignedPercent = 0;

    categories.forEach(cat => {
      const data = breakdown[cat.key] || { size: 0, count: 0 };
      if (data.size > 0) {
        let segPercent = (data.size / totalBytes) * 100;
        if (segPercent > 0 && segPercent < 1) segPercent = 1;
        totalAssignedPercent += segPercent;

        const segment = document.createElement("div");
        segment.className = `storage-progress-segment ${cat.colorClass}`;
        segment.style.width = `${segPercent}%`;
        segment.title = `${cat.name}: ${FamDocAPI.utils.formatBytes(data.size)} (${data.count} files)`;
        progressBar.appendChild(segment);

        const legendItem = document.createElement("div");
        legendItem.className = "hero-legend-item fd-fade-in";
        legendItem.innerHTML = `
          <div class="hero-legend-dot" style="background-color: ${cat.hex};"></div>
          <span>${cat.name}: <strong>${FamDocAPI.utils.formatBytes(data.size)}</strong></span>
        `;
        legendRow.appendChild(legendItem);
      }
    });

    const remainingBytes = Math.max(0, totalBytes - usedBytes);
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

  function renderAccountCards(accounts, existingClientId, members) {
    const container = document.getElementById("accounts-cards-container");
    const countBadge = document.getElementById("drives-count-badge");
    if (!container) return;

    const activeAccounts = accounts.filter(a => a.status === "active");
    if (countBadge) {
      countBadge.textContent = `${activeAccounts.length} Active Drive${activeAccounts.length === 1 ? '' : 's'}`;
    }

    if (accounts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.25rem 1.5rem; background-color: var(--surface-paper-tint); border: 1px dashed var(--border-paper-dark); border-radius: var(--radius-md);">
          <div style="width: 48px; height: 48px; border-radius: 50%; background-color: rgba(66, 133, 244, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem;">
            <i class="fab fa-google" style="color: #4285F4; font-size: 1.4rem;"></i>
          </div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-ink);">No Google Drives Connected</div>
          <p style="font-size: 0.82rem; color: var(--text-ink-muted); margin: 0.35rem auto 1.25rem auto; max-width: 380px;">
            Link any Google Drive account to expand your shared family vault with pooled cloud storage.
          </p>
          <button class="btn btn-primary btn-sm btn-action-trigger-connect" style="display: inline-flex; align-items: center; gap: 0.45rem;">
            <i class="fab fa-google"></i> Connect First Drive (+15 GB)
          </button>
        </div>
      `;

      container.querySelector(".btn-action-trigger-connect")?.addEventListener("click", () => {
        handleInitiateConnect();
      });
      return;
    }

    container.innerHTML = accounts.map(acct => {
      let statusBadge = `<span class="status-badge-active"><i class="fas fa-check-circle"></i> Active</span>`;
      let alertBanner = "";

      if (acct.status === "error") {
        statusBadge = `<span class="status-badge-error"><i class="fas fa-exclamation-circle"></i> Re-auth Required</span>`;
        alertBanner = `
          <div class="famdoc-alert warning" style="margin-top: 0.6rem; padding: 0.4rem 0.75rem; font-size: 0.78rem;">
            <i class="fas fa-exclamation-triangle"></i>
            <div>OAuth token revoked or expired. Click Re-authenticate to reconnect.</div>
          </div>
        `;
      } else if (acct.status === "disconnecting") {
        statusBadge = `<span class="status-badge-disconnecting"><i class="fas fa-spinner fa-spin"></i> Disconnecting...</span>`;
        alertBanner = `
          <div class="famdoc-alert warning" style="margin-top: 0.6rem; padding: 0.4rem 0.75rem; font-size: 0.78rem;">
            <i class="fas fa-sync fa-spin"></i>
            <div>Files on this account are being safely migrated in the background.</div>
          </div>
        `;
      } else if (acct.status === "disconnected") {
        statusBadge = `<span class="badge badge-secondary">Disconnected</span>`;
      }

      let quotaText = "Quota pending refresh";
      let percentUsed = 0;
      if (acct.cached_quota_total) {
        const used = acct.cached_quota_used || 0;
        const total = acct.cached_quota_total;
        percentUsed = Math.min(100, Math.round((used / total) * 100));
        quotaText = `Used ${FamDocAPI.utils.formatBytes(used)} of ${FamDocAPI.utils.formatBytes(total)} (${percentUsed}%)`;
      } else if (acct.cached_quota_total === null || acct.cached_quota_total === 0) {
        quotaText = `Workspace Account (Unlimited Capacity)`;
      }

      // Determine Assigned Member
      let assignedMember = null;
      if (acct.user_id) {
        assignedMember = (members || []).find(m => m.user_id === acct.user_id);
      } else if (acct.member_username) {
        assignedMember = { username: acct.member_username, role: acct.member_role || 'member' };
      } else if (acct.email) {
        assignedMember = (members || []).find(m => m.email && m.email.toLowerCase() === acct.email.toLowerCase());
      }

      let memberChip = "";
      if (assignedMember) {
        const initial = (assignedMember.username || 'U').charAt(0).toUpperCase();
        memberChip = `
          <div class="member-attribution-chip" title="Linked to family member: ${FamDocAPI.utils.escapeHtml(assignedMember.username)}">
            <span class="member-avatar-circle">${initial}</span>
            <span>${FamDocAPI.utils.escapeHtml(assignedMember.username)}</span>
          </div>
        `;
      } else {
        memberChip = `
          <div class="member-unassigned-chip" title="Unassigned drive">
            <i class="fas fa-user-circle" style="font-size: 0.75rem;"></i>
            <span>Shared Drive</span>
          </div>
        `;
      }

      return `
        <div class="account-card fd-fade-in" data-id="${acct.id}">
          <div class="account-card-header">
            <div>
              <div class="account-title-group">
                <i class="fab fa-google" style="color: #4285F4; font-size: 1.1rem;"></i>
                <span class="account-email">${FamDocAPI.utils.escapeHtml(acct.email || "Google Account")}</span>
                <span class="account-label-tag">${FamDocAPI.utils.escapeHtml(acct.label || "Drive")}</span>
              </div>
              <div style="margin-top: 0.35rem; display: flex; align-items: center; gap: 0.5rem;">
                ${memberChip}
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          ${alertBanner}

          <div style="margin-top: 0.75rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-ink-muted);">
              <span>Quota Usage</span>
              <span style="font-weight: 600; color: var(--text-ink);">${quotaText}</span>
            </div>
            <div class="account-quota-bar-container">
              <div class="account-quota-fill" style="width: ${percentUsed}%;"></div>
            </div>
          </div>

          <div class="account-card-actions">
            <button class="btn btn-secondary btn-sm btn-edit-label" data-id="${acct.id}" data-current="${FamDocAPI.utils.escapeHtml(acct.label || '')}" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;">
              <i class="fas fa-tag"></i> Edit Label
            </button>
            <button class="btn btn-secondary btn-sm btn-assign-member" data-id="${acct.id}" data-uid="${acct.user_id || ''}" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;">
              <i class="fas fa-user-edit"></i> Assign Member
            </button>
            ${acct.status === 'error' ? `
              <button class="btn btn-primary btn-sm btn-reauth-account" data-id="${acct.id}" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;">
                <i class="fas fa-key"></i> Re-authenticate
              </button>
            ` : ''}
            ${acct.status !== 'disconnected' && acct.status !== 'disconnecting' ? `
              <button class="btn btn-secondary btn-sm btn-disconnect-account" data-id="${acct.id}" data-email="${FamDocAPI.utils.escapeHtml(acct.email || '')}" style="font-size: 0.74rem; padding: 0.2rem 0.5rem; color: #ef4444;">
                <i class="fas fa-unlink"></i> Disconnect
              </button>
            ` : ''}
            ${acct.status === 'disconnected' ? `
              <button class="btn btn-secondary btn-sm btn-delete-account" data-id="${acct.id}" style="font-size: 0.74rem; padding: 0.2rem 0.5rem; color: #ef4444;">
                <i class="fas fa-trash-alt"></i> Remove Record
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("");

    setupAccountCardButtons(container);
  }

  function setupAccountCardButtons(container) {
    container.querySelectorAll(".btn-edit-label").forEach(btn => {
      btn.addEventListener("click", async () => {
        const acctId = btn.dataset.id;
        const current = btn.dataset.current;
        const newLabel = prompt("Enter a label for this Google Drive (e.g. Dad's Drive):", current);
        if (newLabel !== null && newLabel.trim() !== "") {
          try {
            await FamDocAPI.storage.updateAccount(acctId, { label: newLabel.trim() });
            FamDocAPI.utils.showToast("Drive label updated.", "success");
            await loadStorageConfig();
          } catch (err) {
            FamDocAPI.utils.showToast(err.message || "Failed to update label", "error");
          }
        }
      });
    });

    container.querySelectorAll(".btn-assign-member").forEach(btn => {
      btn.addEventListener("click", async () => {
        const acctId = btn.dataset.id;
        if (!familyMembersList || familyMembersList.length === 0) {
          FamDocAPI.utils.showToast("No family members found to assign.", "info");
          return;
        }

        let optionsPrompt = "Assign this Google Drive to a family member:\n0: Shared / Unassigned\n";
        familyMembersList.forEach((m, idx) => {
          optionsPrompt += `${idx + 1}: ${m.username} (${m.email || 'No email'})\n`;
        });

        const choice = prompt(optionsPrompt);
        if (choice !== null && choice.trim() !== "") {
          const num = parseInt(choice.trim());
          if (!isNaN(num) && num >= 0 && num <= familyMembersList.length) {
            const targetUserId = num === 0 ? 0 : familyMembersList[num - 1].user_id;
            try {
              await FamDocAPI.storage.updateAccount(acctId, { user_id: targetUserId });
              FamDocAPI.utils.showToast("Storage drive assigned to family member successfully!", "success");
              await loadStorageConfig();
            } catch (err) {
              FamDocAPI.utils.showToast(err.message || "Failed to assign member", "error");
            }
          } else {
            FamDocAPI.utils.showToast("Invalid choice entered.", "warning");
          }
        }
      });
    });

    container.querySelectorAll(".btn-disconnect-account").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const email = btn.dataset.email;
        const confirmed = await FamDocAPI.utils.confirm({
          title: "Disconnect Storage Drive",
          message: `Are you sure you want to disconnect ${email}? Files on this drive will be safely migrated to other connected drives in the background.`,
          confirmText: "Disconnect Drive",
          type: "danger"
        });
        if (confirmed) {
          try {
            await FamDocAPI.storage.disconnectAccount(id);
            FamDocAPI.utils.showToast("Drive disconnect started. Migration in progress.", "info");
            await loadStorageConfig();
          } catch (err) {
            FamDocAPI.utils.showToast(err.message || "Failed to disconnect drive", "error");
          }
        }
      });
    });

    container.querySelectorAll(".btn-delete-account").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        try {
          await FamDocAPI.storage.deleteAccount(id);
          FamDocAPI.utils.showToast("Account record removed.", "success");
          await loadStorageConfig();
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to delete account", "error");
        }
      });
    });

    container.querySelectorAll(".btn-reauth-account").forEach(btn => {
      btn.addEventListener("click", async () => {
        handleInitiateConnect();
      });
    });
  }

  function renderContributorsRoster(members, accounts) {
    const container = document.getElementById("contributors-roster-container");
    const countBadge = document.getElementById("contributors-count-badge");
    if (!container) return;

    if (!members || members.length === 0) {
      container.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-ink-muted); font-style: italic;">No family members found.</div>`;
      return;
    }

    const activeAccounts = (accounts || []).filter(a => a.status === "active");
    
    // Map accounts to user_id
    const memberAccountsMap = {};
    activeAccounts.forEach(acct => {
      let uid = acct.user_id;
      if (!uid && acct.email) {
        const found = members.find(m => m.email && m.email.toLowerCase() === acct.email.toLowerCase());
        if (found) uid = found.user_id;
      }
      if (uid) {
        if (!memberAccountsMap[uid]) memberAccountsMap[uid] = [];
        memberAccountsMap[uid].push(acct);
      }
    });

    let connectedCount = 0;
    container.innerHTML = members.map(m => {
      const userAccts = memberAccountsMap[m.user_id] || [];
      const isConnected = userAccts.length > 0;
      if (isConnected) connectedCount++;

      let totalCap = 0;
      userAccts.forEach(a => {
        totalCap += (a.cached_quota_total || 15 * 1024 * 1024 * 1024);
      });

      const initial = (m.username || 'U').charAt(0).toUpperCase();
      const roleIcon = m.role === 'admin' ? '<i class="fas fa-crown" style="color: #f59e0b; font-size: 0.7rem; margin-left: 0.25rem;" title="Admin"></i>' : '';

      const statusBadge = isConnected
        ? `<span class="contributor-status-badge connected"><i class="fab fa-google"></i> +${FamDocAPI.utils.formatBytes(totalCap)}</span>`
        : `<span class="contributor-status-badge shared">Shared Pool</span>`;

      return `
        <div class="contributor-list-item ${isConnected ? 'active' : 'shared'} fd-fade-in">
          <div class="contributor-user-group">
            <div class="contributor-avatar-large">${initial}</div>
            <div>
              <div class="contributor-name">
                ${FamDocAPI.utils.escapeHtml(m.username || 'Member')}
                ${roleIcon}
              </div>
              <div class="contributor-email">${FamDocAPI.utils.escapeHtml(m.email || '—')}</div>
            </div>
          </div>
          <div>${statusBadge}</div>
        </div>
      `;
    }).join("");

    if (countBadge) {
      countBadge.textContent = `${connectedCount} of ${members.length} Contributing`;
    }
  }

  function handleInitiateConnect() {
    const clientIdInput = document.getElementById("google-client-id");
    const clientSecretInput = document.getElementById("google-client-secret");
    
    let clientId = clientIdInput ? clientIdInput.value.trim() : "";
    let clientSecret = clientSecretInput ? clientSecretInput.value.trim() : "";

    // If client ID is known from current storage config, use it
    if (!clientId && currentStorageConfig && currentStorageConfig.client_id) {
      clientId = currentStorageConfig.client_id;
    }

    startGoogleAuth(clientId, clientSecret);
  }

  async function startGoogleAuth(clientId, clientSecret) {
    try {
      FamDocAPI.utils.showToast("Redirecting to Google Account Chooser...", "info");
      const result = await FamDocAPI.storage.getGoogleAuthUrl(clientId, clientSecret, "add");
      if (result && result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Failed to generate Google OAuth authorization URL");
      }
    } catch (err) {
      if (currentUser && currentUser.role === "admin") {
        // Open credentials drawer if credentials missing
        const drawer = document.getElementById("oauth-config-drawer");
        if (drawer) {
          drawer.classList.add("open");
          document.getElementById("google-client-id")?.focus();
        }
      }
      FamDocAPI.utils.showToast(err.message || "Failed to start Google OAuth process.", "error");
    }
  }

  function openInviteModal() {
    const modalContainer = document.getElementById("storage-invite-modal-container");
    if (!modalContainer) return;

    const shareUrl = `${window.location.origin}/#/storage`;
    const shareMessage = `Hey! Join our Family Document Vault pooled storage by linking your free Google Drive (+15 GB) here: ${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

    modalContainer.innerHTML = `
      <div class="storage-modal-backdrop fd-fade-in" id="storage-invite-backdrop">
        <div class="storage-modal-box fd-fade-up">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-family: var(--font-serif); font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-user-plus" style="color: var(--accent-brand);"></i> Invite Family Drives (+15 GB Each)
            </h3>
            <button type="button" id="btn-close-invite-modal" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem;">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.25rem;">
            Share this link with your family members. When they log in and tap <strong>"Connect My Google Drive"</strong>, their 15 GB quota is added to the shared pool.
          </p>

          <div style="margin-bottom: 1.25rem;">
            <label class="form-label">Storage Invite Link</label>
            <div class="uri-copy-container">
              <span id="txt-share-link" style="flex: 1; user-select: all;">${FamDocAPI.utils.escapeHtml(shareUrl)}</span>
              <button type="button" id="btn-copy-invite-link" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">
                <i class="fas fa-copy"></i> Copy Link
              </button>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; background-color: #25D366; color: #fff; text-decoration: none; padding: 0.45rem 0.9rem; border-radius: var(--radius-sm);">
              <i class="fab fa-whatsapp"></i> Share on WhatsApp
            </a>
            <button type="button" id="btn-dismiss-invite-modal" class="btn btn-secondary btn-sm">Done</button>
          </div>
        </div>
      </div>
    `;

    modalContainer.style.display = "block";

    const closeModal = () => { modalContainer.style.display = "none"; };
    document.getElementById("btn-close-invite-modal")?.addEventListener("click", closeModal);
    document.getElementById("btn-dismiss-invite-modal")?.addEventListener("click", closeModal);
    document.getElementById("storage-invite-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "storage-invite-backdrop") closeModal();
    });

    document.getElementById("btn-copy-invite-link")?.addEventListener("click", () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        FamDocAPI.utils.showToast("Invite link copied to clipboard!", "success");
      }).catch(() => {
        FamDocAPI.utils.showToast("Could not copy link to clipboard.", "error");
      });
    });
  }

  function setupAdminInteractions() {
    const btnQuickConnect = document.getElementById("btn-quick-connect-drive");
    btnQuickConnect?.addEventListener("click", () => {
      handleInitiateConnect();
    });

    const btnGoogle = document.getElementById("mode-btn-google");
    const btnLocal = document.getElementById("mode-btn-local");

    btnGoogle?.addEventListener("click", async () => {
      if (btnGoogle.classList.contains("active")) return;
      try {
        await FamDocAPI.storage.updateMode("google");
        FamDocAPI.utils.showToast("Storage mode switched to Google Drive Pool!", "success");
        await loadStorageConfig();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message || "Failed to switch mode to Google Drive", "error");
      }
    });

    btnLocal?.addEventListener("click", async () => {
      if (btnLocal.classList.contains("active")) return;
      try {
        await FamDocAPI.storage.updateMode("local");
        FamDocAPI.utils.showToast("Storage mode switched to Local Storage!", "info");
        await loadStorageConfig();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message || "Failed to switch mode to Local Storage", "error");
      }
    });
  }

  function setupEvents() {
    // Drawer Close Button
    document.getElementById("btn-close-oauth-drawer")?.addEventListener("click", () => {
      document.getElementById("oauth-config-drawer")?.classList.remove("open");
    });

    // Copy Redirect URI Button
    document.getElementById("btn-copy-redirect-uri")?.addEventListener("click", () => {
      const uri = `${window.location.origin}/api/storage/oauth2callback`;
      navigator.clipboard.writeText(uri).then(() => {
        FamDocAPI.utils.showToast("Redirect URI copied to clipboard!", "success");
      }).catch(() => {
        FamDocAPI.utils.showToast("Failed to copy URI", "error");
      });
    });

    // Drag & Drop Credentials JSON Dropzone
    const dropzone = document.getElementById("credentials-dropzone");
    const fileInput = document.getElementById("file-credentials-input");

    if (dropzone && fileInput) {
      dropzone.addEventListener("click", () => fileInput.click());

      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });

      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
      });

      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleCredentialsFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files.length > 0) {
          handleCredentialsFile(fileInput.files[0]);
        }
      });
    }

    // Credentials Form Submit
    const credsForm = document.getElementById("google-credentials-form");
    credsForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const clientIdInput = document.getElementById("google-client-id");
      const clientSecretInput = document.getElementById("google-client-secret");
      const clientId = clientIdInput ? clientIdInput.value.trim() : "";
      const clientSecret = clientSecretInput ? clientSecretInput.value.trim() : "";
      startGoogleAuth(clientId, clientSecret);
    });
  }

  function handleCredentialsFile(file) {
    if (!file.name.endsWith(".json")) {
      FamDocAPI.utils.showToast("Please select a valid .json credentials file from Google Cloud Console.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        const web = data.web || data.installed || data;
        const clientId = web.client_id || "";
        const clientSecret = web.client_secret || "";
        if (clientId && clientSecret) {
          const idInput = document.getElementById("google-client-id");
          const secInput = document.getElementById("google-client-secret");
          if (idInput) idInput.value = clientId;
          if (secInput) secInput.value = clientSecret;
          FamDocAPI.utils.showToast("Credentials loaded from JSON file! Click Save & Connect to proceed.", "success");
        } else {
          FamDocAPI.utils.showToast("Could not find client_id or client_secret in uploaded JSON file.", "error");
        }
      } catch (err) {
        FamDocAPI.utils.showToast("Invalid JSON file format.", "error");
      }
    };
    reader.readAsText(file);
  }
})();
