/**
 * Profile Settings View Manager (Consolidates profile.html)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let currentUser = null;
  let isRegenerating = false;

  window.FamDocViews.profile = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    mount.innerHTML = `
      <div class="content-header fd-fade-in">
        <div>
          <h1 class="page-title">Profile Settings</h1>
          <p class="page-subtitle">Manage your credentials and family vault details.</p>
        </div>
      </div>

      <div class="profile-grid">
        <!-- Account details Card -->
        <div class="famdoc-card fd-fade-up" style="--fd-delay: 0.05s;">
          <div class="famdoc-card-header">
            <h2 class="famdoc-card-title"><i class="fas fa-user-circle" style="color: var(--accent-brand); margin-right: 0.5rem;"></i>Account Details</h2>
          </div>

          <div id="profile-alert" class="famdoc-alert" style="display: none;">
            <i class="fas fa-info-circle"></i>
            <div id="profile-alert-message"></div>
          </div>

          <form id="profile-form">
            <div class="form-group">
              <label for="profile-email" class="form-label">Email Address</label>
              <input type="email" id="profile-email" class="form-control" disabled style="opacity: 0.65; cursor: not-allowed;">
            </div>

            <div class="form-group">
              <label for="profile-username" class="form-label">Username</label>
              <input type="text" id="profile-username" class="form-control" placeholder="Choose a username" required minlength="3" maxlength="20">
            </div>

            <div class="form-group">
              <label for="profile-password" class="form-label">Update Password (Optional)</label>
              <div class="password-input-wrapper">
                <input type="password" id="profile-password" class="form-control" placeholder="••••••••">
                <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-ink-muted);">Min. 8 characters with 1 uppercase letter and 1 number</span>
            </div>

            <div class="form-group">
              <label for="profile-confirm-password" class="form-label">Confirm New Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="profile-confirm-password" class="form-control" placeholder="••••••••">
                <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>

            <button type="submit" id="btn-save-profile" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
              <i class="fas fa-save"></i>
              <span>Save Profile Details</span>
            </button>
          </form>
        </div>

        <!-- Family details Card -->
        <div class="famdoc-card fd-fade-up" style="--fd-delay: 0.1s;">
          <div class="famdoc-card-header">
            <h2 class="famdoc-card-title"><i class="fas fa-home" style="color: var(--accent-brand); margin-right: 0.5rem;"></i>Family Vault Details</h2>
          </div>

          <div id="family-loading" class="empty-state" style="padding: 2rem 0;">
            <i class="fas fa-spinner fa-spin state-icon loading"></i>
            <p class="empty-state-text">Fetching details...</p>
          </div>

          <!-- Unassigned Vault -->
          <div id="family-none" style="display: none; text-align: center; padding: 2rem 0;">
            <i class="fas fa-house-user" style="font-size: 3rem; color: var(--border-paper-dark); margin-bottom: 1rem;"></i>
            <h4 style="font-family: var(--font-serif); font-weight: 800; margin-bottom: 0.5rem;">No Associated Vault</h4>
            <p style="font-size: 0.9rem; color: var(--text-ink-muted); margin-bottom: 1.5rem;">You are not associated with any family vault.</p>
            <button class="btn btn-primary" id="btn-init-family" style="margin: auto;">
              <i class="fas fa-key"></i> Initialize Family Code
            </button>
          </div>

          <!-- Admin Vault details -->
          <div id="family-admin" style="display: none;">
            <div style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-ink-muted); margin-bottom: 0.25rem;">Vault Name</div>
              <div id="admin-family-name" style="font-weight: 700; font-size: 1.1rem; color: var(--text-ink);">—</div>
            </div>

            <div style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-ink-muted); margin-bottom: 0.25rem;">Members Roster Capacity</div>
              <div id="admin-family-members" style="font-weight: 700; font-size: 1.1rem; color: var(--text-ink);">—</div>
            </div>

            <button class="btn btn-secondary" id="btn-regen-family-code" style="width: fit-content;">
              <i class="fas fa-sync-alt"></i> Regenerate Vault Invitation Code
            </button>

            <!-- Invitation stub print visualizer -->
            <div id="ticket-reveal-container" style="display: none; margin-top: 2rem;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-ink-muted); margin-bottom: 0.5rem;">Share invitation code</div>
              <div class="ticket-stub">
                <div>
                  <div class="ticket-label">Family Invitation</div>
                  <div class="ticket-code" id="revealed-code">XXXX-XXXX</div>
                </div>
                <button class="btn btn-secondary" id="btn-copy-code" style="padding: 0.5rem 1rem;">
                  <i class="far fa-copy"></i>
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Member Vault details -->
          <div id="family-member" style="display: none;">
            <div style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-ink-muted); margin-bottom: 0.25rem;">Vault Name</div>
              <div id="member-family-name" style="font-weight: 700; font-size: 1.1rem; color: var(--text-ink);">—</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-ink-muted); margin-bottom: 0.25rem;">Capacity</div>
              <div id="member-family-members" style="font-weight: 700; font-size: 1.1rem; color: var(--text-ink);">—</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Family Code Setup / Regenerator Dialog -->
      <div id="modal-family-code-wizard" class="modal-overlay">
        <div class="famdoc-modal">
          <div class="modal-header">
            <h3 class="modal-title" id="wizard-title">Initialize Vault</h3>
            <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
          </div>
          <form id="family-wizard-form">
            <div class="modal-body">
              <div id="wizard-error" class="famdoc-alert warning" style="display: none; margin-bottom: 1rem;">
                <i class="fas fa-exclamation-triangle"></i>
                <div id="wizard-error-message"></div>
              </div>

              <div class="form-group">
                <label for="wizard-family-name" class="form-label">Family / Vault Name</label>
                <input type="text" id="wizard-family-name" class="form-control" placeholder="e.g. The Smiths' Keepsakes" required minlength="2" maxlength="50">
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label for="wizard-max-members" class="form-label">Roster Member Limit</label>
                <input type="number" id="wizard-max-members" class="form-control" value="6" min="2" max="20" required>
                <span style="font-size: 0.75rem; color: var(--text-ink-muted);">Enter maximum allowable members in this family (2 - 20)</span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" id="btn-wizard-submit" class="btn btn-primary">Generate Code</button>
            </div>
          </form>
        </div>
      </div>
    `;

    setupEvents();
    loadProfileDetails().then(() => {
      // Auto-open invitation code wizard if invite=true query parameter is present
      const hashParts = window.location.hash.split('?');
      const queryParams = new URLSearchParams(hashParts[1] || '');
      if (queryParams.get("invite") === "true") {
        setTimeout(() => {
          const regenBtn = document.getElementById("btn-regen-family-code");
          if (regenBtn) {
            regenBtn.click();
          } else {
            const initBtn = document.getElementById("btn-init-family");
            if (initBtn) initBtn.click();
          }
        }, 150);
      }
    });

    // Register synchronization callback
    if (window.FamDocDataSync) {
      window.FamDocDataSync.register("profile", loadFamilyDetails);
    }
  };

  async function loadProfileDetails() {
    currentUser = await window.FamDocApp.getUser();
    if (!currentUser) return;

    const emailInput = document.getElementById("profile-email");
    const usernameInput = document.getElementById("profile-username");

    if (emailInput) emailInput.value = currentUser.email;
    if (usernameInput) usernameInput.value = currentUser.username;

    await loadFamilyDetails();
  }

  async function loadFamilyDetails() {
    const loadingDiv = document.getElementById("family-loading");
    const noneDiv = document.getElementById("family-none");
    const adminDiv = document.getElementById("family-admin");
    const memberDiv = document.getElementById("family-member");

    if (!loadingDiv) return;

    loadingDiv.style.display = "block";
    noneDiv.style.display = "none";
    adminDiv.style.display = "none";
    memberDiv.style.display = "none";

    if (!currentUser.family_id) {
      loadingDiv.style.display = "none";
      noneDiv.style.display = "block";
      return;
    }

    try {
      const familyDetails = await FamDocAPI.family.getDetails();
      loadingDiv.style.display = "none";

      if (currentUser.role === "admin") {
        document.getElementById("admin-family-name").textContent = familyDetails.name;
        document.getElementById("admin-family-members").textContent = familyDetails.max_members;
        adminDiv.style.display = "block";
      } else {
        document.getElementById("member-family-name").textContent = familyDetails.name;
        document.getElementById("member-family-members").textContent = familyDetails.max_members;
        memberDiv.style.display = "block";
      }
    } catch (err) {
      console.error("Failed to load family details:", err);
      loadingDiv.style.display = "none";
      noneDiv.style.display = "block";
    }
  }

  function openWizard() {
    document.getElementById("wizard-error").style.display = "none";
    document.getElementById("modal-family-code-wizard").classList.add("show");
  }

  function closeWizard() {
    document.getElementById("modal-family-code-wizard").classList.remove("show");
  }

  function showWizardError(msg) {
    const errDiv = document.getElementById("wizard-error");
    const errMsg = document.getElementById("wizard-error-message");
    errMsg.textContent = msg;
    errDiv.style.display = "flex";
  }

  function showProfileAlert(msg, type) {
    const alertDiv = document.getElementById("profile-alert");
    const msgDiv = document.getElementById("profile-alert-message");
    if (!alertDiv || !msgDiv) return;
    
    msgDiv.textContent = msg;
    alertDiv.className = `famdoc-alert ${type === 'error' ? 'warning' : 'success'}`;
    
    const icon = alertDiv.querySelector("i");
    if (type === 'error') {
      icon.className = "fas fa-exclamation-triangle";
    } else {
      icon.className = "fas fa-check-circle";
    }

    alertDiv.style.display = "flex";

    setTimeout(() => {
      alertDiv.style.display = "none";
    }, 5000);
  }

  function setupEvents() {
    // Handle profile updates
    document.getElementById("profile-form").addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("profile-username").value.trim();
      const password = document.getElementById("profile-password").value;
      const confirmPassword = document.getElementById("profile-confirm-password").value;
      const saveBtn = document.getElementById("btn-save-profile");

      if (password && password !== confirmPassword) {
        showProfileAlert("Passwords do not match.", "error");
        return;
      }

      if (password) {
        if (password.length < 8) {
          showProfileAlert("Password must be at least 8 characters long.", "error");
          return;
        }
        if (!/[A-Z]/.test(password)) {
          showProfileAlert("Password must contain at least one uppercase letter.", "error");
          return;
        }
        if (!/[0-9]/.test(password)) {
          showProfileAlert("Password must contain at least one number.", "error");
          return;
        }
      }

      try {
        saveBtn.disabled = true;
        saveBtn.querySelector("span").textContent = "Saving Profile...";

        await FamDocAPI.auth.updateProfile(username, password || null);
        showProfileAlert("Profile details updated successfully!", "success");

        // Clear password fields
        document.getElementById("profile-password").value = "";
        document.getElementById("profile-confirm-password").value = "";

        // Reload user locally and update sidebar user profile badges
        const freshUser = await FamDocAPI.auth.me();
        localStorage.setItem("famdoc_user", JSON.stringify(freshUser));
        window.FamDocApp.updateSidebarUserBadge(freshUser);
        currentUser = freshUser;

      } catch (err) {
        showProfileAlert(err.message || "Failed to update profile.", "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.querySelector("span").textContent = "Save Profile Details";
      }
    });

    // Close wizard buttons
    document.querySelectorAll(".modal-close, .modal-close-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const overlay = e.target.closest(".modal-overlay");
        if (overlay) overlay.classList.remove("show");
      });
    });

    // Init family click
    const initBtn = document.getElementById("btn-init-family");
    if (initBtn) {
      initBtn.addEventListener("click", () => {
        isRegenerating = false;
        document.getElementById("wizard-title").textContent = "Initialize Vault & Code";
        openWizard();
      });
    }

    // Regenerate family code click
    const regenBtn = document.getElementById("btn-regen-family-code");
    if (regenBtn) {
      regenBtn.addEventListener("click", () => {
        isRegenerating = true;
        document.getElementById("wizard-title").textContent = "Regenerate Invitation Code";
        
        const nameVal = document.getElementById("admin-family-name").textContent;
        const membersVal = document.getElementById("admin-family-members").textContent;
        
        if (nameVal && nameVal !== "—") {
          document.getElementById("wizard-family-name").value = nameVal;
        }
        if (membersVal && membersVal !== "—") {
          document.getElementById("wizard-max-members").value = parseInt(membersVal);
        }

        openWizard();
      });
    }

    // Wizard form submit
    document.getElementById("family-wizard-form").addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("wizard-family-name");
      const maxMembersInput = document.getElementById("wizard-max-members");
      const submitBtn = document.getElementById("btn-wizard-submit");

      const name = nameInput.value.trim();
      const maxMembers = parseInt(maxMembersInput.value);

      if (!name || name.length < 2) {
        showWizardError("Vault name must be at least 2 characters.");
        return;
      }

      if (isNaN(maxMembers) || maxMembers < 2 || maxMembers > 20) {
        showWizardError("Maximum family members limit must be between 2 and 20.");
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Generating...";

        let result;
        if (isRegenerating) {
          result = await FamDocAPI.family.regenerateCode(name, maxMembers);
          FamDocAPI.utils.showToast("Family invitation code regenerated!", "success");
        } else {
          result = await FamDocAPI.family.setup(name, maxMembers);
          FamDocAPI.utils.showToast("Family vault initialized and code generated!", "success");
        }

        closeWizard();

        // Reveal stub invitation
        const ticketContainer = document.getElementById("ticket-reveal-container");
        const codeField = document.getElementById("revealed-code");
        if (ticketContainer && codeField) {
          codeField.textContent = result.secret_code;
          ticketContainer.classList.add("fd-fade-in");
          ticketContainer.style.display = "block";
        }

        // Setup copy button target
        const copyBtn = document.getElementById("btn-copy-code");
        if (copyBtn) {
          copyBtn.setAttribute("data-copy-text", result.secret_code);
        }

        await loadFamilyDetails();

      } catch (err) {
        showWizardError(err.message || "Failed to generate family code.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Generate Code";
      }
    });
  }
})();
