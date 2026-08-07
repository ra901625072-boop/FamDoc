/**
 * Vault View Manager (Consolidates files.html)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let currentFolderId = "root";
  let allFolders = [];
  let currentFiles = [];
  let currentView = "grid";
  let activeDropdown = null;
  let activePreviewUrl = null;
  let familyStorageConfig = null;

  const selectedItems = {
    folders: new Set(),
    files: new Set()
  };

  window.FamDocViews.vault = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    // Reset selection state
    selectedItems.folders.clear();
    selectedItems.files.clear();

    // Read URL params from hash
    const hashParts = window.location.hash.split('?');
    const queryParams = new URLSearchParams(hashParts[1] || '');
    const folderParam = queryParams.get("folder_id");
    const previewParam = queryParams.get("preview");

    if (folderParam) {
      currentFolderId = folderParam === "root" ? "root" : parseInt(folderParam);
    } else {
      currentFolderId = "root";
    }

    mount.innerHTML = `
      <div class="content-header fd-fade-in">
        <div>
          <h1 class="page-title">Shared Vault</h1>
          <p class="page-subtitle">Your family's secure document archive.</p>
        </div>
        <div class="toolbar-actions">
          <input type="file" id="file-picker" multiple style="display: none;">
          <button class="btn btn-secondary" id="btn-new-folder">
            <i class="fas fa-folder-plus"></i> New Folder
          </button>
          <button class="btn btn-primary" id="btn-upload-file">
            <i class="fas fa-cloud-upload-alt"></i> Upload File
          </button>
        </div>
      </div>

      <!-- Drag & Drop overlay indicator -->
      <div id="drag-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: var(--overlay-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 1999; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; color: white;">
        <i class="fas fa-cloud-upload-alt" style="font-size: 4rem;"></i>
        <h2 style="font-family: var(--font-serif); font-weight: 800;">Drop Files Anywhere to Upload</h2>
      </div>

      <!-- Upload Progress Widget Overlay -->
      <div id="upload-progress-overlay" class="modal-overlay">
        <div class="famdoc-modal" style="max-width: 400px;">
          <div class="modal-body" style="padding: 2rem; text-align: center;">
            <i class="fas fa-cloud-upload-alt fa-bounce" style="font-size: 3rem; color: var(--accent-brand); margin-bottom: 1.5rem;"></i>
            <h4 style="font-family: var(--font-serif); font-weight: 800; margin-bottom: 0.5rem;" id="upload-file-name">Uploading...</h4>
            <div style="background-color: var(--surface-paper-tint); border-radius: 10px; height: 6px; overflow: hidden; margin: 1rem 0; border: 1px solid var(--border-paper);">
              <div id="upload-progress-bar" style="background: var(--accent-gradient); width: 0%; height: 100%; transition: width 0.2s;"></div>
            </div>
            <div id="upload-percentage" style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: var(--text-ink-muted);">0%</div>
          </div>
        </div>
      </div>

      <!-- Main Browser Surface -->
      <div id="explorer-container" class="explorer-container">
        <div class="browser-toolbar fd-fade-in">
          <div class="browser-breadcrumbs" id="breadcrumbs">
            <span class="breadcrumb-current">Root Vault</span>
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <div class="search-input-wrapper">
              <i class="fas fa-search"></i>
              <input type="text" id="vault-search" class="form-control" placeholder="Search files..." style="padding: 0.5rem 1rem 0.5rem 2.25rem; font-size: 0.85rem; width: 180px;">
            </div>

            <select id="filter-type" class="form-control" style="padding: 0.5rem 1rem; font-size: 0.85rem; width: auto; height: auto;">
              <option value="">All Formats</option>
              <option value="PDF">PDF Documents</option>
              <option value="IMAGE">Images</option>
              <option value="DOCUMENT">Word Docs</option>
              <option value="SHEET">Spreadsheets</option>
              <option value="TEXT">Text Files</option>
            </select>

            <div style="display: flex; border: 1px solid var(--border-paper); border-radius: var(--radius-md); overflow: hidden; background-color: var(--surface-paper-tint);">
              <button class="view-toggle-btn active" id="toggle-grid" style="border: none; padding: 0.5rem 0.75rem; font-size: 0.85rem;" aria-label="Grid View">
                <i class="fas fa-th-large"></i>
              </button>
              <button class="view-toggle-btn" id="toggle-list" style="border: none; padding: 0.5rem 0.75rem; font-size: 0.85rem;" aria-label="List View">
                <i class="fas fa-list"></i>
              </button>
            </div>
            
            <label class="fd-select-checkbox-container" style="margin-left: 0.5rem; margin-right: 0;" title="Select all items in folder">
              <input type="checkbox" id="select-all-checkbox">
              <span class="fd-select-checkmark"></span>
            </label>
          </div>
        </div>

        <div id="items-wrapper" class="items-grid">
          <!-- Skeletons loader block -->
          <div class="fd-skel-vault-item">
            <div class="fd-skel fd-skel-circle" style="width: 3.5rem; height: 3.5rem; margin-bottom: 1rem;"></div>
            <div class="fd-skel fd-skel-text lg" style="margin-bottom: 0.5rem;"></div>
            <div class="fd-skel fd-skel-text sm"></div>
          </div>
        </div>

        <!-- Empty state layout -->
        <div id="explorer-empty" class="empty-state fd-fade-in" style="display: none;">
          <i class="fas fa-folder-open empty-state-icon"></i>
          <h3 class="empty-state-title">This folder is empty</h3>
          <p class="empty-state-text">Drag and drop files here, or click upload to add family records.</p>
        </div>
      </div>

      <!-- Create Folder Dialog -->
      <div id="modal-create-folder" class="modal-overlay">
        <div class="famdoc-modal">
          <div class="modal-header">
            <h3 class="modal-title">Create Folder</h3>
            <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
          </div>
          <form id="form-create-folder">
            <div class="modal-body">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="new-folder-name" class="form-label">Folder Name</label>
                <input type="text" id="new-folder-name" class="form-control" placeholder="e.g. Tax Receipts" required maxlength="50">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Rename Item Dialog -->
      <div id="modal-rename" class="modal-overlay">
        <div class="famdoc-modal">
          <div class="modal-header">
            <h3 class="modal-title">Rename Item</h3>
            <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
          </div>
          <form id="form-rename">
            <input type="hidden" id="rename-item-type">
            <input type="hidden" id="rename-item-id">
            <div class="modal-body">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="rename-input" class="form-label">New Name</label>
                <input type="text" id="rename-input" class="form-control" required maxlength="100">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Rename</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Move Item Dialog -->
      <div id="modal-move" class="modal-overlay">
        <div class="famdoc-modal">
          <div class="modal-header">
            <h3 class="modal-title">Move Item</h3>
            <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
          </div>
          <form id="form-move">
            <input type="hidden" id="move-item-type">
            <input type="hidden" id="move-item-id">
            <div class="modal-body">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="move-dest-select" class="form-label">Destination Folder</label>
                <select id="move-dest-select" class="form-control" required></select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Move Here</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Share Link Dialog -->
      <div id="modal-share" class="modal-overlay">
        <div class="famdoc-modal" style="max-width: 550px;">
          <div class="modal-header">
            <h3 class="modal-title">Share Vault Item</h3>
            <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <h4 id="share-filename" style="font-family: var(--font-serif); margin-bottom: 1.25rem;">File sharing details</h4>
            
            <form id="form-create-share">
              <input type="hidden" id="share-file-id">
              
              <div class="form-group">
                <label for="share-password" class="form-label">Password Protection (Optional)</label>
                <input type="password" id="share-password" class="form-control" placeholder="Choose a strong password" minlength="4" maxlength="50">
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label for="share-expires" class="form-label">Expiration Date (Optional)</label>
                  <input type="datetime-local" id="share-expires" class="form-control">
                </div>
                <div class="form-group">
                  <label for="share-downloads" class="form-label">Max Downloads (Optional)</label>
                  <input type="number" id="share-downloads" class="form-control" min="1" placeholder="e.g. 5">
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
                <i class="fas fa-share-alt"></i>
                <span>Generate Share Link</span>
              </button>
            </form>

            <div style="margin-top: 2rem; border-top: 1px solid var(--border-paper); padding-top: 1.5rem;">
              <h4 style="font-family: var(--font-serif); margin-bottom: 0.75rem;">Active Shared Links</h4>
              <div id="active-shares-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <p style="font-size: 0.85rem; color: var(--text-ink-muted);">No active public links for this file.</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-close-btn">Close</button>
          </div>
        </div>
      </div>

      <!-- Preview modal -->
      <div id="modal-preview" class="modal-overlay">
        <div class="famdoc-modal preview-modal">
          <div class="modal-header">
            <h3 class="modal-title" id="preview-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">Preview</h3>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <a href="#" id="preview-download-btn" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                <i class="fas fa-download"></i>
                <span>Download</span>
              </a>
              <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
            </div>
          </div>
          <div class="preview-body" id="preview-content-area"></div>
        </div>
      </div>

      <!-- Bulk Actions Bar -->
      <div id="bulk-actions-bar" class="bulk-actions-bar">
        <div class="bulk-selected-count">
          <span id="bulk-selected-text">0 items selected</span>
        </div>
        <div class="bulk-action-buttons">
          <button class="btn btn-secondary" id="bulk-clear-btn">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="btn btn-secondary" id="bulk-move-btn">
            <i class="fas fa-arrows-alt"></i> Move
          </button>
          <button class="btn btn-danger" id="bulk-delete-btn" style="background-color: var(--warning-red); color: white; border-color: var(--warning-red);">
            <i class="fas fa-trash-alt"></i> Delete
          </button>
        </div>
      </div>

      <!-- FAB Menu for Mobile -->
      <div class="mobile-fab-container">
        <button class="fab-btn" id="mobile-fab" aria-label="Add new item">
          <i class="fas fa-plus"></i>
        </button>
        <div class="fab-menu" id="fab-menu">
          <button class="fab-menu-item" id="fab-upload-file" title="Upload File" aria-label="Upload File">
            <i class="fas fa-cloud-upload-alt"></i>
            <span>Upload File</span>
          </button>
          <button class="fab-menu-item" id="fab-new-folder" title="New Folder" aria-label="New Folder">
            <i class="fas fa-folder-plus"></i>
            <span>New Folder</span>
          </button>
        </div>
      </div>
    `;

    // 1. Initial State Load
    const savedView = localStorage.getItem("famdoc_view");
    if (savedView) {
      currentView = savedView;
    }
    setView(currentView);

    // 2. Refresh folders/files
    refreshData().then(() => {
      if (previewParam) {
        openPreview(parseInt(previewParam));
      }
    });

    // 3. Register DOM bindings
    setupEvents();
    setupDragAndDrop();
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

  async function downloadFileAuthenticated(fileId, filename) {
    try {
      const file = currentFiles.find(f => f.id === fileId);
      const fileToken = (file && file.preview_token) || await getPreviewToken(fileId);
      let downloadUrl = FamDocAPI.files.getDownloadUrl(fileId);
      if (fileToken) {
        downloadUrl += `?token=${fileToken}`;
      }
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      FamDocAPI.utils.showToast("Failed to initialize secure download: " + err.message, "error");
    }
  }

  async function refreshData() {
    // Render cache first
    const cachedFoldersJson = localStorage.getItem("famdoc_cached_folders");
    const cachedFilesJson = localStorage.getItem("famdoc_cached_files_" + currentFolderId);

    if (cachedFoldersJson) {
      try { allFolders = JSON.parse(cachedFoldersJson); } catch (e) {}
    }
    if (cachedFilesJson) {
      try { currentFiles = JSON.parse(cachedFilesJson); } catch (e) {}
    }

    if (allFolders.length > 0 || currentFiles.length > 0) {
      renderBreadcrumbs();
      renderExplorer();
    }

    // Refresh from server
    try {
      try {
        familyStorageConfig = await FamDocAPI.request("/api/storage/config");
      } catch (storageErr) {
        console.error("Failed to load storage configuration:", storageErr);
      }

      const freshFolders = await FamDocAPI.folders.getFolders();
      const activeDeleteFolderIds = new Set(
        BackgroundManager.queue
          .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-folder")
          .map(op => op.itemId)
      );
      allFolders = freshFolders.filter(f => !activeDeleteFolderIds.has(f.id));
      localStorage.setItem("famdoc_cached_folders", JSON.stringify(allFolders));
      
      const freshFiles = await FamDocAPI.files.getFiles(currentFolderId);
      const activeDeleteFileIds = new Set(
        BackgroundManager.queue
          .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-file")
          .map(op => op.itemId)
      );
      currentFiles = freshFiles.filter(f => !activeDeleteFileIds.has(f.id));
      localStorage.setItem("famdoc_cached_files_" + currentFolderId, JSON.stringify(currentFiles));
      
      renderBreadcrumbs();
      renderExplorer();
    } catch (err) {
      console.error("Failed to load vault items:", err);
      if (allFolders.length === 0 && currentFiles.length === 0) {
        FamDocAPI.utils.showToast("Failed to load vault files.", "error");
        const wrapper = document.getElementById("items-wrapper");
        if (wrapper) wrapper.innerHTML = "";
        const emptyState = document.getElementById("explorer-empty");
        if (emptyState) {
          emptyState.style.display = "flex";
          emptyState.querySelector(".empty-state-title").textContent = "Failed to load files";
          emptyState.querySelector(".empty-state-text").textContent = err.message || "Please reload to try again.";
        }
      } else {
        FamDocAPI.utils.showToast("Reconnecting... Using offline view.", "warning");
      }
    }
  }

  function renderBreadcrumbs() {
    const breadcrumbs = document.getElementById("breadcrumbs");
    if (!breadcrumbs) return;

    breadcrumbs.innerHTML = "";

    const rootSpan = document.createElement("span");
    if (currentFolderId === "root") {
      rootSpan.className = "breadcrumb-current";
      rootSpan.textContent = "Root Vault";
    } else {
      const link = document.createElement("a");
      link.href = "#/vault";
      link.className = "breadcrumb-link";
      link.textContent = "Root Vault";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        navigateToFolder("root");
      });
      rootSpan.appendChild(link);
    }
    breadcrumbs.appendChild(rootSpan);

    if (currentFolderId !== "root") {
      const path = [];
      let curr = allFolders.find(f => f.id === currentFolderId);
      
      while (curr) {
        path.unshift(curr);
        curr = allFolders.find(f => f.id === curr.parent_id);
      }

      path.forEach((folder, idx) => {
        const sep = document.createElement("span");
        sep.className = "breadcrumb-separator";
        sep.innerHTML = '<i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>';
        breadcrumbs.appendChild(sep);

        const folderSpan = document.createElement("span");
        if (idx === path.length - 1) {
          folderSpan.className = "breadcrumb-current";
          folderSpan.textContent = folder.name;
        } else {
          const link = document.createElement("a");
          link.href = `#/vault?folder_id=${folder.id}`;
          link.className = "breadcrumb-link";
          link.textContent = folder.name;
          link.addEventListener("click", (e) => {
            e.preventDefault();
            navigateToFolder(folder.id);
          });
          folderSpan.appendChild(link);
        }
        breadcrumbs.appendChild(folderSpan);
      });
    }
  }

  function navigateToFolder(folderId) {
    window.FamDocRouter.navigate(`/vault?folder_id=${folderId}`);
  }

  function clearSelectionState() {
    selectedItems.folders.clear();
    selectedItems.files.clear();
    updateBulkActionsBar();
    const selectAll = document.getElementById("select-all-checkbox");
    if (selectAll) selectAll.checked = false;
  }

  function toggleItemSelection(id, type, isSelected, cardElement) {
    if (type === "folder") {
      if (isSelected) {
        selectedItems.folders.add(id);
        cardElement.classList.add("selected");
      } else {
        selectedItems.folders.delete(id);
        cardElement.classList.remove("selected");
      }
    } else {
      if (isSelected) {
        selectedItems.files.add(id);
        cardElement.classList.add("selected");
      } else {
        selectedItems.files.delete(id);
        cardElement.classList.remove("selected");
      }
    }
    updateBulkActionsBar();
    updateSelectAllCheckboxState();
  }

  function updateSelectAllCheckboxState() {
    const selectAll = document.getElementById("select-all-checkbox");
    if (!selectAll) return;
    
    const parentFilter = currentFolderId === "root" ? null : currentFolderId;
    
    const pendingDeleteFolderIds = new Set(
      BackgroundManager.queue
        .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-folder")
        .map(op => op.itemId)
    );
    const pendingDeleteFileIds = new Set(
      BackgroundManager.queue
        .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-file")
        .map(op => op.itemId)
    );

    const visibleFolders = allFolders.filter(f => f.parent_id === parentFilter && !pendingDeleteFolderIds.has(f.id));
    const visibleFiles = currentFiles.filter(f => !pendingDeleteFileIds.has(f.id));

    const totalVisible = visibleFolders.length + visibleFiles.length;
    if (totalVisible === 0) {
      selectAll.checked = false;
      return;
    }

    let allSelected = true;
    for (let f of visibleFolders) {
      if (!selectedItems.folders.has(f.id)) {
        allSelected = false;
        break;
      }
    }
    if (allSelected) {
      for (let f of visibleFiles) {
        if (!selectedItems.files.has(f.id)) {
          allSelected = false;
          break;
        }
      }
    }

    selectAll.checked = allSelected;
  }

  function updateBulkActionsBar() {
    const bar = document.getElementById("bulk-actions-bar");
    const text = document.getElementById("bulk-selected-text");
    if (!bar || !text) return;

    const count = selectedItems.folders.size + selectedItems.files.size;

    if (count > 0) {
      text.textContent = `${count} item${count > 1 ? 's' : ''} selected`;
      bar.classList.add("show");
    } else {
      bar.classList.remove("show");
    }
  }

  function renderExplorer() {
    const wrapper = document.getElementById("items-wrapper");
    const emptyState = document.getElementById("explorer-empty");
    if (!wrapper || !emptyState) return;

    wrapper.innerHTML = "";
    
    const parentFilter = currentFolderId === "root" ? null : currentFolderId;

    const pendingDeleteFolderIds = new Set(
      BackgroundManager.queue
        .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-folder")
        .map(op => op.itemId)
    );
    const pendingDeleteFileIds = new Set(
      BackgroundManager.queue
        .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-file")
        .map(op => op.itemId)
    );
    
    const subFolders = allFolders.filter(f => f.parent_id === parentFilter && !pendingDeleteFolderIds.has(f.id));
    const activeFiles = currentFiles.filter(f => !pendingDeleteFileIds.has(f.id));

    if (subFolders.length === 0 && activeFiles.length === 0) {
      wrapper.style.display = "none";
      emptyState.style.display = "flex";
      return;
    }

    wrapper.style.display = currentView === "grid" ? "grid" : "flex";
    emptyState.style.display = "none";

    const currentUser = JSON.parse(localStorage.getItem("famdoc_user")) || {};

    // 1. Subfolders
    subFolders.forEach((folder, index) => {
      const folderCard = document.createElement("div");
      const delay = Math.min(index * 0.05, 0.5);
      folderCard.className = "vault-item fd-fade-up fd-stagger" + (selectedItems.folders.has(folder.id) ? " selected" : "");
      folderCard.style.setProperty("--fd-delay", `${delay}s`);
      folderCard.setAttribute("data-item-id", folder.id);
      folderCard.setAttribute("data-item-type", "folder");
      
      folderCard.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]") || e.target.closest(".dropdown-menu") || e.target.closest(".fd-select-checkbox-container")) {
          return;
        }
        navigateToFolder(folder.id);
      });

      const isList = currentView === "list";
      const detailsHtml = isList 
        ? `
          <div class="item-details">
            <div class="item-name" title="${FamDocAPI.utils.escapeHtml(folder.name)}">${FamDocAPI.utils.escapeHtml(folder.name)}</div>
            <div class="item-meta-size">${folder.file_count} files</div>
            <div class="item-meta-date">${FamDocAPI.utils.formatDate(folder.last_modified).split(',')[0]}</div>
            <div class="item-meta-uploader">—</div>
          </div>
        `
        : `
          <div class="item-details">
            <div class="item-name" title="${FamDocAPI.utils.escapeHtml(folder.name)}">${FamDocAPI.utils.escapeHtml(folder.name)}</div>
            <div class="item-meta">${folder.file_count} files</div>
          </div>
        `;

      if (isList) {
        folderCard.innerHTML = `
          <label class="fd-select-checkbox-container" style="margin-left: 0.5rem; margin-right: 0;">
            <input type="checkbox" class="item-select-checkbox" data-id="${folder.id}" data-type="folder" ${selectedItems.folders.has(folder.id) ? 'checked' : ''}>
            <span class="fd-select-checkmark"></span>
          </label>
          <i class="item-icon folder fas fa-folder"></i>
          ${detailsHtml}
          <button class="item-actions-trigger" data-action="toggle-dropdown" aria-label="Actions Menu">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item" data-action="rename-folder" data-id="${folder.id}">
              <i class="fas fa-edit"></i> Rename
            </button>
            <button class="dropdown-item" data-action="move-folder" data-id="${folder.id}">
              <i class="fas fa-arrows-alt"></i> Move
            </button>
            <button class="dropdown-item danger" data-action="delete-folder" data-id="${folder.id}">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        `;
      } else {
        folderCard.innerHTML = `
          <label class="fd-select-checkbox-container">
            <input type="checkbox" class="item-select-checkbox" data-id="${folder.id}" data-type="folder" ${selectedItems.folders.has(folder.id) ? 'checked' : ''}>
            <span class="fd-select-checkmark"></span>
          </label>
          <div class="item-preview-area">
            <i class="item-icon folder fas fa-folder"></i>
          </div>
          <div class="item-footer">
            ${detailsHtml}
            <button class="item-actions-trigger" data-action="toggle-dropdown" aria-label="Actions Menu">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-menu">
              <button class="dropdown-item" data-action="rename-folder" data-id="${folder.id}">
                <i class="fas fa-edit"></i> Rename
              </button>
              <button class="dropdown-item" data-action="move-folder" data-id="${folder.id}">
                <i class="fas fa-arrows-alt"></i> Move
              </button>
              <button class="dropdown-item danger" data-action="delete-folder" data-id="${folder.id}">
                <i class="fas fa-trash-alt"></i> Delete
              </button>
            </div>
          </div>
        `;
      }

      const label = folderCard.querySelector(".fd-select-checkbox-container");
      label.addEventListener("click", (e) => e.stopPropagation());
      const checkbox = folderCard.querySelector(".item-select-checkbox");
      checkbox.addEventListener("change", () => {
        toggleItemSelection(folder.id, "folder", checkbox.checked, folderCard);
      });

      wrapper.appendChild(folderCard);
    });

    // 2. Files
    activeFiles.forEach((file, index) => {
      const fileCard = document.createElement("div");
      const delay = Math.min((subFolders.length + index) * 0.05, 0.5);
      fileCard.className = "vault-item fd-fade-up fd-stagger" + (selectedItems.files.has(file.id) ? " selected" : "");
      fileCard.style.setProperty("--fd-delay", `${delay}s`);
      fileCard.setAttribute("data-item-id", file.id);
      fileCard.setAttribute("data-item-type", "file");
      
      fileCard.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]") || e.target.closest(".dropdown-menu") || e.target.closest(".fd-select-checkbox-container")) {
          return;
        }
        openPreview(file.id);
      });

      const ext = file.filename.split(".").pop().toLowerCase();
      const mime = file.file_type ? file.file_type.toLowerCase() : "";
      const isImage = mime.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

      let iconHtml = "";
      if (isImage) {
        const previewUrl = FamDocAPI.files.getPreviewUrl(file.id);
        const authenticatedPreviewUrl = previewUrl + (file.preview_token ? `?token=${file.preview_token}` : "");
        iconHtml = `<img class="item-icon item-thumbnail loaded" data-file-id="${file.id}" src="${authenticatedPreviewUrl}" alt="${FamDocAPI.utils.escapeHtml(file.filename)}">`;
      } else {
        const iconClass = FamDocAPI.utils.getFileIconClass(file.file_type, file.filename);
        iconHtml = `<i class="item-icon ${iconClass}"></i>`;
      }

      const formattedSize = FamDocAPI.utils.formatBytes(file.size_bytes);
      const formattedDate = FamDocAPI.utils.formatDate(file.upload_date);
      const canManage = currentUser.role === "admin" || file.uploader_id === currentUser.id;

      const isList = currentView === "list";
      const isSyncing = familyStorageConfig && 
                        familyStorageConfig.storage_provider && 
                        familyStorageConfig.storage_provider !== "local" && 
                        file.storage_provider === "local";
      const syncBadge = isSyncing ? '<span class="badge-syncing" title="Syncing to cloud storage in background"><i class="fas fa-sync fa-spin"></i> Syncing</span>' : '';
      const shareIcon = file.is_shared ? '<i class="fas fa-share-alt" style="color: var(--accent-brand); margin-left: 0.5rem;" title="Shared publicly"></i>' : '';

      const detailsHtml = isList 
        ? `
          <div class="item-details">
            <div class="item-name" title="${FamDocAPI.utils.escapeHtml(file.filename)}">${FamDocAPI.utils.escapeHtml(file.filename)}${shareIcon}${syncBadge}</div>
            <div class="item-meta-size">${formattedSize}</div>
            <div class="item-meta-date">${formattedDate.split(',')[0]}</div>
            <div class="item-meta-uploader" title="${file.uploader_email || 'System'}">${file.uploader_email ? file.uploader_email.split('@')[0] : 'System'}</div>
          </div>
        `
        : `
          <div class="item-details">
            <div class="item-name" title="${FamDocAPI.utils.escapeHtml(file.filename)}">${FamDocAPI.utils.escapeHtml(file.filename)}${shareIcon}${syncBadge}</div>
            <div class="item-meta">${formattedSize}</div>
          </div>
        `;

      if (isList) {
        fileCard.innerHTML = `
          <label class="fd-select-checkbox-container" style="margin-left: 0.5rem; margin-right: 0;">
            <input type="checkbox" class="item-select-checkbox" data-id="${file.id}" data-type="file" ${selectedItems.files.has(file.id) ? 'checked' : ''}>
            <span class="fd-select-checkmark"></span>
          </label>
          ${iconHtml}
          ${detailsHtml}
          <button class="item-actions-trigger" data-action="toggle-dropdown" aria-label="Actions Menu">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item" data-action="download-file" data-id="${file.id}">
              <i class="fas fa-download"></i> Download
            </button>
            <button class="dropdown-item" data-action="share-file" data-id="${file.id}">
              <i class="fas fa-share-alt"></i> Share Link
            </button>
             ${canManage ? `
              <button class="dropdown-item" data-action="rename-file" data-id="${file.id}">
                <i class="fas fa-edit"></i> Rename
              </button>
              <button class="dropdown-item" data-action="move-file" data-id="${file.id}">
                <i class="fas fa-arrows-alt"></i> Move
              </button>
              <button class="dropdown-item danger" data-action="delete-file" data-id="${file.id}">
                <i class="fas fa-trash-alt"></i> Delete
              </button>
            ` : ""}
          </div>
        `;
      } else {
        fileCard.innerHTML = `
          <label class="fd-select-checkbox-container">
            <input type="checkbox" class="item-select-checkbox" data-id="${file.id}" data-type="file" ${selectedItems.files.has(file.id) ? 'checked' : ''}>
            <span class="fd-select-checkmark"></span>
          </label>
          <div class="item-preview-area">
            ${iconHtml}
          </div>
          <div class="item-footer">
            ${detailsHtml}
            <button class="item-actions-trigger" data-action="toggle-dropdown" aria-label="Actions Menu">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-menu">
              <button class="dropdown-item" data-action="download-file" data-id="${file.id}">
                <i class="fas fa-download"></i> Download
              </button>
              <button class="dropdown-item" data-action="share-file" data-id="${file.id}">
                <i class="fas fa-share-alt"></i> Share Link
              </button>
               ${canManage ? `
                <button class="dropdown-item" data-action="rename-file" data-id="${file.id}">
                  <i class="fas fa-edit"></i> Rename
                </button>
                <button class="dropdown-item" data-action="move-file" data-id="${file.id}">
                  <i class="fas fa-arrows-alt"></i> Move
                </button>
                <button class="dropdown-item danger" data-action="delete-file" data-id="${file.id}">
                  <i class="fas fa-trash-alt"></i> Delete
                </button>
              ` : ""}
            </div>
          </div>
        `;
      }

      const label = fileCard.querySelector(".fd-select-checkbox-container");
      label.addEventListener("click", (e) => e.stopPropagation());
      const checkbox = fileCard.querySelector(".item-select-checkbox");
      checkbox.addEventListener("change", () => {
        toggleItemSelection(file.id, "file", checkbox.checked, fileCard);
      });

      wrapper.appendChild(fileCard);

      // Async fetch image thumbnails if missing token
      if (isImage && !file.preview_token) {
        loadThumbnail(file.id);
      }
    });
  }

  async function loadThumbnail(fileId) {
    const fileToken = await getPreviewToken(fileId);
    if (!fileToken) return;
    const previewUrl = FamDocAPI.files.getPreviewUrl(fileId) + `?token=${fileToken}`;
    const imgs = document.querySelectorAll(`img[data-file-id="${fileId}"]`);
    imgs.forEach(img => { img.src = previewUrl; });
  }

  function setView(view) {
    currentView = view;
    localStorage.setItem("famdoc_view", view);

    const gridBtn = document.getElementById("toggle-grid");
    const listBtn = document.getElementById("toggle-list");
    const wrapper = document.getElementById("items-wrapper");
    if (!gridBtn || !listBtn || !wrapper) return;

    if (view === "grid") {
      gridBtn.classList.add("active");
      listBtn.classList.remove("active");
      wrapper.className = "items-grid";
    } else {
      gridBtn.classList.remove("active");
      listBtn.classList.add("active");
      wrapper.className = "items-list";
    }
    renderExplorer();
  }

  function toggleDropdown(button) {
    const menu = button.nextElementSibling;
    const card = button.closest(".vault-item");
    if (!menu || !card) return;
    
    if (activeDropdown && activeDropdown !== menu) {
      activeDropdown.classList.remove("show");
      const activeCard = activeDropdown.closest(".vault-item");
      if (activeCard) activeCard.classList.remove("dropdown-open");
    }

    menu.classList.toggle("show");
    if (menu.classList.contains("show")) {
      card.classList.add("dropdown-open");
    } else {
      card.classList.remove("dropdown-open");
    }
    activeDropdown = menu.classList.contains("show") ? menu : null;

    const dismissDropdown = (e) => {
      if (!button.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove("show");
        card.classList.remove("dropdown-open");
        document.removeEventListener("click", dismissDropdown);
        if (activeDropdown === menu) activeDropdown = null;
      }
    };
    
    if (menu.classList.contains("show")) {
      document.addEventListener("click", dismissDropdown);
    }
  }

  async function deleteFolder(id, name) {
    const element = document.querySelector(`.vault-item[data-item-id="${id}"][data-item-type="folder"]`);
    if (element) element.classList.add("deleting");
    
    setTimeout(() => {
      const idx = allFolders.findIndex(f => f.id === id);
      if (idx === -1) return;
      const deletedFolder = allFolders[idx];

      allFolders.splice(idx, 1);
      localStorage.setItem("famdoc_cached_folders", JSON.stringify(allFolders));

      BackgroundManager.addOperation({
        type: "delete-folder",
        itemId: id,
        name: name,
        onExecute: async () => { await FamDocAPI.folders.delete(id); },
        onUndo: () => {
          if (!allFolders.some(f => f.id === id)) {
            allFolders.splice(idx, 0, deletedFolder);
            localStorage.setItem("famdoc_cached_folders", JSON.stringify(allFolders));
            renderExplorer();
          }
        }
      });

      renderExplorer();
    }, 300);
  }

  async function deleteFile(id, name) {
    const element = document.querySelector(`.vault-item[data-item-id="${id}"][data-item-type="file"]`);
    if (element) element.classList.add("deleting");
    
    setTimeout(() => {
      const idx = currentFiles.findIndex(f => f.id === id);
      if (idx === -1) return;
      const deletedFile = currentFiles[idx];

      currentFiles.splice(idx, 1);
      localStorage.setItem("famdoc_cached_files_" + currentFolderId, JSON.stringify(currentFiles));

      BackgroundManager.addOperation({
        type: "delete-file",
        itemId: id,
        name: name,
        onExecute: async () => { await FamDocAPI.files.delete(id); },
        onUndo: () => {
          if (!currentFiles.some(f => f.id === id)) {
            currentFiles.splice(idx, 0, deletedFile);
            localStorage.setItem("famdoc_cached_files_" + currentFolderId, JSON.stringify(currentFiles));
            renderExplorer();
          }
        }
      });

      renderExplorer();
    }, 300);
  }

  function triggerRename(type, id, name) {
    document.getElementById("rename-item-type").value = type;
    document.getElementById("rename-item-id").value = id;
    const input = document.getElementById("rename-input");
    input.value = name;
    openModal("modal-rename");
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
  }

  function triggerBulkMove() {
    document.getElementById("move-item-type").value = "bulk";
    document.getElementById("move-item-id").value = "bulk";
    
    const select = document.getElementById("move-dest-select");
    select.innerHTML = "";
    
    const rootOpt = document.createElement("option");
    rootOpt.value = "root";
    rootOpt.textContent = "Root Folder ( / )";
    select.appendChild(rootOpt);
    
    function getFolderPath(folderId) {
      let path = [];
      let currId = folderId;
      while (currId) {
        const f = allFolders.find(x => x.id === currId);
        if (!f) break;
        path.unshift(f.name);
        currId = f.parent_id;
      }
      return "/" + path.join("/");
    }
    
    const invalidFolderIds = new Set();
    selectedItems.folders.forEach(id => { invalidFolderIds.add(id); });
    
    let changed = true;
    while (changed) {
      changed = false;
      allFolders.forEach(f => {
        if (f.parent_id && invalidFolderIds.has(f.parent_id) && !invalidFolderIds.has(f.id)) {
          invalidFolderIds.add(f.id);
          changed = true;
        }
      });
    }
    
    allFolders.forEach(folder => {
      if (invalidFolderIds.has(folder.id)) return;
      const opt = document.createElement("option");
      opt.value = folder.id;
      opt.textContent = getFolderPath(folder.id);
      select.appendChild(opt);
    });
    
    openModal("modal-move");
  }

  function triggerMove(type, id, currentName) {
    document.getElementById("move-item-type").value = type;
    document.getElementById("move-item-id").value = id;
    
    const select = document.getElementById("move-dest-select");
    select.innerHTML = "";
    
    const rootOpt = document.createElement("option");
    rootOpt.value = "root";
    rootOpt.textContent = "Root Folder ( / )";
    select.appendChild(rootOpt);
    
    function getFolderPath(folderId) {
      let path = [];
      let currId = folderId;
      while (currId) {
        const f = allFolders.find(x => x.id === currId);
        if (!f) break;
        path.unshift(f.name);
        currId = f.parent_id;
      }
      return "/" + path.join("/");
    }
    
    const invalidFolderIds = new Set();
    if (type === "folder") {
      invalidFolderIds.add(id);
      let changed = true;
      while (changed) {
        changed = false;
        allFolders.forEach(f => {
          if (f.parent_id && invalidFolderIds.has(f.parent_id) && !invalidFolderIds.has(f.id)) {
            invalidFolderIds.add(f.id);
            changed = true;
          }
        });
      }
    }
    
    allFolders.forEach(folder => {
      if (invalidFolderIds.has(folder.id)) return;
      
      if (type === "folder") {
        const currentFolder = allFolders.find(x => x.id === id);
        if (currentFolder && currentFolder.parent_id === folder.id) return;
        if (currentFolder && !currentFolder.parent_id && folder.id === "root") return;
      } else if (type === "file") {
        const currentFile = currentFiles.find(x => x.id === id);
        if (currentFile && currentFile.folder_id === folder.id) return;
        if (currentFile && currentFile.folder_id === null && folder.id === "root") return;
      }
      
      const opt = document.createElement("option");
      opt.value = folder.id;
      opt.textContent = getFolderPath(folder.id);
      select.appendChild(opt);
    });
    
    openModal("modal-move");
  }

  async function triggerShare(fileId, filename) {
    document.getElementById("share-file-id").value = fileId;
    document.getElementById("share-filename").textContent = filename;
    
    document.getElementById("share-password").value = "";
    document.getElementById("share-expires").value = "";
    document.getElementById("share-downloads").value = "";

    await refreshShareLinks(fileId);
    openModal("modal-share");
  }

  async function refreshShareLinks(fileId) {
    const container = document.getElementById("active-shares-list");
    if (!container) return;
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-ink-muted);">Loading links...</p>`;

    try {
      const links = await FamDocAPI.sharing.getLinks(fileId);
      if (links.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-ink-muted);">No active public links for this file.</p>`;
        return;
      }

      container.innerHTML = "";
      links.forEach(link => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "space-between";
        div.style.backgroundColor = "var(--bg-linen)";
        div.style.padding = "0.75rem";
        div.style.borderRadius = "var(--radius-md)";
        div.style.border = "1px solid var(--border-paper)";
        div.style.fontSize = "0.85rem";

        const metaItems = [];
        if (link.is_password_protected) metaItems.push('<i class="fas fa-lock" title="Password protected"></i>');
        if (link.expires_at) metaItems.push(`Expires: ${FamDocAPI.utils.formatDate(link.expires_at).split(',')[0]}`);
        if (link.max_downloads) metaItems.push(`Dl: ${link.download_count}/${link.max_downloads}`);
        else metaItems.push(`Dl: ${link.download_count}`);

        const metaText = metaItems.length > 0 ? ` · <span style="font-size: 0.75rem; color: var(--text-ink-muted);">${metaItems.join(" · ")}</span>` : "";

        div.innerHTML = `
          <div style="flex: 1; overflow: hidden; padding-right: 0.5rem;">
            <a href="${link.share_link}" target="_blank" style="font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all;">${link.share_link}</a>
            <div>${metaText}</div>
          </div>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${link.share_link}'); FamDocAPI.utils.showToast('Copied to clipboard', 'success');" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              <i class="far fa-copy"></i>
            </button>
            <button class="btn btn-danger" onclick="window.revokeShareLink('${link.token}', ${fileId})" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              <i class="fas fa-unlink"></i>
            </button>
          </div>
        `;
        container.appendChild(div);
      });
    } catch (err) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--warning-red);">Failed to load active links.</p>`;
    }
  }

  // Exposed globally on window because of dynamic HTML generation
  window.revokeShareLink = async function(token, fileId) {
    if (confirm("Revoke this link? Anyone using it will immediately lose access to this file.")) {
      try {
        await FamDocAPI.sharing.revokeLink(token);
        FamDocAPI.utils.showToast("Link revoked successfully.", "success");
        await refreshShareLinks(fileId);
        refreshData();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    }
  };

  async function openPreview(fileId) {
    let file = currentFiles.find(f => f.id === fileId);
    if (!file) {
      try {
        const allActiveFiles = await FamDocAPI.search.search({});
        file = allActiveFiles.find(f => f.id === fileId);
        if (file) {
          const targetFolderId = file.folder_id === null ? "root" : file.folder_id;
          currentFolderId = targetFolderId;
          await refreshData();
        } else {
          FamDocAPI.utils.showToast("File not found or access denied.", "error");
          return;
        }
      } catch (err) {
        console.error("Failed to find file for auto-preview:", err);
        return;
      }
    }

    document.getElementById("preview-title").textContent = file.filename;
    
    const downloadBtn = document.getElementById("preview-download-btn");
    downloadBtn.onclick = (e) => {
      e.preventDefault();
      downloadFileAuthenticated(file.id, file.filename);
    };

    const contentArea = document.getElementById("preview-content-area");
    contentArea.innerHTML = `<i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--accent-brand);"></i>`;
    
    openModal("modal-preview");

    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
      activePreviewUrl = null;
    }

    const previewUrl = FamDocAPI.files.getPreviewUrl(fileId);
    const mime = file.file_type.toLowerCase();
    const ext = file.filename.split(".").pop().toLowerCase();

    try {
      if (mime.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
        const fileToken = await getPreviewToken(fileId);
        const authenticatedPreviewUrl = previewUrl + (fileToken ? `?token=${fileToken}` : "");
        contentArea.innerHTML = `<img src="${authenticatedPreviewUrl}" class="preview-image" alt="${FamDocAPI.utils.escapeHtml(file.filename)}">`;
      } else if (mime.includes("pdf") || ext === "pdf") {
        const fileToken = await getPreviewToken(fileId);
        const authenticatedPreviewUrl = previewUrl + (fileToken ? `?token=${fileToken}` : "");
        contentArea.innerHTML = `<iframe src="${authenticatedPreviewUrl}" class="preview-frame"></iframe>`;
      } else if (mime.includes("text") || ["txt", "log", "json", "md", "csv"].includes(ext)) {
        const token = localStorage.getItem("famdoc_token");
        const res = await fetch(previewUrl, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error("Failed to load text preview");
        const text = await res.text();
        const pre = document.createElement("pre");
        pre.className = "preview-text";
        pre.textContent = text;
        contentArea.innerHTML = "";
        contentArea.appendChild(pre);
      } else {
        contentArea.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-file-signature state-icon empty"></i>
            <h4 class="empty-state-title">No Preview Available</h4>
            <p class="empty-state-text" style="margin-bottom: 1rem;">FamDoc doesn't support inline previews for ${ext.toUpperCase()} files.</p>
            <button id="preview-fallback-download" class="btn btn-primary">
              <i class="fas fa-download"></i> Download File
            </button>
          </div>
        `;
        document.getElementById("preview-fallback-download").onclick = () => {
          downloadFileAuthenticated(file.id, file.filename);
        };
      }
    } catch (err) {
      contentArea.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle state-icon error"></i>
          <h4 class="empty-state-title">Preview Failed</h4>
          <p class="empty-state-text">Failed to fetch the file contents for preview from storage.</p>
        </div>
      `;
    }
  }

  function openModal(modalId) {
    document.getElementById(modalId).classList.add("show");
  }

  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("show");
  }

  function setupEvents() {
    // View Toggle Toggles
    document.getElementById("toggle-grid").addEventListener("click", () => setView("grid"));
    document.getElementById("toggle-list").addEventListener("click", () => setView("list"));

    // Select All
    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        const isChecked = selectAllCheckbox.checked;
        const parentFilter = currentFolderId === "root" ? null : currentFolderId;

        const pendingDeleteFolderIds = new Set(
          BackgroundManager.queue
            .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-folder")
            .map(op => op.itemId)
        );
        const pendingDeleteFileIds = new Set(
          BackgroundManager.queue
            .filter(op => (op.status === "pending" || op.status === "running" || op.status === "completed") && op.type === "delete-file")
            .map(op => op.itemId)
        );

        const visibleFolders = allFolders.filter(f => f.parent_id === parentFilter && !pendingDeleteFolderIds.has(f.id));
        const visibleFiles = currentFiles.filter(f => !pendingDeleteFileIds.has(f.id));

        if (isChecked) {
          visibleFolders.forEach(f => selectedItems.folders.add(f.id));
          visibleFiles.forEach(f => selectedItems.files.add(f.id));
        } else {
          visibleFolders.forEach(f => selectedItems.folders.delete(f.id));
          visibleFiles.forEach(f => selectedItems.files.delete(f.id));
        }

        renderExplorer();
        updateBulkActionsBar();
      });
    }

    // Bulk Cancel
    document.getElementById("bulk-clear-btn").addEventListener("click", () => {
      clearSelectionState();
      renderExplorer();
    });

    // Bulk Delete
    document.getElementById("bulk-delete-btn").addEventListener("click", () => {
      const count = selectedItems.folders.size + selectedItems.files.size;
      if (count === 0) return;

      if (confirm(`Move ${count} selected item${count > 1 ? 's' : ''} to the Recycle Bin?`)) {
        const foldersToDelete = Array.from(selectedItems.folders);
        const filesToDelete = Array.from(selectedItems.files);

        clearSelectionState();

        foldersToDelete.forEach(folderId => {
          const folder = allFolders.find(f => f.id === folderId);
          deleteFolder(folderId, folder ? folder.name : `Folder #${folderId}`);
        });

        filesToDelete.forEach(fileId => {
          const file = currentFiles.find(f => f.id === fileId);
          deleteFile(fileId, file ? file.filename : `File #${fileId}`);
        });

        FamDocAPI.utils.showToast(`${count} items are being deleted.`, "success");
      }
    });

    // Bulk Move
    document.getElementById("bulk-move-btn").addEventListener("click", () => {
      if (selectedItems.folders.size + selectedItems.files.size === 0) return;
      triggerBulkMove();
    });

    // Dropdown triggers click delegator
    const wrapper = document.getElementById("items-wrapper");
    wrapper.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;

      e.stopPropagation();
      const action = actionBtn.getAttribute("data-action");
      const id = parseInt(actionBtn.getAttribute("data-id"));

      if (action === "toggle-dropdown") {
        toggleDropdown(actionBtn);
      } else if (action === "rename-folder") {
        const folder = allFolders.find(f => f.id === id);
        if (folder) triggerRename("folder", folder.id, folder.name);
      } else if (action === "move-folder") {
        const folder = allFolders.find(f => f.id === id);
        if (folder) triggerMove("folder", folder.id, folder.name);
      } else if (action === "delete-folder") {
        const folder = allFolders.find(f => f.id === id);
        if (folder) deleteFolder(folder.id, folder.name);
      } else if (action === "download-file") {
        const file = currentFiles.find(f => f.id === id);
        if (file) downloadFileAuthenticated(file.id, file.filename);
      } else if (action === "share-file") {
        const file = currentFiles.find(f => f.id === id);
        if (file) triggerShare(file.id, file.filename);
      } else if (action === "rename-file") {
        const file = currentFiles.find(f => f.id === id);
        if (file) triggerRename("file", file.id, file.filename);
      } else if (action === "move-file") {
        const file = currentFiles.find(f => f.id === id);
        if (file) triggerMove("file", file.id, file.filename);
      } else if (action === "delete-file") {
        const file = currentFiles.find(f => f.id === id);
        if (file) deleteFile(file.id, file.filename);
      }
    });

    // Folder trigger modal
    document.getElementById("btn-new-folder").addEventListener("click", () => {
      document.getElementById("new-folder-name").value = "";
      openModal("modal-create-folder");
      setTimeout(() => {
        document.getElementById("new-folder-name").focus();
      }, 100);
    });

    // Close buttons
    document.querySelectorAll(".modal-close, .modal-close-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const overlay = e.target.closest(".modal-overlay");
        if (overlay) {
          overlay.classList.remove("show");
          if (overlay.id === "modal-preview" && activePreviewUrl) {
            URL.revokeObjectURL(activePreviewUrl);
            activePreviewUrl = null;
          }
        }
      });
    });

    // Create Folder Submit
    document.getElementById("form-create-folder").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("new-folder-name");
      const name = nameInput.value.trim();
      if (!name) return;

      try {
        const parentId = currentFolderId === "root" ? null : currentFolderId;
        await FamDocAPI.folders.create(name, parentId);
        closeModal("modal-create-folder");
        FamDocAPI.utils.showToast(`Folder "${name}" created successfully.`, "success");
        refreshData();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    });

    // Rename Submit
    document.getElementById("form-rename").addEventListener("submit", async (e) => {
      e.preventDefault();
      const type = document.getElementById("rename-item-type").value;
      const id = parseInt(document.getElementById("rename-item-id").value);
      const name = document.getElementById("rename-input").value.trim();
      if (!name) return;

      try {
        if (type === "folder") {
          await FamDocAPI.folders.rename(id, name);
        } else {
          await FamDocAPI.files.rename(id, name);
        }
        closeModal("modal-rename");
        FamDocAPI.utils.showToast(`Item renamed to "${name}".`, "success");
        refreshData();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    });

    // Move Submit
    document.getElementById("form-move").addEventListener("submit", async (e) => {
      e.preventDefault();
      const type = document.getElementById("move-item-type").value;
      const idVal = document.getElementById("move-item-id").value;
      const destVal = document.getElementById("move-dest-select").value;
      const destFolderId = destVal === "root" ? null : parseInt(destVal);

      try {
        if (type === "bulk" || idVal === "bulk") {
          const foldersToMove = Array.from(selectedItems.folders);
          const filesToMove = Array.from(selectedItems.files);
          const count = foldersToMove.length + filesToMove.length;

          clearSelectionState();

          for (let folderId of foldersToMove) {
            await FamDocAPI.folders.move(folderId, destFolderId);
          }
          for (let fileId of filesToMove) {
            await FamDocAPI.files.move(fileId, destFolderId);
          }

          closeModal("modal-move");
          FamDocAPI.utils.showToast(`${count} items moved successfully.`, "success");
          refreshData();
        } else {
          const id = parseInt(idVal);
          if (type === "folder") {
            await FamDocAPI.folders.move(id, destFolderId);
          } else {
            await FamDocAPI.files.move(id, destFolderId);
          }
          closeModal("modal-move");
          FamDocAPI.utils.showToast("Item moved successfully.", "success");
          refreshData();
        }
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    });

    // Share link submit
    document.getElementById("form-create-share").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileId = parseInt(document.getElementById("share-file-id").value);
      const password = document.getElementById("share-password").value || null;
      const expiresVal = document.getElementById("share-expires").value;
      const downloadsVal = document.getElementById("share-downloads").value;

      const expiresAt = expiresVal ? new Date(expiresVal).toISOString() : null;
      const maxDownloads = downloadsVal ? parseInt(downloadsVal) : null;

      try {
        await FamDocAPI.sharing.createLink(fileId, password, expiresAt, maxDownloads);
        FamDocAPI.utils.showToast("Public shared link created!", "success");
        await refreshShareLinks(fileId);
        refreshData();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    });

    // File uploads picker
    const filePicker = document.getElementById("file-picker");
    document.getElementById("btn-upload-file").addEventListener("click", () => {
      filePicker.click();
    });

    filePicker.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        uploadFilesSequentially(files);
      }
    });

    // Search filters inputs
    const searchInput = document.getElementById("vault-search");
    const typeFilter = document.getElementById("filter-type");

    const handleFilterChange = async () => {
      const query = searchInput.value.trim();
      const type = typeFilter.value;
      
      if (!query && !type) {
        refreshData();
        return;
      }

      try {
        const folderId = currentFolderId === "root" ? null : currentFolderId;
        const searchParams = {
          query: query || null,
          file_type: type || null,
          folder_id: folderId
        };
        currentFiles = await FamDocAPI.search.search(searchParams);
        renderExplorer();
      } catch (err) {
        console.error("Filter search failed:", err);
      }
    };

    searchInput.addEventListener("input", handleFilterChange);
    typeFilter.addEventListener("change", handleFilterChange);

    // Mobile FAB Menu controls
    const fabBtn = document.getElementById("mobile-fab");
    const fabMenu = document.getElementById("fab-menu");
    if (fabBtn && fabMenu) {
      fabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fabMenu.classList.toggle("open");
        fabBtn.classList.toggle("active");
      });

      document.getElementById("fab-new-folder").addEventListener("click", (e) => {
        e.stopPropagation();
        fabMenu.classList.remove("open");
        fabBtn.classList.remove("active");
        document.getElementById("btn-new-folder").click();
      });

      document.getElementById("fab-upload-file").addEventListener("click", (e) => {
        e.stopPropagation();
        fabMenu.classList.remove("open");
        fabBtn.classList.remove("active");
        document.getElementById("btn-upload-file").click();
      });

      document.addEventListener("click", () => {
        fabMenu.classList.remove("open");
        fabBtn.classList.remove("active");
      });
    }
  }

  async function uploadFilesSequentially(files) {
    if (typeof window.FamDocUploadManager !== "undefined") {
      try {
        await window.FamDocUploadManager.enqueueFiles(files, currentFolderId);
        document.getElementById("file-picker").value = "";
        return;
      } catch (managerErr) {
        console.error("UploadManager failure, fallback:", managerErr);
      }
    }

    const progressOverlay = document.getElementById("upload-progress-overlay");
    const progressName = document.getElementById("upload-file-name");
    const progressBar = document.getElementById("upload-progress-bar");
    const percentageText = document.getElementById("upload-percentage");

    progressOverlay.classList.add("show");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressName.textContent = `[${i+1}/${files.length}] ${file.name}`;
      progressBar.style.width = "0%";
      percentageText.textContent = "0%";

      try {
        await FamDocAPI.files.upload(file, currentFolderId, (percent) => {
          progressBar.style.width = `${percent}%`;
          percentageText.textContent = `${percent}%`;
        });
        FamDocAPI.utils.showToast(`"${file.name}" uploaded successfully.`, "success");
      } catch (err) {
        FamDocAPI.utils.showToast(`Upload failed for "${file.name}": ${err.message}`, "error");
      }
    }

    progressOverlay.classList.remove("show");
    document.getElementById("file-picker").value = "";
    refreshData();
  }

  function setupDragAndDrop() {
    const dragOverlay = document.getElementById("drag-overlay");
    if (!dragOverlay) return;

    window.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragOverlay.style.display = "flex";
    });

    dragOverlay.addEventListener("dragover", (e) => { e.preventDefault(); });

    dragOverlay.addEventListener("dragleave", (e) => {
      const rect = dragOverlay.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
        dragOverlay.style.display = "none";
      }
    });

    dragOverlay.addEventListener("drop", (e) => {
      e.preventDefault();
      dragOverlay.style.display = "none";
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFilesSequentially(files);
      }
    });
  }
})();
