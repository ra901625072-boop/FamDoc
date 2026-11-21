/**
 * Recycle Bin View Manager (Consolidates recycle-bin.html)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let deletedFiles = [];
  let deletedFolders = [];
  let isUserAdmin = false;

  const selectedItems = {
    folders: new Set(),
    files: new Set()
  };

  window.FamDocViews.trash = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    selectedItems.folders.clear();
    selectedItems.files.clear();

    mount.innerHTML = `
      <div class="content-header fd-fade-in">
        <div>
          <h1 class="page-title">Recycle Bin</h1>
          <p class="page-subtitle">Recover soft-deleted items. Only family administrators can permanently purge records.</p>
        </div>
      </div>

      <!-- Toolbar (Select All) -->
      <div class="browser-toolbar" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem;">
        <div style="display: flex; align-items: center;">
          <label class="fd-select-checkbox-container" style="margin-bottom: 0;" title="Select All Items">
            <input type="checkbox" id="select-all-checkbox">
            <span class="fd-select-checkmark"></span>
          </label>
          <span style="font-size: 0.85rem; color: var(--text-ink-muted); font-weight: 500; cursor: pointer; user-select: none;" id="select-all-text-btn">Select All</span>
        </div>
      </div>

      <!-- Main Explorer Surface -->
      <div class="famdoc-card" style="min-height: 400px;">
        <div id="recycle-list" class="items-list">
          <!-- Skeleton Loading State (3 rows) -->
          <div class="fd-skel-recycle-placeholder">
            <div class="skel-row">
              <div class="fd-skel fd-skel-circle" style="width: 1.75rem; height: 1.75rem;"></div>
              <div style="flex: 1; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; align-items: center; width: 100%;">
                <div class="fd-skel fd-skel-text lg"></div>
                <div class="fd-skel fd-skel-text md" style="width: 60%;"></div>
                <div class="fd-skel fd-skel-text sm" style="width: 40%;"></div>
              </div>
              <div class="skel-actions">
                <div class="fd-skel skel-btn"></div>
                <div class="fd-skel skel-btn"></div>
              </div>
            </div>
            <div class="skel-row">
              <div class="fd-skel fd-skel-circle" style="width: 1.75rem; height: 1.75rem;"></div>
              <div style="flex: 1; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; align-items: center; width: 100%;">
                <div class="fd-skel fd-skel-text lg"></div>
                <div class="fd-skel fd-skel-text md" style="width: 70%;"></div>
                <div class="fd-skel fd-skel-text sm" style="width: 30%;"></div>
              </div>
              <div class="skel-actions">
                <div class="fd-skel skel-btn"></div>
                <div class="fd-skel skel-btn"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div id="recycle-empty" class="empty-state" style="display: none; padding: 4rem 0;">
          <i class="fas fa-trash-restore state-icon empty"></i>
          <h3 class="empty-state-title">Recycle bin is empty</h3>
          <p class="empty-state-text">No folders or files have been deleted recently.</p>
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
          <button class="btn btn-secondary" id="bulk-restore-btn">
            <i class="fas fa-undo"></i> Restore
          </button>
          <button class="btn btn-danger" id="bulk-purge-btn" style="background-color: var(--warning-red); color: white; border-color: var(--warning-red); display: none;">
            <i class="fas fa-trash-alt"></i> Purge
          </button>
        </div>
      </div>
    `;

    // Initialize events and load data
    setupEvents();
    loadRecycleBin();

    // Register synchronization callback
    if (window.FamDocDataSync) {
      window.FamDocDataSync.register("trash", loadRecycleBin);
    }
  };

  async function loadRecycleBin() {
    const listContainer = document.getElementById("recycle-list");
    const emptyState = document.getElementById("recycle-empty");
    if (!listContainer || !emptyState) return;

    try {
      const user = await window.FamDocApp.getUser();
      if (!user) return;
      isUserAdmin = user.role === "admin";
      
      const bulkPurgeBtn = document.getElementById("bulk-purge-btn");
      if (bulkPurgeBtn) bulkPurgeBtn.style.display = isUserAdmin ? "inline-flex" : "none";

      const data = await FamDocAPI.recycleBin.get();
      deletedFiles = data.files || [];
      deletedFolders = data.folders || [];

      renderRecycleBinList(isUserAdmin);
    } catch (err) {
      console.error("Recycle bin load error:", err);
      FamDocAPI.utils.showToast("Failed to load deleted files.", "error");
      listContainer.innerHTML = `
        <div class="empty-state fd-fade-in" style="padding: 2rem 0; color: var(--warning-red);">
          <i class="fas fa-exclamation-triangle state-icon error"></i>
          <h4 class="empty-state-title">Failed to load deleted records</h4>
        </div>
      `;
    }
  }

  function renderRecycleBinList(isAdmin) {
    const listContainer = document.getElementById("recycle-list");
    const emptyState = document.getElementById("recycle-empty");
    if (!listContainer || !emptyState) return;

    if (deletedFiles.length === 0 && deletedFolders.length === 0) {
      listContainer.innerHTML = "";
      emptyState.style.display = "flex";
      return;
    }

    listContainer.innerHTML = "";
    emptyState.style.display = "none";

    // 1. Folders
    deletedFolders.forEach((folder, index) => {
      const row = document.createElement("div");
      row.className = "vault-item fd-fade-up fd-stagger" + (selectedItems.folders.has(folder.id) ? " selected" : "");
      row.style.setProperty("--fd-delay", `${index * 0.05}s`);

      const formattedDate = FamDocAPI.utils.formatDate(folder.deleted_at);

      row.innerHTML = `
        <label class="fd-select-checkbox-container" style="margin-left: 0.5rem; margin-right: 0;">
          <input type="checkbox" class="item-select-checkbox" data-id="${folder.id}" data-type="folder" ${selectedItems.folders.has(folder.id) ? 'checked' : ''}>
          <span class="fd-select-checkmark"></span>
        </label>
        <i class="item-icon folder fas fa-folder-open" style="font-size: 1.75rem;"></i>
        <div class="item-details" style="grid-template-columns: 2fr 1fr 1fr; width: 100%; display: grid; align-items: center;">
          <div class="item-name" style="font-weight: 600;" title="${FamDocAPI.utils.escapeHtml(folder.name)}">${FamDocAPI.utils.escapeHtml(folder.name)}</div>
          <div class="item-meta-date" style="font-size: 0.8rem; color: var(--warning-red);">Deleted: ${formattedDate.split(',')[0]}</div>
          <div class="item-meta-size" style="font-size: 0.8rem;">Folder</div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;" class="item-actions-buttons">
          <button class="btn btn-secondary" data-action="restore" data-type="folder" data-id="${folder.id}" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" title="Restore">
            <i class="fas fa-undo"></i>
            <span>Restore</span>
          </button>
          ${isAdmin ? `
            <button class="btn btn-danger" data-action="purge" data-type="folder" data-id="${folder.id}" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" title="Permanently Delete">
              <i class="fas fa-trash-alt"></i>
              <span>Purge</span>
            </button>
          ` : ""}
        </div>
      `;

      const label = row.querySelector(".fd-select-checkbox-container");
      label.addEventListener("click", (e) => e.stopPropagation());
      const checkbox = row.querySelector(".item-select-checkbox");
      checkbox.addEventListener("change", () => {
        toggleItemSelection(folder.id, "folder", checkbox.checked, row);
      });

      listContainer.appendChild(row);
    });

    // 2. Files
    deletedFiles.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "vault-item fd-fade-up fd-stagger" + (selectedItems.files.has(file.id) ? " selected" : "");
      row.style.setProperty("--fd-delay", `${(deletedFolders.length + index) * 0.05}s`);

      const iconClass = FamDocAPI.utils.getFileIconClass(file.file_type, file.filename);
      const formattedSize = FamDocAPI.utils.formatBytes(file.size_bytes);
      const formattedDate = FamDocAPI.utils.formatDate(file.deleted_at);

      row.innerHTML = `
        <label class="fd-select-checkbox-container" style="margin-left: 0.5rem; margin-right: 0;">
          <input type="checkbox" class="item-select-checkbox" data-id="${file.id}" data-type="file" ${selectedItems.files.has(file.id) ? 'checked' : ''}>
          <span class="fd-select-checkmark"></span>
        </label>
        <i class="item-icon ${iconClass}" style="font-size: 1.75rem;"></i>
        <div class="item-details" style="grid-template-columns: 2fr 1fr 1fr; width: 100%; display: grid; align-items: center;">
          <div class="item-name" style="font-weight: 600;" title="${FamDocAPI.utils.escapeHtml(file.filename)}">${FamDocAPI.utils.escapeHtml(file.filename)}</div>
          <div class="item-meta-date" style="font-size: 0.8rem; color: var(--warning-red);">Deleted: ${formattedDate.split(',')[0]}</div>
          <div class="item-meta-size" style="font-size: 0.8rem;">${formattedSize}</div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;" class="item-actions-buttons">
          <button class="btn btn-secondary" data-action="restore" data-type="file" data-id="${file.id}" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" title="Restore">
            <i class="fas fa-undo"></i>
            <span>Restore</span>
          </button>
          ${isAdmin ? `
            <button class="btn btn-danger" data-action="purge" data-type="file" data-id="${file.id}" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;" title="Permanently Delete">
              <i class="fas fa-trash-alt"></i>
              <span>Purge</span>
            </button>
          ` : ""}
        </div>
      `;

      const label = row.querySelector(".fd-select-checkbox-container");
      label.addEventListener("click", (e) => e.stopPropagation());
      const checkbox = row.querySelector(".item-select-checkbox");
      checkbox.addEventListener("change", () => {
        toggleItemSelection(file.id, "file", checkbox.checked, row);
      });

      listContainer.appendChild(row);
    });
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

    const totalVisible = deletedFolders.length + deletedFiles.length;
    if (totalVisible === 0) {
      selectAll.checked = false;
      return;
    }

    let allSelected = true;
    for (let f of deletedFolders) {
      if (!selectedItems.folders.has(f.id)) {
        allSelected = false;
        break;
      }
    }
    if (allSelected) {
      for (let f of deletedFiles) {
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

  async function restoreItem(type, id, name) {
    try {
      await FamDocAPI.recycleBin.restore(type, id);
      FamDocAPI.utils.showToast(`Restored "${name}" successfully.`, "success");
      loadRecycleBin();
    } catch (err) {
      FamDocAPI.utils.showToast(err.message, "error");
    }
  }

  async function purgeItem(type, id, name) {
    const confirmed = await FamDocAPI.utils.confirm({
      title: "Permanently Delete Item",
      message: `CRITICAL: Are you sure you want to permanently delete "${name}"? This physical cloud/disk deletion cannot be undone!`,
      confirmText: "Delete Permanently",
      cancelText: "Cancel",
      type: "danger"
    });
    if (confirmed) {
      try {
        await FamDocAPI.recycleBin.purge(type, id);
        FamDocAPI.utils.showToast(`Permanently deleted "${name}".`, "success");
        loadRecycleBin();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    }
  }

  function setupEvents() {
    // Select All Checkbox Handler
    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", () => {
        const isChecked = selectAllCheckbox.checked;
        if (isChecked) {
          deletedFolders.forEach(f => selectedItems.folders.add(f.id));
          deletedFiles.forEach(f => selectedItems.files.add(f.id));
        } else {
          selectedItems.folders.clear();
          selectedItems.files.clear();
        }
        renderRecycleBinList(isUserAdmin);
        updateBulkActionsBar();
      });
    }

    const selectAllTextBtn = document.getElementById("select-all-text-btn");
    if (selectAllTextBtn && selectAllCheckbox) {
      selectAllTextBtn.addEventListener("click", () => {
        selectAllCheckbox.checked = !selectAllCheckbox.checked;
        selectAllCheckbox.dispatchEvent(new Event("change"));
      });
    }

    // Bulk Cancel
    document.getElementById("bulk-clear-btn").addEventListener("click", () => {
      clearSelectionState();
      renderRecycleBinList(isUserAdmin);
    });

    // Bulk Restore
    document.getElementById("bulk-restore-btn").addEventListener("click", async () => {
      const count = selectedItems.folders.size + selectedItems.files.size;
      if (count === 0) return;

      try {
        const foldersToRestore = Array.from(selectedItems.folders);
        const filesToRestore = Array.from(selectedItems.files);

        clearSelectionState();

        for (let id of foldersToRestore) {
          await FamDocAPI.recycleBin.restore("folder", id);
        }
        for (let id of filesToRestore) {
          await FamDocAPI.recycleBin.restore("file", id);
        }

        FamDocAPI.utils.showToast(`Restored ${count} items successfully.`, "success");
        loadRecycleBin();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    });

    // Bulk Purge
    document.getElementById("bulk-purge-btn").addEventListener("click", async () => {
      const count = selectedItems.folders.size + selectedItems.files.size;
      if (count === 0) return;

      const confirmed = await FamDocAPI.utils.confirm({
        title: "Permanently Purge Items",
        message: `CRITICAL: Are you sure you want to permanently delete the ${count} selected items? This physical deletion cannot be undone!`,
        confirmText: "Purge All",
        cancelText: "Cancel",
        type: "danger"
      });

      if (confirmed) {
        try {
          const foldersToPurge = Array.from(selectedItems.folders);
          const filesToPurge = Array.from(selectedItems.files);

          clearSelectionState();

          for (let id of foldersToPurge) {
            await FamDocAPI.recycleBin.purge("folder", id);
          }
          for (let id of filesToPurge) {
            await FamDocAPI.recycleBin.purge("file", id);
          }

          FamDocAPI.utils.showToast(`Permanently deleted ${count} items.`, "success");
          loadRecycleBin();
        } catch (err) {
          FamDocAPI.utils.showToast(err.message, "error");
        }
      }
    });

    // Restore & Purge Button click handlers delegator
    const listContainer = document.getElementById("recycle-list");
    listContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn) {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        const type = btn.getAttribute("data-type");
        const id = parseInt(btn.getAttribute("data-id"));

        if (type === "folder") {
          const folder = deletedFolders.find(f => f.id === id);
          if (!folder) return;
          if (action === "restore") restoreItem("folder", id, folder.name);
          else if (action === "purge") purgeItem("folder", id, folder.name);
        } else {
          const file = deletedFiles.find(f => f.id === id);
          if (!file) return;
          if (action === "restore") restoreItem("file", id, file.filename);
          else if (action === "purge") purgeItem("file", id, file.filename);
        }
        return;
      }

      // Checkbox row toggler click delegator
      const row = e.target.closest(".vault-item");
      if (row && !e.target.closest(".item-actions-buttons")) {
        const checkbox = row.querySelector(".item-select-checkbox");
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          toggleItemSelection(
            parseInt(checkbox.getAttribute("data-id")),
            checkbox.getAttribute("data-type"),
            checkbox.checked,
            row
          );
        }
      }
    });
  }
})();
