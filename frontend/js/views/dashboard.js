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

      <!-- Quick Actions Toolbar -->
      <div class="quick-actions-bar fd-fade-in">
        <input type="file" id="dashboard-file-picker" style="display: none;">
        <button type="button" class="quick-action-btn primary" id="btn-quick-upload">
          <i class="fas fa-cloud-upload-alt"></i>
          <span>Upload File</span>
        </button>
        <a href="#/vault?action=new-folder" class="quick-action-btn" id="btn-quick-folder">
          <i class="fas fa-folder-plus"></i>
          <span>New Folder</span>
        </a>
        <a href="#/profile?invite=true" class="quick-action-btn" id="btn-quick-invite">
          <i class="fas fa-ticket-alt"></i>
          <span>Invite Member</span>
        </a>
        <a href="#/storage" class="quick-action-btn" id="btn-quick-storage">
          <i class="fas fa-hdd"></i>
          <span>Cloud Storage Pool</span>
        </a>
      </div>

      <!-- Dashboard Statistics Grid (4 Cards) -->
      <div class="dashboard-grid">
        <div class="stat-card fd-fade-up fd-stagger" id="card-stat-files" style="--fd-delay: 0.05s;">
          <div class="icon-chip stat-icon"><i class="fas fa-file-alt"></i></div>
          <div class="stat-label">Total Files</div>
          <div class="stat-val" id="stat-files"><span class="fd-skel" style="width: 50px; height: 28px; border-radius: 4px;"></span></div>
        </div>
        <div class="stat-card fd-fade-up fd-stagger" id="card-stat-folders" style="--fd-delay: 0.1s;">
          <div class="icon-chip stat-icon"><i class="fas fa-folder"></i></div>
          <div class="stat-label">Folders</div>
          <div class="stat-val" id="stat-folders"><span class="fd-skel" style="width: 40px; height: 28px; border-radius: 4px;"></span></div>
        </div>
        <div class="stat-card fd-fade-up fd-stagger" id="card-stat-size" style="--fd-delay: 0.15s;">
          <div class="icon-chip stat-icon"><i class="fas fa-database"></i></div>
          <div class="stat-label">Space Occupied</div>
          <div class="stat-val" id="stat-size"><span class="fd-skel" style="width: 90px; height: 28px; border-radius: 4px;"></span></div>
          <div id="dashboard-progress-container" class="stat-card-bottom-progress" style="display: none;">
            <div id="dashboard-progress-bar" class="progress-bar-fill"></div>
          </div>
        </div>
        <div class="stat-card fd-fade-up fd-stagger" id="card-stat-members" style="--fd-delay: 0.2s;">
          <div class="icon-chip stat-icon"><i class="fas fa-users"></i></div>
          <div class="stat-label">Family Members</div>
          <div class="stat-val" id="stat-members"><span class="fd-skel" style="width: 40px; height: 28px; border-radius: 4px;"></span></div>
        </div>
      </div>

      <!-- Storage Category Distribution Card -->
      <div class="storage-breakdown-card fd-fade-up" id="dashboard-storage-card" style="--fd-delay: 0.22s;">
        <div class="breakdown-header">
          <h2 class="breakdown-title">
            <i class="fas fa-chart-pie" style="color: var(--accent-brand);"></i>
            <span>Storage Category Distribution</span>
          </h2>
          <div class="breakdown-subtitle" id="breakdown-pooled-info">Pooled Cloud Storage</div>
        </div>

        <div class="breakdown-progress-container" id="category-progress-container">
          <div id="category-progress-bar" class="progress-bar-fill"></div>
        </div>

        <div class="breakdown-legend-grid" id="breakdown-legend-grid">
          <div class="breakdown-legend-chip">
            <div class="chip-color-dot dot-image"></div>
            <div class="chip-info">
              <span class="chip-label">Images</span>
              <span class="chip-meta" id="meta-cat-image">0 B (0)</span>
            </div>
          </div>
          <div class="breakdown-legend-chip">
            <div class="chip-color-dot dot-pdf"></div>
            <div class="chip-info">
              <span class="chip-label">PDFs</span>
              <span class="chip-meta" id="meta-cat-pdf">0 B (0)</span>
            </div>
          </div>
          <div class="breakdown-legend-chip">
            <div class="chip-color-dot dot-document"></div>
            <div class="chip-info">
              <span class="chip-label">Docs</span>
              <span class="chip-meta" id="meta-cat-document">0 B (0)</span>
            </div>
          </div>
          <div class="breakdown-legend-chip">
            <div class="chip-color-dot dot-sheet"></div>
            <div class="chip-info">
              <span class="chip-label">Sheets</span>
              <span class="chip-meta" id="meta-cat-sheet">0 B (0)</span>
            </div>
          </div>
          <div class="breakdown-legend-chip">
            <div class="chip-color-dot dot-text"></div>
            <div class="chip-info">
              <span class="chip-label">Text</span>
              <span class="chip-meta" id="meta-cat-text">0 B (0)</span>
            </div>
          </div>
          <div class="breakdown-legend-chip">
            <div class="chip-color-dot dot-other"></div>
            <div class="chip-info">
              <span class="chip-label">Other</span>
              <span class="chip-meta" id="meta-cat-other">0 B (0)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Double Sections: Recent Uploads & Activity -->
      <div class="dashboard-sections">
        <!-- Recent Uploads Card -->
        <div class="famdoc-card fd-fade-up" style="--fd-delay: 0.25s;">
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
        <div class="famdoc-card fd-fade-up" style="--fd-delay: 0.3s;">
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

    // Setup interactive click listeners for stat cards
    document.getElementById("card-stat-files")?.addEventListener("click", () => {
      window.FamDocRouter.navigate('/vault');
    });
    
    document.getElementById("card-stat-folders")?.addEventListener("click", () => {
      window.FamDocRouter.navigate('/vault');
    });

    document.getElementById("card-stat-size")?.addEventListener("click", async () => {
      window.FamDocRouter.navigate('/storage');
    });
    
    document.getElementById("card-stat-members")?.addEventListener("click", () => {
      window.FamDocRouter.navigate('/family');
    });

    // Setup Quick Upload File action
    const quickUploadBtn = document.getElementById("btn-quick-upload");
    const quickFilePicker = document.getElementById("dashboard-file-picker");
    if (quickUploadBtn && quickFilePicker) {
      quickUploadBtn.addEventListener("click", () => {
        quickFilePicker.click();
      });

      quickFilePicker.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
          quickUploadBtn.disabled = true;
          quickUploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Uploading...</span>`;
          FamDocAPI.utils.showToast(`Uploading ${file.name}...`, "info");
          
          await FamDocAPI.files.upload(file);
          FamDocAPI.utils.showToast(`Successfully uploaded ${file.name}!`, "success");
          quickFilePicker.value = "";
          initDashboard();
        } catch (err) {
          FamDocAPI.utils.showToast(err.message || "Failed to upload file", "error");
        } finally {
          quickUploadBtn.disabled = false;
          quickUploadBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i><span>Upload File</span>`;
        }
      });
    }

    // Process dashboard initialization
    initDashboard();

    // Register synchronization callback
    if (window.FamDocDataSync) {
      window.FamDocDataSync.register("dashboard", initDashboard);
    }
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
    const statFolders = document.getElementById("stat-folders");
    const statSize = document.getElementById("stat-size");
    const statMembers = document.getElementById("stat-members");

    if (statFiles) statFiles.textContent = stats.total_files;
    if (statFolders) statFolders.textContent = stats.total_folders || 0;
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
        const isGooglePdf = isPdf && file.storage_provider === "google";
        const fallbackIconClass = FamDocAPI.utils.getFileIconClass(file.file_type, file.filename);

        let iconHtml = "";
        if (isImage || isGooglePdf) {
          const cacheKey = isGooglePdf ? ("famdoc-pdf-thumb-" + file.id) : ("famdoc-image-thumb-" + file.id);
          const cachedThumb = localStorage.getItem(cacheKey);
          const previewUrl = FamDocAPI.files.getPreviewUrl(file.id);
          let authenticatedPreviewUrl = "";
          if (file.preview_token) {
            authenticatedPreviewUrl = previewUrl + `?token=${file.preview_token}&thumbnail=true`;
          } else {
            authenticatedPreviewUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          }
          const srcUrl = cachedThumb || authenticatedPreviewUrl;
          const loadedClass = cachedThumb ? "loaded" : "";
          
          iconHtml = `<img class="item-icon item-thumbnail ${loadedClass}" data-file-id="${file.id}" src="${srcUrl}" alt="${FamDocAPI.utils.escapeHtml(file.filename)}" onload="if (this.src.startsWith('data:image/gif;')) return; FamDocAPI.utils.cacheImageThumbnail(this, '${file.id}', ${isGooglePdf});" onerror="if (this.src.startsWith('data:image/gif;')) return; this.onerror=null; this.outerHTML='<i class=\'item-icon ${fallbackIconClass}\'></i>';">`;
        } else if (isPdf) {
          const cachedThumb = localStorage.getItem("famdoc-pdf-thumb-" + file.id);
          if (cachedThumb) {
            iconHtml = `<img class="item-icon item-thumbnail loaded" data-file-id="${file.id}" src="${cachedThumb}" alt="${FamDocAPI.utils.escapeHtml(file.filename)}">`;
          } else {
            iconHtml = `<span class="pdf-thumbnail-container" data-file-id="${file.id}"><i class="item-icon far fa-file-pdf file-pdf"></i></span>`;
          }
        } else {
          iconHtml = `<i class="item-icon ${fallbackIconClass}"></i>`;
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
        } else if (isPdf && !isGooglePdf && !localStorage.getItem("famdoc-pdf-thumb-" + file.id)) {
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
          <i class="fas fa-history state-icon empty"></i>
          <h4 class="empty-state-title">No recent activity</h4>
          <p class="empty-state-text">Your family vault activity log will show up here.</p>
        </div>
      `;
    }
  }

  function cleanActionDetails(action, details) {
    if (!details) {
      if (action.includes("UPLOAD")) return "uploaded a new document.";
      if (action.includes("DELETE")) return "deleted a file.";
      if (action.includes("RENAME")) return "renamed an item.";
      if (action.includes("DOWNLOAD")) return "downloaded a file.";
      if (action.includes("SHARE")) return "generated a shared link.";
      return "performed an action.";
    }
    return FamDocAPI.utils.escapeHtml(details);
  }

  async function initDashboard() {
    try {
      const user = await window.FamDocApp.getUser();
      if (!user) return;

      const welcomeMessage = document.getElementById("welcome-message");
      if (welcomeMessage) {
        const hour = new Date().getHours();
        let greeting = "Good morning";
        if (hour >= 12 && hour < 17) greeting = "Good afternoon";
        else if (hour >= 17) greeting = "Good evening";
        welcomeMessage.textContent = `${greeting}, ${user.username || 'User'}`;
      }

      // Fetch dashboard statistics
      const stats = await FamDocAPI.dashboard.getStats();
      renderDashboardStats(stats);

    } catch (err) {
      console.error("Dashboard initialization error:", err);
      FamDocAPI.utils.showToast("Failed to load dashboard data.", "error");
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
    const categoryProgressBar = document.getElementById("category-progress-bar");
    const pooledInfo = document.getElementById("breakdown-pooled-info");

    const usedBytes = stats.total_size_bytes || 0;
    const quotaBytes = stats.storage_quota_bytes || 524288000;
    const percentUsed = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

    if (pooledInfo) {
      pooledInfo.textContent = `${FamDocAPI.utils.formatBytes(usedBytes)} of ${FamDocAPI.utils.formatBytes(quotaBytes)} used (${percentUsed}%)`;
    }
    
    if (progressContainer && progressBar) {
      if (usedBytes === 0) {
        progressContainer.style.display = "none";
      } else {
        progressContainer.style.display = "flex";
        progressBar.innerHTML = "";
      }
    }

    if (categoryProgressBar) {
      categoryProgressBar.innerHTML = "";
    }
    
    const breakdown = stats.storage_breakdown || {};
    
    const categories = [
      { key: "image", label: "Images", colorClass: "storage-segment-image", metaId: "meta-cat-image" },
      { key: "pdf", label: "PDFs", colorClass: "storage-segment-pdf", metaId: "meta-cat-pdf" },
      { key: "document", label: "Docs", colorClass: "storage-segment-document", metaId: "meta-cat-document" },
      { key: "sheet", label: "Sheets", colorClass: "storage-segment-sheet", metaId: "meta-cat-sheet" },
      { key: "text", label: "Text", colorClass: "storage-segment-text", metaId: "meta-cat-text" },
      { key: "other", label: "Other", colorClass: "storage-segment-other", metaId: "meta-cat-other" }
    ];
    
    let totalAssignedPercent = 0;
    categories.forEach(cat => {
      const data = breakdown[cat.key] || { size: 0, count: 0 };
      const metaElem = document.getElementById(cat.metaId);
      if (metaElem) {
        metaElem.textContent = `${FamDocAPI.utils.formatBytes(data.size)} (${data.count})`;
      }

      if (data.size > 0) {
        let segPercent = (data.size / quotaBytes) * 100;
        if (segPercent > 0 && segPercent < 1) segPercent = 1;
        totalAssignedPercent += segPercent;
        
        // Edge-anchored stat card fill
        if (progressBar) {
          const segment = document.createElement("div");
          segment.className = `storage-progress-segment ${cat.colorClass}`;
          segment.style.width = `${segPercent}%`;
          segment.style.height = "100%";
          segment.title = `${cat.label}: ${FamDocAPI.utils.formatBytes(data.size)} (${data.count} files)`;
          progressBar.appendChild(segment);
        }

        // Dedicated breakdown card multi-color progress bar
        if (categoryProgressBar) {
          const seg = document.createElement("div");
          seg.className = `storage-progress-segment ${cat.colorClass}`;
          seg.style.width = `${segPercent}%`;
          seg.style.height = "100%";
          seg.title = `${cat.label}: ${FamDocAPI.utils.formatBytes(data.size)} (${data.count} files)`;
          categoryProgressBar.appendChild(seg);
        }
      }
    });
    
    const remainingBytes = Math.max(0, quotaBytes - usedBytes);
    if (remainingBytes > 0 && totalAssignedPercent < 100) {
      const remainingPercent = 100 - totalAssignedPercent;
      
      if (progressBar) {
        const segment = document.createElement("div");
        segment.style.width = `${remainingPercent}%`;
        segment.style.height = "100%";
        segment.style.backgroundColor = "transparent";
        segment.title = `Free Space: ${FamDocAPI.utils.formatBytes(remainingBytes)}`;
        progressBar.appendChild(segment);
      }

      if (categoryProgressBar) {
        const seg = document.createElement("div");
        seg.style.width = `${remainingPercent}%`;
        seg.style.height = "100%";
        seg.style.backgroundColor = "transparent";
        seg.title = `Free Space: ${FamDocAPI.utils.formatBytes(remainingBytes)}`;
        categoryProgressBar.appendChild(seg);
      }
    }
  }
})();
