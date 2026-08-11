/**
 * FamDoc Background Operations Manager
 * Manages optimistic UI actions, queueing, undo countdowns, and background processing.
 */
class BackgroundOperationsManager {
  constructor() {
    this.queue = [];
    this.toastContainer = null;
    this.widgetEl = null;
    this.panelEl = null;
    this.lsKey = "famdoc_pending_actions";
    
    // Ensure DOM is ready before initializing UI elements
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.createUIElements();
    this.loadPendingOperations();
  }

  createUIElements() {
    // 1. Toast Container
    this.toastContainer = document.getElementById("famdoc-toast-container-custom");
    if (!this.toastContainer) {
      this.toastContainer = document.createElement("div");
      this.toastContainer.id = "famdoc-toast-container-custom";
      this.toastContainer.className = "famdoc-toast-container-custom";
      document.body.appendChild(this.toastContainer);
    }

    // 2. Activity Widget (Floating Pill)
    this.widgetEl = document.getElementById("bg-ops-widget");
    if (!this.widgetEl) {
      this.widgetEl = document.createElement("div");
      this.widgetEl.id = "bg-ops-widget";
      this.widgetEl.innerHTML = `
        <div class="indicator-dot"></div>
        <span class="widget-text">All activities completed</span>
      `;
      document.body.appendChild(this.widgetEl);
      
      this.widgetEl.addEventListener("click", () => this.togglePanel());
    }

    // 3. Activity Panel (Popover Card)
    this.panelEl = document.getElementById("bg-ops-panel");
    if (!this.panelEl) {
      this.panelEl = document.createElement("div");
      this.panelEl.id = "bg-ops-panel";
      this.panelEl.innerHTML = `
        <div class="bg-ops-header">
          <h4>Background Activities</h4>
          <button class="close-btn" aria-label="Close panel"><i class="fas fa-times"></i></button>
        </div>
        <div class="bg-ops-list">
          <div class="bg-ops-empty">
            <i class="fas fa-tasks text-muted"></i>
            <span>No recent activities</span>
          </div>
        </div>
      `;
      document.body.appendChild(this.panelEl);

      // Close button listener
      this.panelEl.querySelector(".close-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePanel(false);
      });

      // Close when clicking outside
      document.addEventListener("click", (e) => {
        if (!this.panelEl.contains(e.target) && !this.widgetEl.contains(e.target)) {
          this.togglePanel(false);
        }
      });
    }
  }

  togglePanel(forceShow) {
    if (!this.panelEl) return;
    if (forceShow !== undefined) {
      if (forceShow) this.panelEl.classList.add("show");
      else this.panelEl.classList.remove("show");
    } else {
      this.panelEl.classList.toggle("show");
    }
  }

  /**
   * Adds a new operation to the queue
   * @param {Object} op Details of the operation
   * @param {string} op.type 'delete-file' or 'delete-folder'
   * @param {number} op.itemId The backend database ID
   * @param {string} op.name File or folder display name
   * @param {Function} op.onExecute Async function that triggers the actual API call
   * @param {Function} op.onUndo Function that restores the item in the local UI state
   */
  addOperation(op) {
    const id = "op_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const newOp = {
      id,
      type: op.type,
      itemId: op.itemId,
      name: op.name,
      status: "pending", // pending, running, completed, error, undone
      timestamp: Date.now(),
      errorMsg: null,
      onExecute: op.onExecute,
      onUndo: op.onUndo,
      duration: 5000 // 5 seconds undo window
    };

    this.queue.push(newOp);
    this.saveQueue();
    this.updateUI();

    // Trigger Undo Toast
    this.showUndoToast(newOp);

    // Start Undo Timer
    newOp.countdownTimer = setTimeout(() => {
      this.executeOperation(newOp.id);
    }, newOp.duration);
  }

  async executeOperation(opId) {
    const op = this.queue.find(x => x.id === opId);
    if (!op || op.status !== "pending") return;

    op.status = "running";
    this.updateUI();
    this.saveQueue();

    try {
      if (op.onExecute) {
        await op.onExecute();
      }
      op.status = "completed";
      if (window.FamDocDataSync) {
        window.FamDocDataSync.sync();
      }
    } catch (err) {
      op.status = "error";
      op.errorMsg = err.message || "Failed to execute backend operation";
      
      // If error, show warning toast with retry option
      if (window.FamDocAPI && window.FamDocAPI.utils) {
        window.FamDocAPI.utils.showToast(`Error deleting "${op.name}": ${op.errorMsg}`, "error");
      }
      
      // Call undo locally since it failed to delete on the server
      if (op.onUndo) {
        try {
          op.onUndo();
        } catch (restoreErr) {
          console.error("Local restore failed after deletion error", restoreErr);
        }
      }
    }

    this.updateUI();
    this.saveQueue();
    if (typeof window.renderExplorer === "function") {
      window.renderExplorer();
    }
  }

  triggerUndo(opId) {
    const op = this.queue.find(x => x.id === opId);
    if (!op || op.status !== "pending") return;

    // Clear timer
    if (op.countdownTimer) {
      clearTimeout(op.countdownTimer);
    }

    op.status = "undone";
    
    // Remove undo toast immediately if visible
    const toast = document.getElementById(`toast_${opId}`);
    if (toast) {
      this.dismissToast(toast);
    }

    // Call undo logic
    if (op.onUndo) {
      op.onUndo();
    }

    if (window.FamDocAPI && window.FamDocAPI.utils) {
      window.FamDocAPI.utils.showToast(`Restored "${op.name}"`, "success");
    }

    this.updateUI();
    this.saveQueue();
    if (typeof window.renderExplorer === "function") {
      window.renderExplorer();
    }
  }

  async triggerRetry(opId) {
    const op = this.queue.find(x => x.id === opId);
    if (!op || op.status !== "error") return;

    // Run again
    op.status = "pending";
    this.updateUI();
    this.executeOperation(opId);
  }

  dismissOperation(opId) {
    const index = this.queue.findIndex(x => x.id === opId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.updateUI();
      this.saveQueue();
      if (typeof window.renderExplorer === "function") {
        window.renderExplorer();
      }
    }
  }

  showUndoToast(op) {
    if (!this.toastContainer) return;

    const toast = document.createElement("div");
    toast.id = `toast_${op.id}`;
    toast.className = "famdoc-alert-undo";
    
    const icon = op.type.includes("folder") ? "fa-folder-open" : "fa-file-alt";

    toast.innerHTML = `
      <div class="toast-message-content">
        <i class="fas ${icon}"></i>
        <span>Moving "${op.name}" to Recycle Bin</span>
      </div>
      <button class="undo-btn">Undo</button>
      <div class="toast-progress"></div>
    `;

    // Undo button action
    toast.querySelector(".undo-btn").addEventListener("click", () => {
      this.triggerUndo(op.id);
    });

    this.toastContainer.appendChild(toast);

    // Animate Progress Bar
    const progressBar = toast.querySelector(".toast-progress");
    // Force browser reflow to ensure the transition kicks off
    progressBar.getBoundingClientRect();
    progressBar.style.transition = `transform ${op.duration}ms linear`;
    progressBar.style.transform = "scaleX(0)";

    // Auto dismiss toast UI after 5s
    setTimeout(() => {
      if (toast.parentNode) {
        this.dismissToast(toast);
      }
    }, op.duration);
  }

  dismissToast(toast) {
    toast.style.animation = "toastExit 0.25s ease-in forwards";
    toast.addEventListener("animationend", () => {
      if (toast.parentNode) {
        toast.remove();
      }
    });
  }

  updateUI() {
    this.updateWidget();
    this.renderOpsList();
  }

  updateWidget() {
    if (!this.widgetEl) return;

    const activeOps = this.queue.filter(x => x.status === "pending" || x.status === "running");
    const errorOps = this.queue.filter(x => x.status === "error");

    if (this.queue.length === 0) {
      this.widgetEl.classList.remove("visible");
      return;
    }

    this.widgetEl.classList.add("visible");
    this.widgetEl.className = ""; // clear classes
    
    const textEl = this.widgetEl.querySelector(".widget-text");

    if (errorOps.length > 0) {
      this.widgetEl.classList.add("has-error");
      textEl.textContent = `${errorOps.length} operation${errorOps.length > 1 ? 's' : ''} failed`;
    } else if (activeOps.length > 0) {
      this.widgetEl.classList.add("is-syncing");
      textEl.textContent = `${activeOps.length} sync${activeOps.length > 1 ? 's' : ''} processing`;
    } else {
      textEl.textContent = "All syncs completed";
    }
  }

  renderOpsList() {
    if (!this.panelEl) return;

    const listEl = this.panelEl.querySelector(".bg-ops-list");
    if (!listEl) return;

    if (this.queue.length === 0) {
      listEl.innerHTML = `
        <div class="bg-ops-empty">
          <i class="fas fa-tasks text-muted"></i>
          <span>No recent activities</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = "";

    // Render items in reverse chronological order
    [...this.queue].reverse().forEach(op => {
      const itemEl = document.createElement("div");
      itemEl.className = "bg-ops-item";
      
      let statusIcon = "";
      let statusText = "";
      let actionBtn = "";
      let iconClass = "pending";

      const typeIcon = op.type.includes("folder") ? "fa-folder" : "fa-file";

      switch (op.status) {
        case "pending":
          statusIcon = `<i class="fas fa-spinner fa-spin"></i>`;
          statusText = "Pending undo...";
          actionBtn = `<button class="bg-ops-item-action-btn" data-action="undo" data-id="${op.id}">Undo</button>`;
          iconClass = "pending";
          break;
        case "running":
          statusIcon = `<i class="fas fa-sync fa-spin"></i>`;
          statusText = "Syncing in background...";
          iconClass = "running";
          break;
        case "completed":
          statusIcon = `<i class="fas fa-check-circle"></i>`;
          statusText = "Completed";
          actionBtn = `<button class="bg-ops-item-action-btn" style="color: var(--text-ink-muted);" data-action="dismiss" data-id="${op.id}"><i class="fas fa-times"></i></button>`;
          iconClass = "completed";
          break;
        case "error":
          statusIcon = `<i class="fas fa-exclamation-circle"></i>`;
          statusText = `Failed`;
          actionBtn = `
            <div style="display: flex; gap: 0.25rem;">
              <button class="bg-ops-item-action-btn retry-btn" data-action="retry" data-id="${op.id}">Retry</button>
              <button class="bg-ops-item-action-btn" style="color: var(--text-ink-muted);" data-action="dismiss" data-id="${op.id}"><i class="fas fa-times"></i></button>
            </div>
          `;
          iconClass = "error";
          break;
        case "undone":
          statusIcon = `<i class="fas fa-undo"></i>`;
          statusText = "Restored";
          actionBtn = `<button class="bg-ops-item-action-btn" style="color: var(--text-ink-muted);" data-action="dismiss" data-id="${op.id}"><i class="fas fa-times"></i></button>`;
          iconClass = "pending";
          break;
      }

      itemEl.innerHTML = `
        <div class="bg-ops-item-icon ${iconClass}">
          <i class="fas ${typeIcon}"></i>
        </div>
        <div class="bg-ops-item-details">
          <div class="bg-ops-item-name" title="${op.name}">${op.name}</div>
          <div class="bg-ops-item-status">
            ${statusIcon}
            <span>${statusText}</span>
          </div>
        </div>
        ${actionBtn}
      `;

      // Wire up action listeners
      const buttons = itemEl.querySelectorAll("button[data-action]");
      buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = btn.getAttribute("data-action");
          const id = btn.getAttribute("data-id");
          if (action === "undo") this.triggerUndo(id);
          else if (action === "retry") this.triggerRetry(id);
          else if (action === "dismiss") this.dismissOperation(id);
        });
      });

      listEl.appendChild(itemEl);
    });
  }

  saveQueue() {
    // Only persist tasks that are pending, running, or failed. Dismissed/completed tasks don't need to block UI on next load.
    // Also, clear countdown timers/callbacks since they can't be serialized.
    const serializable = this.queue
      .filter(x => x.status === "pending" || x.status === "running" || x.status === "error")
      .map(x => ({
        type: x.type,
        itemId: x.itemId,
        name: x.name,
        status: x.status === "pending" ? "pending" : x.status, // if it was pending, it will run on load
        timestamp: x.timestamp,
        errorMsg: x.errorMsg
      }));
    localStorage.setItem(this.lsKey, JSON.stringify(serializable));
  }

  async loadPendingOperations() {
    try {
      const stored = localStorage.getItem(this.lsKey);
      if (!stored) return;
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;

      for (const rawOp of parsed) {
        // Create actual operation
        const id = "op_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const op = {
          id,
          type: rawOp.type,
          itemId: rawOp.itemId,
          name: rawOp.name,
          status: "pending", // execute immediately
          timestamp: rawOp.timestamp,
          errorMsg: rawOp.errorMsg,
          onExecute: async () => {
            if (rawOp.type === "delete-file") {
              await window.FamDocAPI.files.delete(rawOp.itemId);
            } else if (rawOp.type === "delete-folder") {
              await window.FamDocAPI.folders.delete(rawOp.itemId);
            }
          },
          onUndo: null // can't undo across sessions
        };

        this.queue.push(op);
        this.executeOperation(op.id);
      }
    } catch (e) {
      console.error("Failed to restore background operations queue", e);
    }
  }
}

// Instantiate globally
window.BackgroundManager = new BackgroundOperationsManager();
