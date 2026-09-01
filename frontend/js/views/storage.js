/**
 * Storage Config View Manager (Modern Minimalist Multi-Account Storage Pooling)
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
        FamDocAPI.utils.showToast("Google Drive account linked successfully!", "success");
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
          <p class="page-subtitle">Manage pooled multi-account Google Drive storage, family quotas, and active mode.</p>
        </div>
        <div class="storage-header-actions">
          <button id="btn-toggle-oauth-config" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.45rem;">
            <i class="fas fa-key" style="color: #f59e0b;"></i> API Credentials
          </button>
        </div>
      </div>

      <!-- Collapsible OAuth Credentials Drawer -->
      <div id="oauth-config-drawer" class="oauth-config-drawer fd-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-family: var(--font-serif); font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fab fa-google" style="color: #4285F4;"></i> Google OAuth API Credentials
          </h3>
          <button type="button" id="btn-close-oauth-drawer" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-ink-muted); margin-bottom: 1.25rem;">
          Provide your Google Cloud OAuth Client ID and Secret to allow family members to link their Google Drive accounts.
        </p>
        <form id="google-credentials-form">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="google-client-id">Google Client ID</label>
              <div class="password-input-wrapper">
                <input type="password" id="google-client-id" class="form-control" placeholder="Enter Client ID" required style="width: 100%; box-sizing: border-box;">
                <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="google-client-secret">Google Client Secret</label>
              <div class="password-input-wrapper">
                <input type="password" id="google-client-secret" class="form-control" placeholder="Enter Client Secret" required style="width: 100%; box-sizing: border-box;">
                <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem; justify-content: flex-end;">
            <button type="submit" id="btn-save-credentials-action" class="btn btn-primary btn-sm">
              <i class="fas fa-save"></i> Save & Connect Account
            </button>
          </div>
        </form>
      </div>

      <div id="storage-layout-content" class="fd-fade-in">
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
              <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-ink-muted);">Storage Mode:</span>
              <div class="mode-segmented-control">
                <button type="button" class="mode-segment-btn active" data-mode="google" id="mode-btn-google">
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
                <i class="fas fa-plus"></i> Connect Drive
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
              Family members who linked their personal Google Drive contribute capacity to the shared pool.
            </p>

            <!-- Contributors List -->
            <div id="contributors-roster-container" class="contributors-roster-list">
              <!-- Dynamically rendered -->
            </div>
          </div>

        </div>
      </div>
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

      // 1. Render Hero Summary Card
      renderHeroSummary(config, stats);

      // 2. Render Connected Google Drives List
      renderAccountCards(config.accounts || [], config.client_id, familyMembersList);

      // 3. Render Family Contributors Roster
      renderContributorsRoster(familyMembersList, config.accounts || []);

    } catch (err) {
      console.error("Failed to load storage config:", err);
      FamDocAPI.utils.showToast("Failed to load storage configuration.", "error");
    }
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

    // Disable Google mode toggle if no accounts connected and not configured
    if (btnGoogle) {
      if (!config.google_configured && activeAccounts.length === 0) {
        btnGoogle.disabled = true;
        btnGoogle.title = "Connect a Google Drive account first to enable cloud mode";
      } else {
        btnGoogle.disabled = false;
        btnGoogle.title = "";
      }
    }

    // Render Multi-segment Progress Bar & Legend
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
        <div style="text-align: center; padding: 2rem 1.5rem; background-color: var(--surface-paper-tint); border: 1px dashed var(--border-paper-dark); border-radius: var(--radius-md);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background-color: rgba(66, 133, 244, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem;">
            <i class="fab fa-google" style="color: #4285F4; font-size: 1.25rem;"></i>
          </div>
          <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-ink);">No Google Drives Connected</div>
          <p style="font-size: 0.8rem; color: var(--text-ink-muted); margin: 0.35rem 0 1rem 0;">
            Link your Google Drive account to expand your vault capacity with pooled cloud storage.
          </p>
          <button class="btn btn-primary btn-sm btn-action-trigger-connect">
            <i class="fab fa-google"></i> Connect First Drive
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
            <div>Files on this account are being migrated in the background.</div>
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
            <div class="member-avatar-circle">${initial}</div>
            <span><strong>${FamDocAPI.utils.escapeHtml(assignedMember.username)}</strong> (${assignedMember.role || 'Member'})</span>
          </div>
        `;
      } else {
        memberChip = `
          <div class="member-unassigned-chip" title="Click 'Assign Member' to link this drive to a specific member">
            <i class="fas fa-user-tag"></i> <span>Unassigned</span>
          </div>
        `;
      }

      return `
        <div class="account-card fd-fade-in" data-account-id="${acct.id}">
          <div class="account-card-header">
            <div class="account-title-group">
              <i class="fab fa-google" style="color: #4285F4; font-size: 1.25rem;"></i>
              <div>
                <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                  <span class="account-email">${FamDocAPI.utils.escapeHtml(acct.email || acct.label || 'Google Drive')}</span>
                  <span class="account-label-tag">${FamDocAPI.utils.escapeHtml(acct.label || 'Drive #' + acct.id)}</span>
                </div>
                <div style="margin-top: 0.25rem;">
                  ${memberChip}
                </div>
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-ink-muted); margin-top: 0.4rem;">
            ${quotaText}
          </div>
          <div class="account-quota-bar-container">
            <div class="account-quota-fill" style="width: ${percentUsed}%;"></div>
          </div>

          ${alertBanner}

          <div class="account-card-actions">
            <button class="btn btn-secondary btn-sm btn-edit-account" data-id="${acct.id}" data-label="${FamDocAPI.utils.escapeHtml(acct.label || '')}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">
              <i class="fas fa-edit"></i> Rename
            </button>
            <button class="btn btn-secondary btn-sm btn-assign-member" data-id="${acct.id}" data-current-user-id="${acct.user_id || ''}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">
              <i class="fas fa-user-tag"></i> Assign
            </button>
            ${acct.status === "error" ? `
              <button class="btn btn-primary btn-sm btn-reauth-account" data-id="${acct.id}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">
                <i class="fas fa-redo"></i> Re-auth
              </button>
            ` : ''}
            ${acct.status === "active" ? `
              <button class="btn btn-danger btn-sm btn-disconnect-account" data-id="${acct.id}" data-email="${FamDocAPI.utils.escapeHtml(acct.email || '')}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">
                <i class="fas fa-unlink"></i> Disconnect
              </button>
            ` : ''}
            ${acct.status === "disconnected" ? `
              <button class="btn btn-danger btn-sm btn-delete-account" data-id="${acct.id}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">
                <i class="fas fa-trash"></i> Remove
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("");

    // Attach card event listeners
    container.querySelectorAll(".btn-edit-account").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const currentLabel = btn.dataset.label;
        const newLabel = prompt("Enter a nickname for this drive (e.g., Akshay's Drive):", currentLabel);
        if (newLabel !== null && newLabel.trim() !== "") {
          try {
            await FamDocAPI.storage.updateAccount(id, { label: newLabel.trim() });
            FamDocAPI.utils.showToast("Account label updated!", "success");
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

        let optionsPrompt = "Select which family member owns this Google Drive:\n\n";
        optionsPrompt += "0. Unassigned (No specific member)\n";
        familyMembersList.forEach((m, idx) => {
          optionsPrompt += `${idx + 1}. ${m.username} (${m.email || 'No email'}) [${m.role}]\n`;
        });
        optionsPrompt += "\nEnter number (0 to " + familyMembersList.length + "):";

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
        ? `<span class="contributor-status-badge connected"><i class="fab fa-google"></i> ${FamDocAPI.utils.formatBytes(totalCap)}</span>`
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

    if (!clientId) {
      // Open credentials drawer to ask user for keys
      const drawer = document.getElementById("oauth-config-drawer");
      if (drawer) {
        drawer.classList.add("open");
        clientIdInput?.focus();
        FamDocAPI.utils.showToast("Please enter your Google Client ID and Secret to connect.", "info");
      }
      return;
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
      FamDocAPI.utils.showToast(err.message || "Failed to start Google OAuth process.", "error");
    }
  }

  function setupEvents() {
    // Drawer Toggle Buttons
    const btnToggleDrawer = document.getElementById("btn-toggle-oauth-config");
    const btnCloseDrawer = document.getElementById("btn-close-oauth-drawer");
    const drawer = document.getElementById("oauth-config-drawer");

    btnToggleDrawer?.addEventListener("click", () => {
      if (drawer) drawer.classList.toggle("open");
    });

    btnCloseDrawer?.addEventListener("click", () => {
      if (drawer) drawer.classList.remove("open");
    });

    // Quick Connect Drive Button
    const btnQuickConnect = document.getElementById("btn-quick-connect-drive");
    btnQuickConnect?.addEventListener("click", () => {
      handleInitiateConnect();
    });

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

    // Mode Switch Buttons
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
})();
