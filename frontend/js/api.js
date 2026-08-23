/**
 * FamDoc API Client Wrapper
 */
// Configurable base URL for cross-origin hosting (e.g. backend on Render and frontend on Vercel)
// - If empty, relative paths are used (Option A: Proxy Rewrite in vercel.json)
// - Alternatively, set to your Render backend URL (e.g. "https://your-backend.onrender.com")
// Supports dynamic overrides in local storage via: localStorage.setItem("famdoc_api_base_url", "YOUR_BACKEND_URL")
const API_BASE_URL = localStorage.getItem("famdoc_api_base_url") || "";
window.FamDocAPI_BaseURL = API_BASE_URL; // expose globally for connection manager

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

// ─── Client-Side Response Cache & Request Deduplication ───
const ApiCache = {
  _store: new Map(),
  _pendingRequests: new Map(),
  _defaultTTL: 15000,

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this._store.delete(key);
      return null;
    }
    return entry.data;
  },

  set(key, data, ttl) {
    if (this._store.size >= 200) {
      const oldest = this._store.keys().next().value;
      this._store.delete(oldest);
    }
    this._store.set(key, { data, expiry: Date.now() + (ttl || this._defaultTTL) });
  },

  invalidate(key) { this._store.delete(key); },

  invalidatePrefix(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
  },

  invalidateAll() { this._store.clear(); },

  /** Deduplicate identical in-flight GET requests and serve from cache */
  async deduplicatedFetch(key, fetchFn, ttl) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    if (this._pendingRequests.has(key)) return this._pendingRequests.get(key);
    const promise = fetchFn().then(result => {
      this._pendingRequests.delete(key);
      this.set(key, result, ttl);
      return result;
    }).catch(err => {
      this._pendingRequests.delete(key);
      throw err;
    });
    this._pendingRequests.set(key, promise);
    return promise;
  },

  /** Invalidate all data caches after a write operation */
  invalidateOnMutation() {
    this.invalidatePrefix("files:");
    this.invalidatePrefix("folders:");
    this.invalidatePrefix("search:");
    this.invalidate("dashboard:stats");
  }
};

