/**
 * FamDoc API Client Wrapper
 */
// Configurable base URL for cross-origin hosting (e.g. backend on Render and frontend on Vercel)
// - If empty, relative paths are used (Option A: Proxy Rewrite in vercel.json)
// - Alternatively, set to your Render backend URL (e.g. "https://your-backend.onrender.com")
// Supports dynamic overrides in local storage via: localStorage.setItem("famdoc_api_base_url", "YOUR_BACKEND_URL")
const API_BASE_URL = localStorage.getItem("famdoc_api_base_url") || "";

function translateValidationError(field, message) {
  const cleanMsg = message.replace(/^value error,\s*/i, "");
  if (cleanMsg.toLowerCase().startsWith(field.toLowerCase())) {
    return cleanMsg.charAt(0).toUpperCase() + cleanMsg.slice(1);
  }
  
  let friendlyField = field.charAt(0).toUpperCase() + field.slice(1);
  friendlyField = friendlyField.replace(/_/g, " ");

  let friendlyMsg = cleanMsg;
  
  if (cleanMsg.includes("match pattern '^[a-zA-Z0-9_]+$'")) {
    friendlyMsg = "should contain only letters, numbers, and underscores (no spaces or special characters).";
  } else if (cleanMsg.includes("match pattern")) {
    friendlyMsg = "contains unsupported characters.";
  } else if (cleanMsg === "Field required") {
    friendlyMsg = "is required.";
  } else if (cleanMsg.includes("valid email address")) {
    friendlyMsg = "must be a valid email address.";
  } else if (cleanMsg.includes("at least")) {
    const match = cleanMsg.match(/at least (\d+)/);
    friendlyMsg = match ? `must be at least ${match[1]} characters long.` : "is too short.";
  } else if (cleanMsg.includes("at most")) {
    const match = cleanMsg.match(/at most (\d+)/);
    friendlyMsg = match ? `must be at most ${match[1]} characters long.` : "is too long.";
  }
  
  return `${friendlyField} ${friendlyMsg}`;
}

