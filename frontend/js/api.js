/**
 * FamDoc API Client Wrapper
 */
const FamDocAPI = {
  // Base request method
  async request(path, options = {}) {
    const token = localStorage.getItem("famdoc_token");
    const headers = options.headers || {};

    // Don't set Content-Type if we're sending FormData (browser does it automatically with boundary)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOptions = {
      ...options,
      headers
    };

    try {
      const response = await fetch(path, fetchOptions);

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        // Only redirect if we're not on a public page or already trying to login
        const isPublicPage = window.location.pathname.includes("index.html") || 
                             window.location.pathname.includes("login.html") || 
                             window.location.pathname.includes("register.html") || 
                             window.location.pathname.includes("join.html") || 
                             window.location.pathname.includes("shared.html") ||
                             window.location.pathname === "/";
        
        if (!isPublicPage) {
          localStorage.removeItem("famdoc_token");
          localStorage.removeItem("famdoc_user");
          window.location.href = "/login.html";
          return null;
        }
      }

      if (!response.ok) {
        // Parse error details
        let errorMsg = "Something went wrong";
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      // Check if response is empty
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
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

    async joinFamily(username, email, secretCode) {
      const data = await FamDocAPI.request("/api/auth/family-login", {
        method: "POST",
        body: JSON.stringify({ username, email, secret_code: secretCode })
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

    async configureMega(email, password) {
      return FamDocAPI.request("/api/storage/config/mega", {
        method: "POST",
        body: JSON.stringify({ email, password })
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
          xhr.open("POST", "/api/files/upload");
          
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
      return `/api/files/${fileId}/download`;
    },

    getPreviewUrl(fileId) {
      return `/api/files/${fileId}/preview`;
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
        const response = await fetch(`/api/shared/${token}/download`, {
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
      toast.className = `famdoc-alert famdoc-alert-${type === "error" ? "warning" : type}`;
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
