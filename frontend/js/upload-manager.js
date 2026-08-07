/**
 * FamDoc Background Upload Manager
 * Powered by IndexedDB to persist files and resume uploads seamlessly across page transitions.
 */

(function() {
  const DB_NAME = "FamDocUploadsDB";
  const STORE_NAME = "uploads";
  let dbInstance = null;
  let isUploading = false;
  let activeXhr = null;

  // 1. Database Helpers
  async function getDB() {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function getQueue() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort by addedAt
        const list = request.result || [];
        list.sort((a, b) => a.addedAt - b.addedAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function addToQueue(file, folderId) {
    const db = await getDB();
    const item = {
      id: "up_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      folderId: folderId,
      file: file, // Store the raw File object directly
      status: "pending",
      progress: 0,
      error: null,
      addedAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async function updateProgress(id, status, progress, error = null) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (!data) {
          resolve();
          return;
        }
        data.status = status;
        data.progress = progress;
        if (error) data.error = error;
        
        const updateRequest = store.put(data);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async function clearCompleted() {
    const db = await getDB();
    const queue = await getQueue();
    const completedOrFailed = queue.filter(item => item.status === "completed" || item.status === "failed");
    
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    completedOrFailed.forEach(item => {
      store.delete(item.id);
    });
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
    });
  }

  // 2. CSS Injector for Premium Status UI
  function injectStyles() {
    if (document.getElementById("famdoc-upload-manager-styles")) return;
    const style = document.createElement("style");
    style.id = "famdoc-upload-manager-styles";
    style.textContent = `
      .upload-status-card {
        position: fixed;
        bottom: 5.5rem;
        right: 1.5rem;
        z-index: 9999;
        width: 320px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
        font-family: inherit;
        overflow: hidden;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
        transform: translateY(0);
        opacity: 1;
      }
      [data-theme="dark"] .upload-status-card {
        background: rgba(30, 30, 34, 0.85);
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      }
      .upload-status-card.hidden {
        transform: translateY(100px) scale(0.9);
        opacity: 0;
        pointer-events: none;
      }
      .upload-status-card.collapsed .upload-card-body {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      .upload-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
      }
      [data-theme="dark"] .upload-card-header {
        border-bottom-color: rgba(255, 255, 255, 0.04);
      }
      .upload-card-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-ink, #111);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .upload-card-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .upload-btn-icon {
        background: none;
        border: none;
        color: var(--text-ink-muted, #777);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        transition: background-color 0.2s, color 0.2s;
      }
      .upload-btn-icon:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-ink, #111);
      }
      [data-theme="dark"] .upload-btn-icon:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
      }
      .upload-card-body {
        padding: 0 1.25rem;
        max-height: 250px;
        overflow-y: auto;
        transition: max-height 0.3s ease, padding 0.3s ease;
      }
      .upload-item-row {
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.03);
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      [data-theme="dark"] .upload-item-row {
        border-bottom-color: rgba(255, 255, 255, 0.03);
      }
      .upload-item-row:last-child {
        border-bottom: none;
      }
      .upload-item-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
      }
      .upload-item-name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
        color: var(--text-ink, #111);
      }
      .upload-item-meta {
        font-size: 0.75rem;
        color: var(--text-ink-muted, #777);
      }
      .upload-progress-container {
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
      }
      [data-theme="dark"] .upload-progress-container {
        background: rgba(255, 255, 255, 0.05);
      }
      .upload-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-brand, #4b86f4), #76a0f8);
        border-radius: 10px;
        width: 0%;
        transition: width 0.1s ease;
      }
      .upload-progress-bar.success {
        background: #10b981;
      }
      .upload-progress-bar.failed {
        background: #ef4444;
      }
      .upload-card-footer {
        padding: 0.75rem 1.25rem;
        background: rgba(0, 0, 0, 0.01);
        border-top: 1px solid rgba(0, 0, 0, 0.03);
        display: flex;
        justify-content: flex-end;
      }
      [data-theme="dark"] .upload-card-footer {
        background: rgba(255, 255, 255, 0.01);
        border-top-color: rgba(255, 255, 255, 0.03);
      }
      
      /* Floating layout compatibility for mobile */
      @media (max-width: 768px) {
        .upload-status-card {
          width: calc(100% - 2rem);
          right: 1rem;
          bottom: 5.5rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 3. UI Renderer
  function updateUI(queue) {
    if (queue.length === 0) {
      const card = document.getElementById("famdoc-upload-card");
      if (card) card.classList.add("hidden");
      return;
    }

    injectStyles();
    let card = document.getElementById("famdoc-upload-card");
    if (!card) {
      card = document.createElement("div");
      card.id = "famdoc-upload-card";
      card.className = "upload-status-card";
      document.body.appendChild(card);

      // Restore collapsed state preference
      const isCollapsed = localStorage.getItem("famdoc_upload_card_collapsed") === "true";
      if (isCollapsed) card.classList.add("collapsed");
    }

    const activeCount = queue.filter(item => item.status === "uploading" || item.status === "pending").length;
    const completedCount = queue.filter(item => item.status === "completed").length;
    const failedCount = queue.filter(item => item.status === "failed").length;
    const totalCount = queue.length;

    let headerTitle = `Uploading ${completedCount + 1}/${totalCount} file(s)...`;
    let headerIcon = `<i class="fas fa-circle-notch fa-spin" style="color: var(--accent-brand);"></i>`;

    if (activeCount === 0) {
      if (failedCount > 0) {
        headerTitle = `Uploads completed with errors`;
        headerIcon = `<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>`;
      } else {
        headerTitle = `All uploads completed`;
        headerIcon = `<i class="fas fa-check-circle" style="color: #10b981;"></i>`;
      }
    }

    card.innerHTML = `
      <div class="upload-card-header" id="uploadCardHeader">
        <div class="upload-card-title">
          ${headerIcon}
          <span>${headerTitle}</span>
        </div>
        <div class="upload-card-controls">
          <button class="upload-btn-icon" id="toggleCollapseUpload" aria-label="Minimize/Maximize">
            <i class="fas ${card.classList.contains("collapsed") ? "fa-chevron-up" : "fa-chevron-down"}"></i>
          </button>
        </div>
      </div>
      <div class="upload-card-body">
        ${queue.map(item => {
          let statusText = `${item.progress}%`;
          let barClass = "";
          let icon = `<i class="fas fa-circle-notch fa-spin" style="font-size: 0.75rem; color: var(--accent-brand);"></i>`;
          
          if (item.status === "pending") {
            statusText = "Queued";
            icon = `<i class="far fa-clock" style="font-size: 0.75rem; color: #777;"></i>`;
          } else if (item.status === "completed") {
            statusText = "Done";
            barClass = "success";
            icon = `<i class="fas fa-check" style="font-size: 0.75rem; color: #10b981;"></i>`;
          } else if (item.status === "failed") {
            statusText = "Failed";
            barClass = "failed";
            icon = `<i class="fas fa-exclamation-triangle" style="font-size: 0.75rem; color: #ef4444;" title="${item.error || 'Upload error'}"></i>`;
          }

          return `
            <div class="upload-item-row">
              <div class="upload-item-info">
                <div class="upload-item-name" title="${item.name}">${icon} ${item.name}</div>
                <div class="upload-item-meta">${statusText}</div>
              </div>
              <div class="upload-progress-container">
                <div class="upload-progress-bar ${barClass}" style="width: ${item.progress}%"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="upload-card-footer">
        <button class="btn btn-secondary btn-sm" id="dismissUploadsBtn" ${activeCount > 0 ? "disabled" : ""} style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 6px;">
          Dismiss
        </button>
      </div>
    `;

    card.classList.remove("hidden");

    // Setup interactive events
    document.getElementById("uploadCardHeader").onclick = (e) => {
      if (e.target.closest("#dismissUploadsBtn")) return;
      card.classList.toggle("collapsed");
      const icon = document.querySelector("#toggleCollapseUpload i");
      if (icon) {
        icon.className = card.classList.contains("collapsed") ? "fas fa-chevron-up" : "fas fa-chevron-down";
      }
      localStorage.setItem("famdoc_upload_card_collapsed", card.classList.contains("collapsed"));
    };

    document.getElementById("toggleCollapseUpload").onclick = (e) => {
      e.stopPropagation();
      document.getElementById("uploadCardHeader").click();
    };

    const dismissBtn = document.getElementById("dismissUploadsBtn");
    if (dismissBtn) {
      dismissBtn.onclick = async () => {
        await clearCompleted();
        const updated = await getQueue();
        updateUI(updated);
        // Refresh Shared Vault view if the user is currently on the shared vault page
        if (window.location.pathname.includes("files.html") && typeof refreshData === "function") {
          refreshData();
        }
      };
    }
  }

  // 4. XHR File Uploader
  function uploadFileXHR(item, onProgress) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("famdoc_token");
      const xhr = new XMLHttpRequest();
      activeXhr = xhr;
      
      const API_BASE_URL = localStorage.getItem("famdoc_api_base_url") || "";
      const uploadUrl = API_BASE_URL + "/api/files/upload";
      
      xhr.open("POST", uploadUrl, true);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
      
      xhr.onload = () => {
        activeXhr = null;
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            resolve(xhr.responseText);
          }
        } else {
          let errorMsg = "Upload failed";
          try {
            const errData = JSON.parse(xhr.responseText);
            errorMsg = errData.detail || errorMsg;
          } catch (err) {}
          reject(new Error(errorMsg));
        }
      };
      
      xhr.onerror = () => {
        activeXhr = null;
        reject(new Error("Network error occurred during upload"));
      };

      xhr.onabort = () => {
        activeXhr = null;
        reject(new Error("Upload aborted"));
      };
      
      const formData = new FormData();
      formData.append("file", item.file);
      if (item.folderId !== null && item.folderId !== undefined && item.folderId !== "root" && item.folderId !== "") {
        formData.append("folder_id", item.folderId);
      }
      
      xhr.send(formData);
    });
  }

  // 5. Processing Loop
  async function processNextUpload() {
    const queue = await getQueue();
    const nextItem = queue.find(item => item.status === "pending" || item.status === "uploading");
    
    if (!nextItem) {
      isUploading = false;
      updateUI(queue);
      return;
    }

    isUploading = true;
    updateUI(queue);

    try {
      // Mark as uploading
      await updateProgress(nextItem.id, "uploading", nextItem.progress);
      
      // Perform XHR upload
      await uploadFileXHR(nextItem, async (percent) => {
        await updateProgress(nextItem.id, "uploading", percent);
        const currentQueue = await getQueue();
        updateUI(currentQueue);
      });

      // Mark completed
      await updateProgress(nextItem.id, "completed", 100);
      
      // Toast notification for file upload completion if on files page
      if (window.location.pathname.includes("files.html") && typeof FamDocAPI !== "undefined") {
        FamDocAPI.utils.showToast(`Uploaded: ${nextItem.name}`, "success");
      }
      
    } catch (err) {
      console.error("Background upload failed for item " + nextItem.id, err);
      await updateProgress(nextItem.id, "failed", nextItem.progress, err.message);
      
      if (typeof FamDocAPI !== "undefined") {
        FamDocAPI.utils.showToast(`Failed uploading ${nextItem.name}: ${err.message}`, "error");
      }
    }

    // Recurse to process the next item
    setTimeout(processNextUpload, 100);
  }

  // 6. Public Interface
  window.FamDocUploadManager = {
    // Adds files directly to the persistent queue and starts processing
    enqueueFiles: async function(files, folderId) {
      const addedItems = [];
      for (let i = 0; i < files.length; i++) {
        const item = await addToQueue(files[i], folderId);
        addedItems.push(item);
      }
      const queue = await getQueue();
      updateUI(queue);

      if (!isUploading) {
        processNextUpload();
      }
      return addedItems;
    },

    // Checks and resumes any unfinished uploads from a previous session
    resumeUploads: async function() {
      const queue = await getQueue();
      if (queue.length > 0) {
        updateUI(queue);
        
        // Find if there's any active item and start processing
        const activeCount = queue.filter(item => item.status === "pending" || item.status === "uploading").length;
        if (activeCount > 0 && !isUploading) {
          processNextUpload();
        }
      }
    },

    // Returns current queue items
    getQueueItems: async function() {
      return await getQueue();
    }
  };

  // Auto-init on script load
  function initManager() {
    // Wait slightly for auth checks to finalize, then resume uploads
    setTimeout(() => {
      window.FamDocUploadManager.resumeUploads();
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initManager);
  } else {
    initManager();
  }
})();
