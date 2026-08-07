/**
 * Dashboard View Manager
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  window.FamDocViews.dashboard = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Render basic HTML layout for dashboard
    mount.innerHTML = `
      <div class="content-header fd-fade-in">
        <div>
          <h1 class="page-title" id="welcome-message">Good day</h1>
          <p class="page-subtitle">Here is the latest from your family vault.</p>
        </div>
      </div>

      <!-- Dashboard Statistics Grid -->
      <div class="dashboard-grid">
        <div class="famdoc-card stat-card fd-fade-up fd-stagger" style="--fd-delay: 0.05s;">
          <div class="icon-chip stat-icon"><i class="fas fa-file-alt"></i></div>
          <div class="stat-label">Total Files</div>
          <div class="stat-val" id="stat-files"><span class="fd-skel" style="width: 50px; height: 30px; border-radius: 4px;"></span></div>
        </div>
        <div class="famdoc-card stat-card fd-fade-up fd-stagger" style="--fd-delay: 0.1s;">
          <div class="icon-chip stat-icon"><i class="fas fa-database"></i></div>
          <div class="stat-label">Space Occupied</div>
          <div class="stat-val" id="stat-size"><span class="fd-skel" style="width: 100px; height: 30px; border-radius: 4px;"></span></div>
        </div>
        <div class="famdoc-card stat-card fd-fade-up fd-stagger" style="--fd-delay: 0.15s;">
          <div class="icon-chip stat-icon"><i class="fas fa-users"></i></div>
          <div class="stat-label">Family Members</div>
          <div class="stat-val" id="stat-members"><span class="fd-skel" style="width: 40px; height: 30px; border-radius: 4px;"></span></div>
        </div>
      </div>

      <!-- Double Sections -->
      <div class="dashboard-sections">
        <!-- Recent Uploads Card -->
        <div class="famdoc-card fd-fade-up" style="--fd-delay: 0.2s;">
          <div class="famdoc-card-header">
            <h2 class="famdoc-card-title"><i class="fas fa-clock" style="color: var(--accent-brand); margin-right: 0.5rem;"></i>Recent Vault Uploads</h2>
            <a href="#/vault" style="font-size: 0.85rem; font-weight: 600;">Browse All <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i></a>
          </div>
          
          <div id="recent-uploads-list" class="items-list">
            <!-- Skeleton Loading State -->
            <div class="fd-skel-uploads-placeholder">
              <div class="skel-row">
                <div class="fd-skel fd-skel-circle" style="width: 1.75rem; height: 1.75rem;"></div>
                <div style="flex: 1; display: grid; grid-template-columns: 2fr 1fr 1.2fr; gap: 1rem; align-items: center; width: 100%;">
                  <div class="fd-skel fd-skel-text lg"></div>
                  <div class="fd-skel fd-skel-text md"></div>
                  <div class="fd-skel fd-skel-text sm"></div>
                </div>
              </div>
              <div class="skel-row">
                <div class="fd-skel fd-skel-circle" style="width: 1.75rem; height: 1.75rem;"></div>
                <div style="flex: 1; display: grid; grid-template-columns: 2fr 1fr 1.2fr; gap: 1rem; align-items: center; width: 100%;">
                  <div class="fd-skel fd-skel-text lg"></div>
                  <div class="fd-skel fd-skel-text md"></div>
                  <div class="fd-skel fd-skel-text sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Feed Card -->
        <div class="famdoc-card fd-fade-up" style="--fd-delay: 0.25s;">
          <div class="famdoc-card-header">
            <h2 class="famdoc-card-title"><i class="fas fa-history" style="color: var(--accent-brand); margin-right: 0.5rem;"></i>Vault Activity</h2>
          </div>
          
          <div id="activity-feed-list" class="activity-feed">
            <!-- Skeleton Loading State -->
            <div class="fd-skel-activity-placeholder">
              <div class="activity-item">
                <div class="activity-icon fd-skel fd-skel-circle" style="width: 28px; height: 28px;"></div>
                <div class="activity-details" style="flex: 1; display: flex; flex-direction: column; gap: 0.35rem;">
                  <div class="fd-skel fd-skel-text lg"></div>
                  <div class="fd-skel fd-skel-text md"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Process dashboard initialization
    initDashboard();
  };

  async function getPreviewToken(fileId) {
    try {
      const data = await FamDocAPI.request(`/api/files/${fileId}/preview-token`);
      return data.token;
    } catch (err) {
      console.error("Failed to get preview token:", err);
      return null;
    }
  }

  async function loadThumbnail(fileId) {
    try {
      const fileToken = await getPreviewToken(fileId);
      if (!fileToken) return;
      const previewUrl = FamDocAPI.files.getPreviewUrl(fileId);
      const authenticatedPreviewUrl = previewUrl + `?token=${fileToken}`;
      const imgs = document.querySelectorAll(`img[data-file-id="${fileId}"]`);
      imgs.forEach(img => {
        img.src = authenticatedPreviewUrl;
      });
    } catch (err) {
      console.error("Failed to load thumbnail for file " + fileId, err);
    }
  }

  function renderDashboardStats(stats) {
    // Set stats numbers
    const statFiles = document.getElementById("stat-files");
    const statSize = document.getElementById("stat-size");
    const statMembers = document.getElementById("stat-members");

    if (statFiles) statFiles.textContent = stats.total_files;
    if (statSize) statSize.textContent = FamDocAPI.utils.formatBytes(stats.total_size_bytes);
    if (statMembers) statMembers.textContent = stats.total_members;

    // Populate Recent Uploads
    const recentList = document.getElementById("recent-uploads-list");
    if (!recentList) return;

    if (stats.recent_uploads && stats.recent_uploads.length > 0) {
      recentList.innerHTML = "";
      stats.recent_uploads.forEach((file, index) => {
        const fileCard = document.createElement("div");
        fileCard.className = "vault-item fd-fade-up fd-stagger";
        fileCard.style.padding = "0.75rem 1rem";
        fileCard.style.gap = "0.75rem";
        fileCard.style.setProperty("--fd-delay", `${index * 0.05}s`);
        
        // Open preview inside Vault View
        fileCard.addEventListener("dblclick", () => {
          window.FamDocRouter.navigate(`/vault?preview=${file.id}`);
        });
        
        const ext = file.filename.split(".").pop().toLowerCase();
        const mime = file.file_type ? file.file_type.toLowerCase() : "";
        const isImage = mime.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

        let iconHtml = "";
        if (isImage) {
          const previewUrl = FamDocAPI.files.getPreviewUrl(file.id);
          const authenticatedPreviewUrl = previewUrl + (file.preview_token ? `?token=${file.preview_token}` : "");
          iconHtml = `<img class="item-icon item-thumbnail loaded" data-file-id="${file.id}" src="${authenticatedPreviewUrl}" alt="${FamDocAPI.utils.escapeHtml(file.filename)}" onerror="this.onerror=null; this.outerHTML='<i class=\'item-icon fas fa-file-image file-image\'></i>';">`;
        } else {
          const iconClass = FamDocAPI.utils.getFileIconClass(file.file_type, file.filename);
          iconHtml = `<i class="item-icon ${iconClass}"></i>`;
        }
        const formattedSize = FamDocAPI.utils.formatBytes(file.size_bytes);
        const formattedDate = FamDocAPI.utils.formatDate(file.upload_date);

        fileCard.innerHTML = `
          ${iconHtml}
          <div class="item-details" style="grid-template-columns: 2fr 1fr 1.2fr; width: 100%; display: grid; align-items: center;">
            <div class="item-name" style="font-size: 0.85rem;" title="${FamDocAPI.utils.escapeHtml(file.filename)}">${FamDocAPI.utils.escapeHtml(file.filename)}</div>
            <div class="item-meta-size" style="font-size: 0.75rem;">${formattedSize}</div>
            <div class="item-meta-date" style="font-size: 0.75rem;">${formattedDate.split(',')[0]}</div>
          </div>
        `;
        recentList.appendChild(fileCard);

        // Fetch thumbnail in background if token was not bundled
        if (isImage && !file.preview_token) {
          loadThumbnail(file.id);
        }
      });
    } else {
      recentList.innerHTML = `
        <div class="empty-state fd-fade-in" style="padding: 2rem 0;">
          <i class="fas fa-folder-open state-icon empty"></i>
          <h4 class="empty-state-title">No files uploaded yet</h4>
          <p class="empty-state-text">Head over to the Shared Vault to add family files.</p>
        </div>
      `;
    }

    // Populate Activity Feed
    const activityFeed = document.getElementById("activity-feed-list");
    if (!activityFeed) return;

    if (stats.recent_activity && stats.recent_activity.length > 0) {
      activityFeed.innerHTML = "";
      stats.recent_activity.forEach((log, index) => {
        const activityItem = document.createElement("div");
        activityItem.className = "activity-item fd-fade-up fd-stagger";
        activityItem.style.setProperty("--fd-delay", `${index * 0.05}s`);
        
        let actionIcon = "fa-info-circle";
        if (log.action.includes("UPLOAD")) actionIcon = "fa-file-upload";
        if (log.action.includes("DELETE")) actionIcon = "fa-trash-alt";
        if (log.action.includes("RENAME")) actionIcon = "fa-edit";
        if (log.action.includes("DOWNLOAD")) actionIcon = "fa-download";
        if (log.action.includes("SHARE")) actionIcon = "fa-share-alt";
        if (log.action.includes("LOGIN")) actionIcon = "fa-sign-in-alt";
        if (log.action.includes("CREATE")) actionIcon = "fa-folder-plus";

        activityItem.innerHTML = `
          <div class="activity-icon">
            <i class="fas ${actionIcon}"></i>
          </div>
          <div class="activity-details">
            <div><strong>${log.username || 'Someone'}</strong> ${cleanActionDetails(log.action, log.details)}</div>
            <div class="activity-time">${FamDocAPI.utils.formatDate(log.timestamp)}</div>
          </div>
        `;
        activityFeed.appendChild(activityItem);
      });
    } else {
      activityFeed.innerHTML = `
        <div class="empty-state fd-fade-in" style="padding: 2rem 0;">
          <i class="fas fa-stream state-icon empty"></i>
          <h4 class="empty-state-title">No recent activity</h4>
          <p class="empty-state-text">Actions like uploads will appear here.</p>
        </div>
      `;
    }
  }

  function cleanActionDetails(action, details) {
    if (!details) return action.toLowerCase().replace("_", " ");
    return details
      .replace("Uploaded file: ", "uploaded ")
      .replace("Created folder: ", "created folder ")
      .replace("Soft-deleted file: ", "deleted ")
      .replace("Soft-deleted folder: ", "deleted folder ")
      .replace("Downloaded file: ", "downloaded ")
      .replace("Renamed file ", "renamed ")
      .replace("Renamed folder ", "renamed folder ");
  }

  async function initDashboard() {
    const user = await window.FamDocApp.getUser();
    if (!user) return;

    // Customize greeting
    const welcome = document.getElementById("welcome-message");
    if (welcome) {
      const hours = new Date().getHours();
      let greeting = "Good day";
      if (hours < 12) greeting = "Good morning";
      else if (hours < 17) greeting = "Good afternoon";
      else greeting = "Good evening";
      welcome.textContent = `${greeting}, ${user.username}`;
    }

    // Load and render cache immediately
    const cachedStatsJson = localStorage.getItem("famdoc_cached_stats");
    if (cachedStatsJson) {
      try {
        const cachedStats = JSON.parse(cachedStatsJson);
        renderDashboardStats(cachedStats);
      } catch (e) {
        console.error("Failed to parse cached stats", e);
      }
    }

    // Fetch fresh stats
    try {
      const freshStats = await FamDocAPI.dashboard.getStats();
      localStorage.setItem("famdoc_cached_stats", JSON.stringify(freshStats));
      renderDashboardStats(freshStats);
    } catch (err) {
      console.error("Dashboard failed to load fresh data:", err);
      if (!cachedStatsJson) {
        FamDocAPI.utils.showToast("Failed to retrieve dashboard statistics.", "error");
        
        const statFiles = document.getElementById("stat-files");
        const statSize = document.getElementById("stat-size");
        const statMembers = document.getElementById("stat-members");
        if (statFiles) statFiles.textContent = "—";
        if (statSize) statSize.textContent = "—";
        if (statMembers) statMembers.textContent = "—";

        const recentList = document.getElementById("recent-uploads-list");
        if (recentList) {
          recentList.innerHTML = `
            <div class="empty-state fd-fade-in" style="padding: 2rem 0; color: var(--warning-red);">
              <i class="fas fa-exclamation-triangle state-icon error"></i>
              <h4 class="empty-state-title">Failed to load files</h4>
            </div>
          `;
        }
        const activityFeed = document.getElementById("activity-feed-list");
        if (activityFeed) {
          activityFeed.innerHTML = `
            <div class="empty-state fd-fade-in" style="padding: 2rem 0; color: var(--warning-red);">
              <i class="fas fa-exclamation-triangle state-icon error"></i>
              <h4 class="empty-state-title">Failed to load activity</h4>
            </div>
          `;
        }
      } else {
        FamDocAPI.utils.showToast("Reconnecting... Using cached stats.", "warning");
      }
    }
  }
})();