const FamDocAPI = {
  cache: ApiCache,
  // Base request method
  async request(path, options = {}) {
    // If it is the health check, bypass connection manager check to avoid deadlocks
    if (path.startsWith("/api/health")) {
      return this._performRequest(path, options);
    }

    // Check if BackendConnectionManager is ready
    if (window.BackendConnectionManager) {
      const status = window.BackendConnectionManager.status;
      
      if (status === "CONNECTED") {
        return this._performRequest(path, options);
      }
      
      // If we are offline or in error, trigger retry/reconnection check
      if (status === "OFFLINE" || status === "ERROR") {
        window.BackendConnectionManager.retryConnection();
      }

      // Queue the request
      return new Promise((resolve, reject) => {
        window.BackendConnectionManager.queueRequest({
          resolve: () => {
            this._performRequest(path, options).then(resolve).catch(reject);
          },
          reject: (err) => {
            reject(err);
          }
        });
      });
    }

    // Fallback if Connection Manager is not loaded yet
    return this._performRequest(path, options);
  },

  // Internal execution of network request
  async _performRequest(path, options = {}) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("Offline: No internet connection");
    }

    const token = localStorage.getItem("famdoc_token");
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
                             hash.startsWith("#/share") ||
                             hash.startsWith("#/forgot-password");
        
        if (!isPublicPage) {
          localStorage.removeItem("famdoc_token");
          localStorage.removeItem("famdoc_user");
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
      
      // Notify connection manager of request failure
      if (window.BackendConnectionManager) {
        window.BackendConnectionManager.handleRequestFailure(error);
      }

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
        localStorage.setItem("famdoc_token", data.access_token);
      }
      return data;
    },

    async joinFamily(username, email, secretCode, password) {
      const data = await FamDocAPI.request("/api/auth/family-login", {
        method: "POST",
        body: JSON.stringify({ username, email, secret_code: secretCode, password })
      });
      if (data && data.access_token) {
        localStorage.setItem("famdoc_token", data.access_token);
      }
      return data;
    },

    async me() {
      const user = await FamDocAPI.request("/api/auth/me");
      if (user) {
        localStorage.setItem("famdoc_user", JSON.stringify(user));
      }
      return user;
    },

    async getUser() {
      let userJson = localStorage.getItem("famdoc_user");
      if (userJson) {
        try {
          return JSON.parse(userJson);
        } catch (e) {}
      }
      // Wait for a short duration in case auth.js is fetching the user in the background
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        userJson = localStorage.getItem("famdoc_user");
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
        localStorage.setItem("famdoc_user", JSON.stringify(user));
      }
      return user;
    },

    async logout() {
      try {
        await FamDocAPI.request("/api/auth/logout", { method: "POST" });
      } catch (e) {}
      localStorage.removeItem("famdoc_token");
      localStorage.removeItem("famdoc_user");
      window.location.href = "/";
    },

    async requestPasswordReset(email) {
      return FamDocAPI.request("/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email })
      });
    },

    async verifyResetOTP(email, otpCode) {
      return FamDocAPI.request("/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({ email, otp_code: otpCode })
      });
    },

    async confirmPasswordReset(email, otpCode, newPassword) {
      return FamDocAPI.request("/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword })
      });
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
      const result = await FamDocAPI.request(`/api/family/members/${userId}`, {
        method: "DELETE"
      });
      ApiCache.invalidate("dashboard:stats");
      return result;
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

    async getAccounts() {
      return FamDocAPI.request("/api/storage/accounts");
    },

    async getGoogleAuthUrl(clientId, clientSecret, action = "connect") {
      return FamDocAPI.request("/api/storage/oauth/url", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId || null,
          client_secret: clientSecret || null,
          action: action || "connect"
        })
      });
    },

    async updateAccount(accountId, payload) {
      const result = await FamDocAPI.request(`/api/storage/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async disconnectAccount(accountId) {
      const result = await FamDocAPI.request(`/api/storage/accounts/${accountId}/disconnect`, {
        method: "POST"
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async deleteAccount(accountId) {
      const result = await FamDocAPI.request(`/api/storage/accounts/${accountId}`, {
        method: "DELETE"
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async updateMode(storageProvider) {
      const result = await FamDocAPI.request("/api/storage/config/mode", {
        method: "POST",
        body: JSON.stringify({
          storage_provider: storageProvider
        })
      });
      ApiCache.invalidateOnMutation();
      return result;
    }
  },


  // Folder Endpoints
  folders: {
    async getFolders() {
      const cacheKey = "folders:all";
      return ApiCache.deduplicatedFetch(cacheKey, () => FamDocAPI.request("/api/folders"), 15000);
    },

    async create(name, parentId = null) {
      const result = await FamDocAPI.request("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name, parent_id: parentId })
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async rename(folderId, name) {
      const result = await FamDocAPI.request(`/api/folders/${folderId}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async move(folderId, parentId) {
      const result = await FamDocAPI.request(`/api/folders/${folderId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: parentId })
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async delete(folderId) {
      const result = await FamDocAPI.request(`/api/folders/${folderId}`, {
        method: "DELETE"
      });
      ApiCache.invalidateOnMutation();
      return result;
    }
  },

  // File Endpoints
  files: {
    async getFiles(folderId = null) {
      let path = "/api/files";
      if (folderId !== null) {
        path += `?folder_id=${folderId === "root" ? "root" : folderId}`;
      }
      const cacheKey = `files:${folderId}`;
      return ApiCache.deduplicatedFetch(cacheKey, () => FamDocAPI.request(path), 15000);
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
          
          const token = localStorage.getItem("famdoc_token");
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
              ApiCache.invalidateOnMutation();
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

      const result = await FamDocAPI.request("/api/files/upload", {
        method: "POST",
        body: formData
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async rename(fileId, filename) {
      const result = await FamDocAPI.request(`/api/files/${fileId}`, {
        method: "PUT",
        body: JSON.stringify({ filename })
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async move(fileId, folderId) {
      const result = await FamDocAPI.request(`/api/files/${fileId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ folder_id: folderId })
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async delete(fileId) {
      const result = await FamDocAPI.request(`/api/files/${fileId}`, {
        method: "DELETE"
      });
      ApiCache.invalidateOnMutation();
      return result;
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
      const result = await FamDocAPI.request(`/api/recycle-bin/${itemType}/${itemId}/restore`, {
        method: "POST"
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async purge(itemType, itemId) {
      const result = await FamDocAPI.request(`/api/recycle-bin/${itemType}/${itemId}/purge`, {
        method: "DELETE"
      });
      ApiCache.invalidateOnMutation();
      return result;
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
      const queryStr = queryParams.toString();
      const cacheKey = `search:${queryStr}`;
      return ApiCache.deduplicatedFetch(cacheKey, () => FamDocAPI.request(`/api/search?${queryStr}`), 10000);
    }
  },

  // Dashboard Endpoint
  dashboard: {
    async getStats() {
      const cacheKey = "dashboard:stats";
      return ApiCache.deduplicatedFetch(cacheKey, () => FamDocAPI.request("/api/dashboard/stats"), 30000);
    }
  },

  // Sharing Endpoints
  sharing: {
    async createLink(fileId, password = null, expiresAt = null, maxDownloads = null) {
      const result = await FamDocAPI.request(`/api/files/${fileId}/share`, {
        method: "POST",
        body: JSON.stringify({
          password,
          expires_at: expiresAt,
          max_downloads: maxDownloads
        })
      });
      ApiCache.invalidateOnMutation();
      return result;
    },

    async getLinks(fileId) {
      return FamDocAPI.request(`/api/files/${fileId}/share`);
    },

    async revokeLink(token) {
      const result = await FamDocAPI.request(`/api/shared/links/${token}`, {
        method: "DELETE"
      });
      ApiCache.invalidateOnMutation();
      return result;
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

    cacheImageThumbnail(img, fileId, isPdf = false) {
      img.classList.add("loaded");
      
      const container = img.closest(".thumbnail-wrapper");
      if (container) {
        const fallback = container.querySelector(".thumbnail-fallback");
        if (fallback) fallback.style.opacity = "0";
      }

      const cacheKey = isPdf ? ("famdoc-pdf-thumb-" + fileId) : ("famdoc-image-thumb-" + fileId);
      
      if (localStorage.getItem(cacheKey)) {
        return;
      }
      
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        const targetWidth = 120;
        const scale = targetWidth / img.naturalWidth;
        canvas.width = targetWidth;
        canvas.height = img.naturalHeight * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        
        try {
          localStorage.setItem(cacheKey, dataUrl);
        } catch (storageErr) {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("famdoc-image-thumb-") || key.startsWith("famdoc-pdf-thumb-"))) {
              localStorage.removeItem(key);
            }
          }
          try {
            localStorage.setItem(cacheKey, dataUrl);
          } catch (retryErr) {}
        }
      } catch (err) {
        console.warn("Failed to cache image thumbnail client-side:", err);
      }
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

// Expose cache globally for other modules
window.ApiCache = ApiCache;
