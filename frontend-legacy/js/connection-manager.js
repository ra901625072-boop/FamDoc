/**
 * FamDoc Backend Connection and Health Manager
 */
(function() {
  const STATUS = {
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    SLOW: 'SLOW',
    OFFLINE: 'OFFLINE',
    ERROR: 'ERROR'
  };

  class ConnectionManager {
    constructor() {
      this.status = STATUS.CONNECTING;
      this.queuedRequests = [];
      this.retryCount = 0;
      this.maxRetries = 5;
      this.checkTimer = null;
      this.slowTimer = null;
      this.reconnectTimer = null;
      this.pillEl = null;
      this.isChecking = false;

      // Event listeners for connection state changes
      this.listeners = [];

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.init());
      } else {
        this.init();
      }
    }

    init() {
      this.pillEl = document.getElementById("famdoc-connection-indicator");
      if (!this.pillEl) {
        this.createPillElement();
      }
      
      // Listen for browser online/offline events
      window.addEventListener('online', () => this.handleBrowserOnline());
      window.addEventListener('offline', () => this.handleBrowserOffline());

      // Start initial connection check
      this.checkConnection();
    }

    createPillElement() {
      this.pillEl = document.createElement("div");
      this.pillEl.id = "famdoc-connection-indicator";
      this.pillEl.className = "hidden";
      this.pillEl.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">Connecting...</span>
        <button class="status-retry-btn" style="display: none;" aria-label="Retry connection">
          <i class="fas fa-redo-alt"></i>
        </button>
      `;
      document.body.appendChild(this.pillEl);

      // Bind retry button
      const retryBtn = this.pillEl.querySelector(".status-retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.retryConnection();
        });
      }
    }

    subscribe(callback) {
      this.listeners.push(callback);
      // Call immediately with current status
      callback(this.status);
      return () => {
        this.listeners = this.listeners.filter(cb => cb !== callback);
      };
    }

    notify() {
      this.listeners.forEach(cb => cb(this.status));
      this.updatePillUI();
    }

    setStatus(newStatus) {
      if (this.status === newStatus) return;
      console.log(`[Connection] Status changed: ${this.status} -> ${newStatus}`);
      this.status = newStatus;
      this.notify();
    }

    async checkConnection(isManualRetry = false) {
      if (this.isChecking) return;
      this.isChecking = true;

      if (isManualRetry) {
        this.retryCount = 0;
      }

      // If browser reports offline, go to OFFLINE immediately
      if (navigator.onLine === false) {
        this.isChecking = false;
        this.setStatus(STATUS.OFFLINE);
        this.rejectQueuedRequests(new Error("Offline: No internet connection"));
        return;
      }

      // Set a timer to transition to SLOW if connection takes too long (> 3000ms)
      if (this.status === STATUS.CONNECTING) {
        if (this.slowTimer) clearTimeout(this.slowTimer);
        this.slowTimer = setTimeout(() => {
          if (this.status === STATUS.CONNECTING) {
            this.setStatus(STATUS.SLOW);
          }
        }, 3000);
      }

      try {
        // Fetch health endpoint with cache busting
        const healthUrl = `/api/health?_t=${Date.now()}`;
        const baseUrl = window.FamDocAPI_BaseURL || "";
        const fullUrl = (baseUrl && healthUrl.startsWith("/")) 
          ? `${baseUrl}${healthUrl}` 
          : healthUrl;

        // Perform health check fetch with 15s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(fullUrl, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.status === "ok") {
            if (this.slowTimer) clearTimeout(this.slowTimer);
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            
            const prevStatus = this.status;
            this.setStatus(STATUS.CONNECTED);
            this.retryCount = 0;
            
            // Release queued requests
            this.resolveQueuedRequests();
            
            // Reconnection targeted synchronization
            const wasDisconnected = prevStatus === STATUS.OFFLINE || prevStatus === STATUS.ERROR;
            if (wasDisconnected && this.queuedRequests.length === 0 && window.FamDocDataSync) {
              console.log("[Connection] Restored/Established. Syncing active view...");
              window.FamDocDataSync.sync();
            }
            
            this.isChecking = false;
            return;
          }
        }
        throw new Error("Invalid health check response");
      } catch (err) {
        if (this.slowTimer) clearTimeout(this.slowTimer);
        console.warn(`[Connection] Health check failed (attempt ${this.retryCount + 1}):`, err);
        
        this.isChecking = false;
        this.handleFailure();
      }
    }

    handleFailure() {
      this.retryCount++;
      
      // Determine retry delay using exponential backoff with jitter
      // 1.5s, 3s, 6s, 12s, max 15s
      const delay = Math.min(1500 * Math.pow(2, this.retryCount - 1), 15000);
      
      if (this.retryCount <= this.maxRetries) {
        // Still retrying, status remains CONNECTING or SLOW
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.checkConnection();
        }, delay);
      } else {
        // Exceeded retries, transition to ERROR or OFFLINE
        if (navigator.onLine === false) {
          this.setStatus(STATUS.OFFLINE);
        } else {
          this.setStatus(STATUS.ERROR);
        }
        // Reject all queued requests so UI shows error state rather than hanging forever
        this.rejectQueuedRequests(new Error("Service unavailable. Please check backend connection."));
      }
    }

    retryConnection() {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.slowTimer) clearTimeout(this.slowTimer);
      this.setStatus(STATUS.CONNECTING);
      this.checkConnection(true);
    }

    handleBrowserOnline() {
      console.log("[Connection] Browser online, checking connection...");
      this.retryConnection();
    }

    handleBrowserOffline() {
      console.log("[Connection] Browser offline.");
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.slowTimer) clearTimeout(this.slowTimer);
      this.setStatus(STATUS.OFFLINE);
      this.rejectQueuedRequests(new Error("Offline: No internet connection"));
    }

    handleRequestFailure(err) {
      // Called when an active API request fails due to connection issue
      // We only care about network errors or timeouts (AbortError)
      const isNetworkError = err instanceof TypeError || 
                             (err.message && (err.message.includes("Failed to fetch") || 
                                              err.message.includes("NetworkError") ||
                                              err.message.includes("timed out") ||
                                              err.message.includes("connection")));
      
      if (isNetworkError && this.status === STATUS.CONNECTED) {
        console.warn("[Connection] Lost connection to backend API.");
        this.setStatus(STATUS.OFFLINE);
        this.checkConnection(true); // check immediately
      }
    }

    queueRequest(req) {
      this.queuedRequests.push(req);
      
      // If we are in OFFLINE or ERROR state, let's trigger a reconnect automatically
      if (this.status === STATUS.OFFLINE || this.status === STATUS.ERROR) {
        this.retryConnection();
      }
    }

    resolveQueuedRequests() {
      const reqs = [...this.queuedRequests];
      this.queuedRequests = [];
      reqs.forEach(req => {
        try {
          req.resolve();
        } catch (e) {
          console.error("Error resolving queued request", e);
        }
      });
    }

    rejectQueuedRequests(err) {
      const reqs = [...this.queuedRequests];
      this.queuedRequests = [];
      reqs.forEach(req => {
        try {
          req.reject(err);
        } catch (e) {
          console.error("Error rejecting queued request", e);
        }
      });
    }

    updatePillUI() {
      if (!this.pillEl) return;

      // Remove all state classes
      this.pillEl.classList.remove("hidden", "state-connecting", "state-connected", "state-slow", "state-offline", "state-error");
      
      const dot = this.pillEl.querySelector(".status-dot");
      const text = this.pillEl.querySelector(".status-text");
      const retryBtn = this.pillEl.querySelector(".status-retry-btn");

      if (retryBtn) retryBtn.style.display = "none";

      switch (this.status) {
        case STATUS.CONNECTING:
          this.pillEl.classList.add("state-connecting");
          text.textContent = "Connecting to services...";
          // Hide for first 800ms
          if (this.retryCount === 0) {
            this.pillEl.classList.add("hidden");
            setTimeout(() => {
              if (this.status === STATUS.CONNECTING && this.pillEl.classList.contains("hidden")) {
                this.pillEl.classList.remove("hidden");
              }
            }, 800);
          } else {
            this.pillEl.classList.remove("hidden");
          }
          break;

        case STATUS.SLOW:
          this.pillEl.classList.add("state-slow");
          this.pillEl.classList.remove("hidden");
          text.textContent = "Waking up services...";
          break;

        case STATUS.CONNECTED:
          this.pillEl.classList.add("state-connected");
          text.textContent = "Connected";
          this.pillEl.classList.remove("hidden");
          // Fade out after 1.5s
          setTimeout(() => {
            if (this.status === STATUS.CONNECTED) {
              this.pillEl.classList.add("hidden");
            }
          }, 1500);
          break;

        case STATUS.OFFLINE:
          this.pillEl.classList.add("state-offline");
          this.pillEl.classList.remove("hidden");
          text.textContent = "Connection lost. Reconnecting...";
          if (retryBtn) retryBtn.style.display = "flex";
          break;

        case STATUS.ERROR:
          this.pillEl.classList.add("state-error");
          this.pillEl.classList.remove("hidden");
          text.textContent = "Service temporarily unavailable.";
          if (retryBtn) retryBtn.style.display = "flex";
          break;
      }
    }
  }

  // Data Synchronization Orchestrator
  window.FamDocDataSync = {
    activeView: null,
    refreshCallbacks: {},
    lastSyncTime: Date.now(),
    staleThresholdMs: 60000, // 1 minute

    register: function(viewName, callback) {
      this.refreshCallbacks[viewName] = callback;
      this.activeView = viewName;
      this.lastSyncTime = Date.now();
    },

    unregister: function(viewName) {
      if (this.activeView === viewName) {
        this.activeView = null;
      }
      delete this.refreshCallbacks[viewName];
    },

    sync: function(targetView) {
      // If backend is not connected, do not sync
      if (window.BackendConnectionManager && window.BackendConnectionManager.status !== "CONNECTED") {
        console.log("[DataSync] Sync skipped: Backend is not connected.");
        return;
      }

      this.lastSyncTime = Date.now();

      if (targetView) {
        if (this.activeView === targetView && this.refreshCallbacks[targetView]) {
          console.log(`[DataSync] Syncing active view: ${targetView}`);
          this.refreshCallbacks[targetView]();
        }
        return;
      }

      if (this.activeView && this.refreshCallbacks[this.activeView]) {
        console.log(`[DataSync] Syncing active view: ${this.activeView}`);
        this.refreshCallbacks[this.activeView]();
      }
    },

    checkStaleAndSync: function() {
      const elapsed = Date.now() - this.lastSyncTime;
      if (elapsed > this.staleThresholdMs) {
        console.log(`[DataSync] Focus detected. Data is stale by ${Math.round(elapsed / 1000)}s. Syncing...`);
        this.sync();
      }
    }
  };

  // Listen for window focus to trigger stale check
  window.addEventListener("focus", () => {
    if (window.FamDocDataSync) {
      window.FamDocDataSync.checkStaleAndSync();
    }
  });

  window.BackendConnectionManager = new ConnectionManager();
})();
