/**
 * Storage Config View Manager (Multi-Account Google Drive Storage Pooling)
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
        FamDocAPI.utils.showToast("Google Drive account linked successfully!", "success");
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
          <p class="page-subtitle">Manage multi-account Google Drive storage pooling and local fallback options.</p>
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
            <!-- Progress segments injected dynamically -->
          </div>
          <div class="storage-legend-grid" id="storage-legend">
            <!-- Legend items injected dynamically -->
          </div>
        </div>

        <!-- Storage Mode Selector Card -->
        <div class="famdoc-card fd-fade-up" id="storage-mode-selector-panel" style="margin-bottom: 2rem; padding: 1.5rem 2rem;">
          <h3 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-server" style="color: var(--accent-brand);"></i>
            Active Storage Mode Selection
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.5rem;">
            Choose how your family documents are stored. Connecting Google Drive enables multi-account cloud pooling and synchronization.
          </p>
          
          <form id="storage-mode-form">
            <div class="storage-modes-list" style="display: flex; flex-direction: column; gap: 1rem;">
              
              <!-- Local Mode -->
              <label class="storage-mode-option">
                <input type="radio" name="storage_provider" value="local" checked>
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-ink);">Local Storage Only</strong>
                  <span style="font-size: 0.82rem; color: var(--text-ink-muted);">Keep all files on the local vault without uploading to external cloud drives.</span>
                </div>
              </label>

              <!-- Google Drive Only -->
              <label class="storage-mode-option" id="mode-opt-google">
                <input type="radio" name="storage_provider" value="google">
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--text-ink);"><i class="fab fa-google" style="color: #4285F4; margin-right: 0.25rem;"></i> Google Drive (Multi-Account Pooling)</strong>
                  <span style="font-size: 0.82rem; color: var(--text-ink-muted);">Route uploads across connected Google accounts based on available capacity.</span>
                </div>
              </label>

            </div>

            <button type="submit" id="btn-save-storage-mode" class="btn btn-primary" style="margin-top: 1.5rem; width: 100%; justify-content: center; gap: 0.5rem;">
              <i class="fas fa-save"></i> Apply Storage Mode Settings
            </button>
          </form>
        </div>

        <!-- Family Storage Contributors Section -->
        <div class="famdoc-card fd-fade-up" id="contributors-panel" style="margin-bottom: 2rem; padding: 1.5rem 2rem;">
          <div class="famdoc-card-header" style="margin-bottom: 0.5rem;">
            <h3 style="font-family: var(--font-serif); font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-users" style="color: var(--accent-brand);"></i>
              Family Storage Contributors
            </h3>
            <span id="contributors-summary-badge" class="badge badge-primary">0 of 0 Connected</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.25rem;">
            See which family members have connected their Google Drive accounts and are contributing storage to the shared family pool.
          </p>
          <div id="contributors-grid-container" class="contributors-overview-grid">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Google Drive Multi-Account Management Section -->
        <div class="famdoc-card storage-config-card fd-fade-up" id="google-card" style="margin-bottom: 2rem;">
          <div class="famdoc-card-header">
            <h2 class="famdoc-card-title"><i class="fab fa-google" style="color: #4285F4; margin-right: 0.5rem;"></i>Connected Google Accounts</h2>
            <div id="google-active-badge-container"></div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-ink-muted); margin-bottom: 1.5rem;">
            Link one or more personal Google Drive accounts for your family. Uploads will be automatically routed to whichever connected account has the most available space.
          </p>

          <!-- Accounts List Grid -->
          <div id="accounts-cards-container" class="account-cards-list">
            <!-- Account Cards rendered dynamically -->
          </div>

          <!-- Add Account / Initial Credentials Form -->
          <div id="google-connect-panel" style="margin-top: 1rem;">
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
                <i class="fab fa-google"></i> Connect New Google Drive Account
              </button>
            </form>
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

  let familyMembersList = [];

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
        FamDocAPI.dashboard.getStats().catch(err => {
          console.error("Failed to load storage breakdown stats", err);
          return null;
        }),
        FamDocAPI.family.getMembers().catch(err => {
          console.error("Failed to load family members for attribution", err);
          return [];
        })
      ]);

      familyMembersList = members || [];

      const activeProviderEl = document.getElementById("storage-active-provider");
      const activeDetailEl = document.getElementById("storage-active-detail");
      
      const googleCard = document.getElementById("google-card");
      const googleBadgeContainer = document.getElementById("google-active-badge-container");
      
      if (!activeProviderEl) return;

      if (googleCard) googleCard.classList.remove("active-card");
      if (googleBadgeContainer) googleBadgeContainer.innerHTML = "";
      
      const provider = config.storage_provider || "local";
      activeProviderEl.className = "badge badge-primary fd-fade-in";
      activeProviderEl.style.cssText = "font-size: 0.85rem; padding: 0.25rem 0.6rem; vertical-align: middle;";
      activeProviderEl.textContent = provider.toUpperCase();
      
      if (config.client_id) {
        const gInput = document.getElementById("google-client-id");
        if (gInput) gInput.value = config.client_id;
      }

      const activeAccounts = (config.accounts || []).filter(a => a.status === "active");

      if (provider === "google") {
        activeDetailEl.textContent = `Google Drive Pooling Active (${activeAccounts.length} connected account${activeAccounts.length === 1 ? '' : 's'}).`;
        if (googleCard) googleCard.classList.add("active-card");
        if (googleBadgeContainer) googleBadgeContainer.innerHTML = `<span class="active-badge"><i class="fas fa-check-circle"></i> Active</span>`;
      } else {
        activeDetailEl.textContent = "Currently using local database storage folder.";
      }

      // Configure Storage Mode Panel
      const googleConfigured = config.google_configured;
      const optGoogle = document.getElementById("mode-opt-google");

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

      // Set active values in radio form
      const radioInput = document.querySelector(`input[name="storage_provider"][value="${provider}"]`);
      if (radioInput) {
        radioInput.checked = true;
      }

      // Render Family Storage Contributors Overview
      renderContributorsOverview(familyMembersList, config.accounts || []);

      // Render Connected Accounts Cards
      renderAccountCards(config.accounts || [], config.client_id, familyMembersList);

      // Render visual breakdown if stats are available
      if (stats) {
        renderStorageBreakdown(stats);
      }
    } catch (err) {
      console.error("Failed to load storage config:", err);
    }
  }

  function renderContributorsOverview(members, accounts) {
    const container = document.getElementById("contributors-grid-container");
    const badge = document.getElementById("contributors-summary-badge");
    if (!container) return;

    if (!members || members.length === 0) {
      container.innerHTML = `<div class="famdoc-alert info" style="grid-column: 1 / -1;"><i class="fas fa-info-circle"></i> No family members found.</div>`;
      return;
    }

    const activeAccounts = (accounts || []).filter(a => a.status === "active");
    
    // Map accounts to member user_id
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
    const cardsHtml = members.map(m => {
      const userAccts = memberAccountsMap[m.user_id] || [];
      const isConnected = userAccts.length > 0;
      if (isConnected) connectedCount++;

      let totalCap = 0;
      let totalUsed = 0;
      userAccts.forEach(a => {
        totalCap += (a.cached_quota_total || 15 * 1024 * 1024 * 1024);
        totalUsed += (a.cached_quota_used || 0);
      });

      const initial = (m.username || 'U').charAt(0).toUpperCase();
      const roleBadge = m.role === 'admin' ? '<span class="badge badge-primary" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">Admin</span>' : '';
      
      const statusBadge = isConnected
        ? `<span class="contributor-status-badge connected"><i class="fab fa-google"></i> Connected</span>`
        : `<span class="contributor-status-badge shared"><i class="fas fa-layer-group"></i> Shared Pool</span>`;

      const quotaDetail = isConnected
        ? `<div style="font-size: 0.85rem; font-weight: 600; color: var(--text-ink); margin-top: 0.25rem;">
             ${FamDocAPI.utils.formatBytes(totalCap)} Contributed
           </div>
           <div style="font-size: 0.74rem; color: var(--text-ink-muted);">
             ${userAccts.map(a => FamDocAPI.utils.escapeHtml(a.email || a.label || 'Google Drive')).join(', ')}
           </div>`
        : `<div style="font-size: 0.8rem; color: var(--text-ink-muted); margin-top: 0.25rem; font-style: italic;">
             Accessing shared storage pool
           </div>`;

      return `
        <div class="contributor-card ${isConnected ? 'active-contributor' : 'inactive-contributor'} fd-fade-in">
          <div class="contributor-card-header">
            <div class="contributor-user-group">
              <div class="contributor-avatar-large">${initial}</div>
              <div>
                <div class="contributor-name" style="display: flex; align-items: center; gap: 0.35rem;">
                  ${FamDocAPI.utils.escapeHtml(m.username || 'Member')}
                  ${roleBadge}
                </div>
                <div class="contributor-email">${FamDocAPI.utils.escapeHtml(m.email || '')}</div>
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>
          ${quotaDetail}
        </div>
      `;
    }).join("");

    container.innerHTML = cardsHtml;
    if (badge) {
      badge.textContent = `${connectedCount} of ${members.length} Connected`;
      badge.className = connectedCount > 0 ? "badge badge-success" : "badge badge-primary";
    }
  }

  function renderAccountCards(accounts, existingClientId, members) {
    const container = document.getElementById("accounts-cards-container");
    if (!container) return;

    if (accounts.length === 0) {
      container.innerHTML = `
        <div class="famdoc-alert warning" style="margin-bottom: 1.5rem;">
          <i class="fas fa-info-circle"></i>
          <div>No Google Drive accounts connected yet. Use the form below to link your first account.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = accounts.map(acct => {
      let statusBadge = `<span class="status-badge-active"><i class="fas fa-check-circle"></i> Active</span>`;
      let alertBanner = "";

      if (acct.status === "error") {
        statusBadge = `<span class="status-badge-error"><i class="fas fa-exclamation-circle"></i> Re-auth Required</span>`;
        alertBanner = `
          <div class="famdoc-alert warning" style="margin-top: 0.75rem; padding: 0.5rem 1rem; font-size: 0.82rem;">
            <i class="fas fa-exclamation-triangle"></i>
            <div>Google OAuth token expired or revoked. Click Re-authenticate to reconnect this account.</div>
          </div>
        `;
      } else if (acct.status === "disconnecting") {
        statusBadge = `<span class="status-badge-disconnecting"><i class="fas fa-spinner fa-spin"></i> Disconnecting...</span>`;
        alertBanner = `
          <div class="famdoc-alert warning" style="margin-top: 0.75rem; padding: 0.5rem 1rem; font-size: 0.82rem;">
            <i class="fas fa-sync fa-spin"></i>
            <div>Files stored on this account are being migrated to other storage backends in the background.</div>
          </div>
        `;
      } else if (acct.status === "disconnected") {
        statusBadge = `<span class="badge badge-secondary">Disconnected</span>`;
      }

      let quotaText = "Quota details pending refresh";
      let percentUsed = 0;
      if (acct.cached_quota_total) {
        const used = acct.cached_quota_used || 0;
        const total = acct.cached_quota_total;
        percentUsed = Math.min(100, Math.round((used / total) * 100));
        quotaText = `Used ${FamDocAPI.utils.formatBytes(used)} of ${FamDocAPI.utils.formatBytes(total)} (${percentUsed}%)`;
      } else if (acct.cached_quota_total === None || acct.cached_quota_total === 0) {
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
            <i class="fas fa-user-tag"></i> <span>Unassigned Member</span>
          </div>
        `;
      }

      return `
        <div class="account-card fd-fade-in" data-account-id="${acct.id}">
          <div class="account-card-header">
            <div class="account-title-group">
              <i class="fab fa-google" style="color: #4285F4; font-size: 1.3rem;"></i>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="account-email">${FamDocAPI.utils.escapeHtml(acct.email || acct.label || 'Google Account')}</span>
                  <span class="account-label-tag">${FamDocAPI.utils.escapeHtml(acct.label || 'Account #' + acct.id)}</span>
                </div>
                <div style="margin-top: 0.35rem;">
                  ${memberChip}
                </div>
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-ink-muted); margin-top: 0.5rem;">
            ${quotaText}
          </div>
          <div class="account-quota-bar-container">
            <div class="account-quota-fill" style="width: ${percentUsed}%;"></div>
          </div>

          ${alertBanner}

          <div class="account-card-actions" style="margin-top: 1rem;">
            <button class="btn btn-secondary btn-sm btn-edit-account" data-id="${acct.id}" data-label="${FamDocAPI.utils.escapeHtml(acct.label || '')}">
              <i class="fas fa-edit"></i> Edit Label
            </button>
            <button class="btn btn-secondary btn-sm btn-assign-member" data-id="${acct.id}" data-current-user-id="${acct.user_id || ''}">
              <i class="fas fa-user-tag"></i> Assign Member
            </button>
            ${acct.status === "error" ? `
              <button class="btn btn-primary btn-sm btn-reauth-account" data-id="${acct.id}">
                <i class="fas fa-redo"></i> Re-authenticate
              </button>
            ` : ''}
            ${acct.status === "active" ? `
              <button class="btn btn-danger btn-sm btn-disconnect-account" data-id="${acct.id}" data-email="${FamDocAPI.utils.escapeHtml(acct.email || '')}">
                <i class="fas fa-unlink"></i> Disconnect
              </button>
            ` : ''}
            ${acct.status === "disconnected" ? `
              <button class="btn btn-danger btn-sm btn-delete-account" data-id="${acct.id}">
                <i class="fas fa-trash"></i> Remove Account
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("");

    // Add action handlers to dynamically rendered account cards
    container.querySelectorAll(".btn-edit-account").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const currentLabel = btn.dataset.label;
        const newLabel = prompt("Enter a nickname for this account (e.g., Dad's Drive):", currentLabel);
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
        const currentUid = parseInt(btn.dataset.currentUserId) || 0;
        
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
              FamDocAPI.utils.showToast("Google Drive assigned to family member successfully!", "success");
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
          title: "Disconnect Account",
          message: `Are you sure you want to disconnect ${email}? Files currently stored on this account will be automatically migrated to other available backends in the background.`,
          confirmText: "Disconnect Account",
          type: "danger"
        });
        if (confirmed) {
          try {
            await FamDocAPI.storage.disconnectAccount(id);
            FamDocAPI.utils.showToast("Account disconnect & background migration started.", "info");
            await loadStorageConfig();
          } catch (err) {
            FamDocAPI.utils.showToast(err.message || "Failed to disconnect account", "error");
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
        const clientIdInput = document.getElementById("google-client-id");
        const clientId = clientIdInput ? clientIdInput.value.trim() : null;
        try {
          const result = await FamDocAPI.storage.getGoogleAuthUrl(clientId, null, "add");
          if (result && result.url) {
            window.location.href = result.url;
          }
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to initiate re-authentication", "error");
        }
      });
    });
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
          
          const result = await FamDocAPI.storage.getGoogleAuthUrl(clientId, clientSecret, "add");
          if (result && result.url) {
            window.location.href = result.url;
          } else {
            throw new Error("Failed to get authorization URL");
          }
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to start Google OAuth process.", "error");
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fab fa-google"></i> Connect New Google Drive Account';
        }
      });
    }

    // Handle Storage Mode Form Submit
    const modeForm = document.getElementById("storage-mode-form");
    if (modeForm) {
      modeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("btn-save-storage-mode");
        
        const checkedProvider = document.querySelector('input[name="storage_provider"]:checked');
        const selectedProvider = checkedProvider ? checkedProvider.value : "local";
        
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
          
          await FamDocAPI.storage.updateMode(selectedProvider);
          FamDocAPI.utils.showToast("Storage provider updated successfully!", "success");
          await loadStorageConfig();
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to update storage provider.", "error");
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
