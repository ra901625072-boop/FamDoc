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
          <div id="dashboard-progress-container" class="stat-card-bottom-progress" style="display: none;">
            <div id="dashboard-progress-bar" class="progress-bar-fill"></div>
          </div>
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
          
          <div id="recent-uploads-list" class="items-list scrollable-dashboard-list">
            <!-- Skeleton Loading State -->
            <div class="fd-skel-uploads-placeholder">
              <div class="skel-row">
                <div class="fd-skel fd-skel-circle" style="width: 1.75rem; height: 1.75rem;"></div>
                <div class="item-details" style="flex: 1; display: grid; grid-template-columns: 2fr 1fr 1.2fr; gap: 1rem; align-items: center; width: 100%;">
                  <div class="fd-skel fd-skel-text lg"></div>
                  <div class="fd-skel fd-skel-text md"></div>
                  <div class="fd-skel fd-skel-text sm"></div>
                </div>
              </div>
              <div class="skel-row">
                <div class="fd-skel fd-skel-circle" style="width: 1.75rem; height: 1.75rem;"></div>
                <div class="item-details" style="flex: 1; display: grid; grid-template-columns: 2fr 1fr 1.2fr; gap: 1rem; align-items: center; width: 100%;">
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
          
          <div id="activity-feed-list" class="activity-feed scrollable-dashboard-list">
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

  async function loadPdfThumbnail(fileId, previewToken) {
    try {
      let token = previewToken;
      if (!token) {
        token = await getPreviewToken(fileId);
      }
      if (!token) return;

      const previewUrl = FamDocAPI.files.getPreviewUrl(fileId) + `?token=${token}`;
      
      if (typeof pdfjsLib === "undefined") return;
      
      // Load worker via blob to bypass cross-origin worker restrictions
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        try {
          const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          const res = await fetch(workerUrl);
          const blob = await res.blob();
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } catch (e) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
      }
      
      const loadingTask = pdfjsLib.getDocument(previewUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      // Calculate optimal scale dynamically based on a target width of 120px
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const targetWidth = 120;
      const scale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext).promise;
      
      // Convert to compressed JPEG (quality 0.7) for very small payload sizes (1.5KB - 3KB)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      
      try {
        localStorage.setItem("famdoc-pdf-thumb-" + fileId, dataUrl);
      } catch (e) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("famdoc-pdf-thumb-")) {
            localStorage.removeItem(key);
          }
        }
      }
      
      const containers = document.querySelectorAll(`.pdf-thumbnail-container[data-file-id="${fileId}"]`);
      containers.forEach(container => {
        const img = document.createElement("img");
        img.className = "item-icon item-thumbnail loaded";
        img.setAttribute("data-file-id", fileId);
        img.src = dataUrl;
        img.alt = "PDF Thumbnail";
        container.replaceWith(img);
      });
    } catch (err) {
      console.error("Failed to render PDF thumbnail for file " + fileId, err);
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

    // Render visual storage breakdown
    renderDashboardStorageBreakdown(stats);

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
        const isPdf = ext === "pdf";

        let iconHtml = "";
        if (isImage) {
          const previewUrl = FamDocAPI.files.getPreviewUrl(file.id);
          const authenticatedPreviewUrl = previewUrl + (file.preview_token ? `?token=${file.preview_token}` : "");
          iconHtml = `<img class="item-icon item-thumbnail loaded" data-file-id="${file.id}" src="${authenticatedPreviewUrl}" alt="${FamDocAPI.utils.escapeHtml(file.filename)}" onerror="this.onerror=null; this.outerHTML='<i class=\'item-icon fas fa-file-image file-image\'></i>';">`;
        } else if (isPdf) {
          const cachedThumb = localStorage.getItem("famdoc-pdf-thumb-" + file.id);
          if (cachedThumb) {
            iconHtml = `<img class="item-icon item-thumbnail loaded" data-file-id="${file.id}" src="${cachedThumb}" alt="${FamDocAPI.utils.escapeHtml(file.filename)}">`;
          } else {
            iconHtml = `<span class="pdf-thumbnail-container" data-file-id="${file.id}"><i class="item-icon far fa-file-pdf file-pdf"></i></span>`;
          }
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
        } else if (isPdf && !localStorage.getItem("famdoc-pdf-thumb-" + file.id)) {
          loadPdfThumbnail(file.id, file.preview_token);
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

    // Fetch fresh stats
    try {
      const freshStats = await FamDocAPI.dashboard.getStats();
      renderDashboardStats(freshStats);
    } catch (err) {
      console.error("Dashboard failed to load fresh data:", err);
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
    }
  }

  function renderDashboardStorageBreakdown(stats) {
    const progressContainer = document.getElementById("dashboard-progress-container");
    const progressBar = document.getElementById("dashboard-progress-bar");
    if (!progressContainer || !progressBar) return;
    
    const usedBytes = stats.total_size_bytes || 0;
    const quotaBytes = stats.storage_quota_bytes || 524288000;
    
    if (usedBytes === 0) {
      progressContainer.style.display = "none";
      return;
    }
    
    progressContainer.style.display = "flex";
    progressBar.innerHTML = "";
    
    const breakdown = stats.storage_breakdown || {};
    
    const categories = [
      { key: "image", colorClass: "storage-segment-image" },
      { key: "pdf", colorClass: "storage-segment-pdf" },
      { key: "document", colorClass: "storage-segment-document" },
      { key: "sheet", colorClass: "storage-segment-sheet" },
      { key: "text", colorClass: "storage-segment-text" },
      { key: "other", colorClass: "storage-segment-other" }
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
        segment.style.height = "100%";
        segment.title = `${cat.key.toUpperCase()}: ${FamDocAPI.utils.formatBytes(data.size)} (${data.count} items)`;
        progressBar.appendChild(segment);
      }
    });
    
    const remainingBytes = Math.max(0, quotaBytes - usedBytes);
    if (remainingBytes > 0 && totalAssignedPercent < 100) {
      const remainingPercent = 100 - totalAssignedPercent;
      const segment = document.createElement("div");
      segment.style.width = `${remainingPercent}%`;
      segment.style.height = "100%";
      segment.style.backgroundColor = "transparent";
      segment.title = `Free Space: ${FamDocAPI.utils.formatBytes(remainingBytes)}`;
      progressBar.appendChild(segment);
    }
  }
})();