const FamDocAPI = {
  // Base request method
  async request(path, options = {}) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("Offline: No internet connection");
    }

    const token = sessionStorage.getItem("famdoc_token");
    const headers = options.headers || {};

    // Don't set Content-Type if we're sending FormData (browser does it automatically with boundary)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const method = (options.method || "GET").toUpperCase();
    const defaultTimeout = method === "GET" ? 4000 : 8000;
    const timeoutMs = options.timeout || defaultTimeout;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    const fetchOptions = {
      ...options,
      headers,
      signal: controller.signal
    };

    const fullPath = (API_BASE_URL && path.startsWith("/")) ? `${API_BASE_URL}${path}` : path;

    try {
      const response = await fetch(fullPath, fetchOptions);
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        // Parse SPA hash routes and redirect properly
        const hash = window.location.hash || "";
        const pathName = window.location.pathname || "";
        const isPublicPage = pathName.includes("shared.html") ||
                             hash === "" || 
                             hash === "#/" || 
                             hash.startsWith("#/login") || 
                             hash.startsWith("#/register") || 
                             hash.startsWith("#/join") || 
                             hash.startsWith("#/share");
        
        if (!isPublicPage) {
          sessionStorage.removeItem("famdoc_token");
          sessionStorage.removeItem("famdoc_user");
          window.location.href = "/#/login";
          window.location.reload();
          return null;
        }
      }

      if (!response.ok) {
        // Parse error details
        let errorMsg = "Something went wrong";
        try {
          const errData = await response.json();
          if (typeof errData.detail === "string") {
            errorMsg = errData.detail;
          } else if (Array.isArray(errData.detail)) {
            errorMsg = errData.detail.map(err => {
              const field = err.loc.slice(1).join('.');
              return translateValidationError(field, err.msg);
            }).join("; ");
          } else if (errData.detail) {
            errorMsg = JSON.stringify(errData.detail);
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }

      // Check if response is empty
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please check your connection.");
      }
      console.error(`API Error on ${path}:`, error);
      throw error;
    }
  },

  // Auth Endpoints
  auth: {
    async register(username, email, password) {
      return FamDocAPI.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password })
      });
    },

    async login(email, password) {
      const data = await FamDocAPI.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (data && data.access_token) {
        sessionStorage.setItem("famdoc_token", data.access_token);
      }
      return data;
    },

    async joinFamily(username, email, secretCode, password) {
      const data = await FamDocAPI.request("/api/auth/family-login", {
        method: "POST",
        body: JSON.stringify({ username, email, secret_code: secretCode, password })
      });
      if (data && data.access_token) {
        sessionStorage.setItem("famdoc_token", data.access_token);
      }
      return data;
    },

    async me() {
      const user = await FamDocAPI.request("/api/auth/me");
      if (user) {
        sessionStorage.setItem("famdoc_user", JSON.stringify(user));
      }
      return user;
    },

    async getUser() {
      let userJson = sessionStorage.getItem("famdoc_user");
      if (userJson) {
        try {
          return JSON.parse(userJson);
        } catch (e) {}
      }
      // Wait for a short duration in case auth.js is fetching the user in the background
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        userJson = sessionStorage.getItem("famdoc_user");
        if (userJson) {
          try {
            return JSON.parse(userJson);
          } catch (e) {}
        }
      }
      // Fallback: fetch directly from API
      try {
        return await FamDocAPI.auth.me();
      } catch (e) {
        return null;
      }
    },

    async updateProfile(username, password) {
      const payload = {};
      if (username) payload.username = username;
      if (password) payload.password = password;
      const user = await FamDocAPI.request("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      if (user) {
        sessionStorage.setItem("famdoc_user", JSON.stringify(user));
      }
      return user;
    },

    async logout() {
      try {
        await FamDocAPI.request("/api/auth/logout", { method: "POST" });
      } catch (e) {}
      sessionStorage.removeItem("famdoc_token");
      sessionStorage.removeItem("famdoc_user");
      window.location.href = "/login.html";
    }
  },

  // Family Endpoints
  family: {
    async setup(name, maxMembers) {
      return FamDocAPI.request("/api/family/setup", {
        method: "POST",
        body: JSON.stringify({ name, max_members: maxMembers })
      });
    },

    async getMembers() {
      return FamDocAPI.request("/api/family/members");
    },

    async removeMember(userId) {
      return FamDocAPI.request(`/api/family/members/${userId}`, {
        method: "DELETE"
      });
    },

    async getDetails() {
      return FamDocAPI.request("/api/family/details");
    },

    async regenerateCode(name, maxMembers) {
      return FamDocAPI.request("/api/family/regenerate-code", {
        method: "POST",
        body: JSON.stringify({ name, max_members: maxMembers })
      });
    }
  },

  // Storage Endpoints
  storage: {
    async getConfig() {
      return FamDocAPI.request("/api/storage/config");
    },

    async getGoogleAuthUrl(clientId, clientSecret) {
      return FamDocAPI.request("/api/storage/oauth/url", {
        method: "POST",
        body: JSON.stringify({ client_id: clientId || null, client_secret: clientSecret || null })
      });
    },

    async updateMode(storageProvider) {
      return FamDocAPI.request("/api/storage/config/mode", {
        method: "POST",
        body: JSON.stringify({
          storage_provider: storageProvider
        })
      });
    }
  },


  // Folder Endpoints
  folders: {
    async getFolders() {
      return FamDocAPI.request("/api/folders");
    },

    async create(name, parentId = null) {
      return FamDocAPI.request("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name, parent_id: parentId })
      });
    },

    async rename(folderId, name) {
      return FamDocAPI.request(`/api/folders/${folderId}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
    },

    async move(folderId, parentId) {
      return FamDocAPI.request(`/api/folders/${folderId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: parentId })
      });
    },

    async delete(folderId) {
      return FamDocAPI.request(`/api/folders/${folderId}`, {
        method: "DELETE"
      });
    }
  },

  // File Endpoints
  files: {
    async getFiles(folderId = null) {
      let path = "/api/files";
      if (folderId !== null) {
        path += `?folder_id=${folderId === "root" ? "root" : folderId}`;
      }
      return FamDocAPI.request(path);
    },

    async upload(fileObj, folderId = null, onProgress = null) {
      const formData = new FormData();
      formData.append("file", fileObj);
      if (folderId !== null && folderId !== "root") {
        formData.append("folder_id", folderId);
      }

      // If we need progress, we use standard XMLHttpRequest
      if (onProgress) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const uploadPath = "/api/files/upload";
          const fullUploadPath = (API_BASE_URL && uploadPath.startsWith("/")) ? `${API_BASE_URL}${uploadPath}` : uploadPath;
          xhr.open("POST", fullUploadPath);
          
          const token = sessionStorage.getItem("famdoc_token");
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                resolve(xhr.responseText);
              }
            } else {
              let errorMsg = "Upload failed";
              try {
                const errData = JSON.parse(xhr.responseText);
                errorMsg = errData.detail || errorMsg;
              } catch (e) {}
              reject(new Error(errorMsg));
            }
          };

          xhr.onerror = () => reject(new Error("Upload network error"));
          xhr.send(formData);
        });
      }

      return FamDocAPI.request("/api/files/upload", {
        method: "POST",
        body: formData
      });
    },

    async rename(fileId, filename) {
      return FamDocAPI.request(`/api/files/${fileId}`, {
        method: "PUT",
        body: JSON.stringify({ filename })
      });
    },

    async move(fileId, folderId) {
      return FamDocAPI.request(`/api/files/${fileId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ folder_id: folderId })
      });
    },

    async delete(fileId) {
      return FamDocAPI.request(`/api/files/${fileId}`, {
        method: "DELETE"
      });
    },

    getDownloadUrl(fileId) {
      const path = `/api/files/${fileId}/download`;
      return (API_BASE_URL && path.startsWith("/")) ? `${API_BASE_URL}${path}` : path;
    },

    getPreviewUrl(fileId) {
      const path = `/api/files/${fileId}/preview`;
      return (API_BASE_URL && path.startsWith("/")) ? `${API_BASE_URL}${path}` : path;
    }
  },

  // Recycle Bin Endpoints
  recycleBin: {
    async get() {
      return FamDocAPI.request("/api/recycle-bin");
    },

    async restore(itemType, itemId) {
      return FamDocAPI.request(`/api/recycle-bin/${itemType}/${itemId}/restore`, {
        method: "POST"
      });
    },

    async purge(itemType, itemId) {
      return FamDocAPI.request(`/api/recycle-bin/${itemType}/${itemId}/purge`, {
        method: "DELETE"
      });
    }
  },

  // Search Endpoint
  search: {
    async search(params = {}) {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      return FamDocAPI.request(`/api/search?${queryParams.toString()}`);
    }
  },

  // Dashboard Endpoint
  dashboard: {
    async getStats() {
      return FamDocAPI.request("/api/dashboard/stats");
    }
  },

  // Sharing Endpoints
  sharing: {
    async createLink(fileId, password = null, expiresAt = null, maxDownloads = null) {
      return FamDocAPI.request(`/api/files/${fileId}/share`, {
        method: "POST",
        body: JSON.stringify({
          password,
          expires_at: expiresAt,
          max_downloads: maxDownloads
        })
      });
    },

    async getLinks(fileId) {
      return FamDocAPI.request(`/api/files/${fileId}/share`);
    },

    async revokeLink(token) {
      return FamDocAPI.request(`/api/shared/links/${token}`, {
        method: "DELETE"
      });
    },

    // Public Sharing
    async getPublicInfo(token) {
      return FamDocAPI.request(`/api/shared/${token}`);
    },

    async downloadPublic(token, password = null) {
      const headers = {};
      const bodyObj = password ? { password } : null;

      try {
        const downloadPath = `/api/shared/${token}/download`;
        const fullDownloadPath = (API_BASE_URL && downloadPath.startsWith("/")) ? `${API_BASE_URL}${downloadPath}` : downloadPath;
        const response = await fetch(fullDownloadPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: bodyObj ? JSON.stringify(bodyObj) : undefined
        });

        if (!response.ok) {
          let errorMsg = "Failed to download";
          try {
            const errData = await response.json();
            errorMsg = errData.detail || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }

        // Trigger browser file download from response stream
        const blob = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = "download";
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+?)"/);
          if (match && match[1]) {
            filename = match[1];
          }
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Public download error:", error);
        throw error;
      }
    }
  },

  // Global Helpers
  utils: {
    escapeHtml(str) {
      if (!str) return "";
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    },

    formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    },

    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    },

    getFileIconClass(fileType, filename) {
      const ext = filename.split(".").pop().toLowerCase();
      const mime = fileType ? fileType.toLowerCase() : "";

      if (mime.includes("pdf") || ext === "pdf") {
        return "file-pdf fas fa-file-pdf";
      }
      if (mime.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
        return "file-image fas fa-file-image";
      }
      if (mime.includes("word") || mime.includes("officedocument.word") || ["doc", "docx"].includes(ext)) {
        return "file-doc fas fa-file-word";
      }
      if (mime.includes("sheet") || mime.includes("excel") || mime.includes("officedocument.spreadsheet") || ["xls", "xlsx", "csv"].includes(ext)) {
        return "file-sheet fas fa-file-excel";
      }
      if (mime.includes("text") || ext === "txt") {
        return "file-text fas fa-file-alt";
      }
      return "file-generic fas fa-file";
    },

    showToast(message, type = "info") {
      const containerId = "famdoc-toast-container";
      let container = document.getElementById(containerId);
      
      if (!container) {
        container = document.createElement("div");
        container.id = containerId;
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.zIndex = "10000";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        container.style.maxWidth = "350px";
        document.body.appendChild(container);
      }

      const toast = document.createElement("div");
      toast.className = `famdoc-alert ${type === "error" ? "warning" : type}`;
      toast.style.margin = "0";
      toast.style.boxShadow = "0 4px 12px rgba(var(--shadow-base), 0.15)";
      toast.style.animation = "toastEnter 0.25s ease-out";
      
      let icon = "fa-info-circle";
      if (type === "success") icon = "fa-check-circle";
      if (type === "error") icon = "fa-exclamation-triangle";
      
      toast.innerHTML = `
        <i class="fas ${icon}" style="margin-top: 2px;"></i>
        <div class="toast-message-content"></div>
      `;
      toast.querySelector(".toast-message-content").textContent = message;

      container.appendChild(toast);

      // Auto dismiss
      setTimeout(() => {
        toast.style.animation = "toastExit 0.25s ease-in forwards";
        toast.addEventListener("animationend", () => {
          toast.remove();
          if (container.children.length === 0) {
            container.remove();
          }
        });
      }, 4000);
    },

    confirm(options = {}) {
      return new Promise((resolve) => {
        const title = options.title || "Confirm Action";
        const message = options.message || "Are you sure you want to proceed?";
        const confirmText = options.confirmText || "Confirm";
        const cancelText = options.cancelText || "Cancel";
        const type = options.type || "primary"; // primary, danger, warning

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.style.zIndex = "2500";

        let confirmBtnClass = "btn-primary";
        if (type === "danger") {
          confirmBtnClass = "btn-danger";
        }

        overlay.innerHTML = `
          <div class="famdoc-modal" style="max-width: 420px;">
            <div class="modal-header">
              <h3 class="modal-title">${title}</h3>
              <button class="modal-close" id="custom-confirm-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" style="padding: 1.5rem;">
              <p style="font-size: 0.95rem; color: var(--text-ink); line-height: 1.5; margin: 0;">${message}</p>
            </div>
            <div class="modal-footer" style="padding: 1rem 1.5rem;">
              <button class="btn btn-secondary" id="custom-confirm-cancel">${cancelText}</button>
              <button class="btn ${confirmBtnClass}" id="custom-confirm-ok">${confirmText}</button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
          overlay.classList.add("show");
        }, 10);

        const cleanup = (result) => {
          overlay.classList.remove("show");
          setTimeout(() => {
            overlay.remove();
            resolve(result);
          }, 250);
        };

        overlay.querySelector("#custom-confirm-ok").addEventListener("click", () => cleanup(true));
        overlay.querySelector("#custom-confirm-cancel").addEventListener("click", () => cleanup(false));
        overlay.querySelector("#custom-confirm-close").addEventListener("click", () => cleanup(false));

        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) cleanup(false);
        });

        setTimeout(() => {
          const okBtn = overlay.querySelector("#custom-confirm-ok");
          if (okBtn) okBtn.focus();
        }, 50);
      });
    }
  }
};

// Add toast animation styles to document if not present
const styleEl = document.createElement("style");
styleEl.textContent = `
@keyframes toastEnter {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes toastExit {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(20px); opacity: 0; }
}
`;
document.head.appendChild(styleEl);
