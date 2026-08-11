/**
 * FamDoc SPA Application Manager
 */
(function() {
  let cachedUser = null;
  let layoutInjected = false;

  window.FamDocApp = {
    // Retrieve cached or fresh profile details
    getUser: async function() {
      if (cachedUser) return cachedUser;
      
      const cached = localStorage.getItem("famdoc_user");
      if (cached) {
        cachedUser = JSON.parse(cached);
        return cachedUser;
      }

      try {
        cachedUser = await FamDocAPI.auth.me();
        localStorage.setItem("famdoc_user", JSON.stringify(cachedUser));
        return cachedUser;
      } catch (err) {
        console.error("Failed to load user profile:", err);
        return null;
      }
    },

    // Injects sidebar, header, navigation shell
    ensureLayoutInjected: async function() {
      const container = document.getElementById("famdoc-layout-container");
      if (!container) return;

      const user = await this.getUser();
      if (!user) {
        // Session validation failed, logout immediately
        localStorage.removeItem("famdoc_token");
        localStorage.removeItem("famdoc_user");
        window.FamDocRouter.navigate('/');
        return;
      }

      // If family association check fails, configure default setup
      if (!user.family_id && user.role === "admin") {
        try {
          const defaultName = `${user.username}'s Family`;
          await FamDocAPI.family.setup(defaultName, 10);
          const freshUser = await FamDocAPI.auth.me();
           localStorage.setItem("famdoc_user", JSON.stringify(freshUser));
          cachedUser = freshUser;
          FamDocAPI.utils.showToast(`Initialized family vault: ${defaultName}`, "success");
        } catch (err) {
          console.error("Auto family vault setup failed:", err);
        }
      }

      // Update sidebar state if already injected
      const existingWrapper = container.querySelector(".layout-wrapper");
      if (existingWrapper) {
        this.updateActiveNavLinks();
        this.updateSidebarUserBadge(user);
        return;
      }

      // 1. Create layout shell structure
      const layoutWrapper = document.createElement("div");
      layoutWrapper.className = "layout-wrapper";

      // 2. Build Mobile Header
      const mobileHeader = document.createElement("div");
      mobileHeader.className = "mobile-header";
      mobileHeader.innerHTML = `
        <a href="#/dashboard" class="sidebar-logo" style="margin-bottom: 0; font-size: 1.25rem;">
          <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
          <span class="brand-text">Fam<span class="highlight">Doc</span></span>
        </a>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="theme-toggle-btn" id="mobileThemeToggle" aria-label="Toggle dark mode">
            <i class="fas fa-moon"></i>
          </button>
          <button class="hamburger" id="hamburgerToggle" aria-label="Toggle navigation menu">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      `;

      // 3. Build Sidebar Drawer
      const sidebar = document.createElement("nav");
      sidebar.className = "sidebar fd-fade-in";
      sidebar.id = "sidebarMenu";
      sidebar.innerHTML = `
        <a href="#/dashboard" class="sidebar-logo">
          <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
          <span class="brand-text">Fam<span class="highlight">Doc</span></span>
        </a>
        
        <div class="sidebar-nav">
          <a href="#/dashboard" class="nav-item" data-route="/dashboard">
            <i class="fas fa-th-large"></i>
            <span>Dashboard</span>
          </a>
          <a href="#/vault" class="nav-item" data-route="/vault">
            <i class="fas fa-archive"></i>
            <span>Shared Vault</span>
          </a>
          <a href="#/trash" class="nav-item" data-route="/trash">
            <i class="fas fa-trash-alt"></i>
            <span>Recycle Bin</span>
          </a>
          <a href="#/family" class="nav-item" data-route="/family">
            <i class="fas fa-users"></i>
            <span>Family Group</span>
          </a>
          ${user.role === 'admin' ? `
          <a href="#/storage" class="nav-item" data-route="/storage" id="sidebar-storage-link">
            <i class="fas fa-hdd"></i>
            <span>Storage Config</span>
          </a>
          ` : ''}
        </div>

        <div class="sidebar-footer">
          <div class="theme-toggle-row" style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-ink-muted);">Appearance</span>
            <button id="desktopThemeToggle" class="theme-toggle-btn" aria-label="Toggle dark mode">
              <i class="fas fa-moon"></i>
            </button>
          </div>
          <div class="user-profile-badge" style="cursor: pointer;" id="sidebar-profile-badge">
            <div class="user-avatar">${user.username ? user.username.substring(0, 2).toUpperCase() : "U"}</div>
            <div class="user-info">
              <span class="user-name">${user.username || 'User'}</span>
              <span class="user-role">${user.role || 'Member'}</span>
            </div>
          </div>
          <button id="logoutBtn" class="btn btn-secondary" style="width: 100%; justify-content: center; gap: 0.5rem;">
            <i class="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      `;

      // 4. Drawer Backdrop Overlay
      const backdrop = document.createElement("div");
      backdrop.className = "drawer-backdrop";
      backdrop.id = "drawerBackdrop";

      // 5. Mobile Bottom Navigation
      const bottomNav = document.createElement("nav");
      bottomNav.className = "bottom-nav";
      bottomNav.innerHTML = `
        <a href="#/dashboard" class="nav-btn" data-route="/dashboard">
          <i class="fas fa-th-large"></i>
          <span>Home</span>
        </a>
        <a href="#/vault" class="nav-btn" data-route="/vault">
          <i class="fas fa-archive"></i>
          <span>Vault</span>
        </a>
        <a href="#/family" class="nav-btn" data-route="/family">
          <i class="fas fa-users"></i>
          <span>Family</span>
        </a>
        <a href="#" class="nav-btn" id="bottomNavMore">
          <i class="fas fa-ellipsis-h"></i>
          <span>More</span>
        </a>
        <a href="#/profile" class="nav-btn" data-route="/profile">
          <i class="fas fa-user"></i>
          <span>Profile</span>
        </a>
      `;

      // 6. View Mount Point
      const mainContent = document.createElement("main");
      mainContent.className = "main-content";
      mainContent.id = "mainContent";
      mainContent.innerHTML = `<div id="view-mount-point"></div>`;

      // Assemble Shell
      layoutWrapper.appendChild(mobileHeader);
      layoutWrapper.appendChild(sidebar);
      layoutWrapper.appendChild(backdrop);
      layoutWrapper.appendChild(bottomNav);
      layoutWrapper.appendChild(mainContent);

      container.innerHTML = "";
      container.appendChild(layoutWrapper);
      layoutInjected = true;

      // 7. Setup Handlers
      document.getElementById("logoutBtn").addEventListener("click", () => {
        FamDocAPI.auth.logout();
        cachedUser = null;
        layoutInjected = false;
        container.innerHTML = `<div id="view-mount-point"></div>`;
        this.destroyLayoutShell();
        window.FamDocRouter.navigate('/');
      });

      document.getElementById("sidebar-profile-badge").addEventListener("click", () => {
        window.FamDocRouter.navigate('/profile');
      });

      // Navigation menu controls
      const hamburger = document.getElementById("hamburgerToggle");
      const sidebarMenu = document.getElementById("sidebarMenu");
      const drawerBackdrop = document.getElementById("drawerBackdrop");
      const bottomNavMore = document.getElementById("bottomNavMore");

      const toggleSidebar = (e) => {
        if (e) e.stopPropagation();
        sidebarMenu.classList.toggle("open");
        
        if (sidebarMenu.classList.contains("open")) {
          drawerBackdrop.classList.add("show");
          if (hamburger) hamburger.querySelector("i").className = "fas fa-times";
        } else {
          drawerBackdrop.classList.remove("show");
          if (hamburger) hamburger.querySelector("i").className = "fas fa-bars";
        }
      };

      const closeSidebar = () => {
        if (sidebarMenu.classList.contains("open")) {
          sidebarMenu.classList.remove("open");
          drawerBackdrop.classList.remove("show");
          if (hamburger) hamburger.querySelector("i").className = "fas fa-bars";
        }
      };

      if (hamburger) hamburger.addEventListener("click", toggleSidebar);
      if (bottomNavMore) {
        bottomNavMore.addEventListener("click", (e) => {
          e.preventDefault();
          toggleSidebar(e);
        });
      }
      if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeSidebar);
      mainContent.addEventListener("click", closeSidebar);
      
      // Auto close sidebar drawer on mobile after clicking navigation links
      sidebar.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", closeSidebar);
      });
      document.getElementById("sidebar-profile-badge").addEventListener("click", closeSidebar);

      // Force update theme icons
      if (window.FamDocTheme) {
        window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
      }

      // Load background sync worker
      if (!document.getElementById("famdoc-upload-manager-script")) {
        const uploadScript = document.createElement("script");
        uploadScript.id = "famdoc-upload-manager-script";
        uploadScript.src = "/js/upload-manager.js";
        document.body.appendChild(uploadScript);
      }

      this.updateActiveNavLinks();
      container.classList.add("ready");
      document.body.classList.add("layout-active");
    },

    // Removes structure wrapper when returning to landing/login
    destroyLayoutShell: function() {
      const container = document.getElementById("famdoc-layout-container");
      if (!container) return;

      const hasWrapper = container.querySelector(".layout-wrapper");
      if (hasWrapper) {
        container.classList.remove("ready");
        document.body.classList.remove("layout-active");
        container.innerHTML = `<div id="view-mount-point"></div>`;
        layoutInjected = false;
        container.classList.add("ready");
      }
    },

    // Highlights links based on routing paths
    updateActiveNavLinks: function() {
      const path = window.FamDocRouter.getRoutePath();
      
      document.querySelectorAll(".sidebar .nav-item, .bottom-nav .nav-btn").forEach(link => {
        const route = link.getAttribute("data-route");
        if (route && path === route) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });
    },

    // Update uploader profiles
    updateSidebarUserBadge: function(user) {
      const existingBadge = document.getElementById("sidebar-profile-badge");
      if (!existingBadge) return;

      const avatar = existingBadge.querySelector(".user-avatar");
      if (avatar) avatar.textContent = user.username ? user.username.substring(0, 2).toUpperCase() : "U";

      const name = existingBadge.querySelector(".user-name");
      if (name) name.textContent = user.username || 'User';

      const role = existingBadge.querySelector(".user-role");
      if (role) role.textContent = user.role || 'Member';

      // Dynamically add/remove storage configuration link based on admin status
      const navContainer = document.querySelector(".sidebar-nav");
      if (navContainer) {
        let storageLink = document.getElementById("sidebar-storage-link");
        if (user.role === 'admin' && !storageLink) {
          const a = document.createElement("a");
          a.href = "#/storage";
          a.className = "nav-item";
          a.id = "sidebar-storage-link";
          a.setAttribute("data-route", "/storage");
          a.innerHTML = `
            <i class="fas fa-hdd"></i>
            <span>Storage Config</span>
          `;
          navContainer.appendChild(a);
          this.updateActiveNavLinks();
        } else if (user.role !== 'admin' && storageLink) {
          storageLink.remove();
        }
      }
    },

    // Reset session caches
    clearSession: function() {
      cachedUser = null;
      localStorage.removeItem("famdoc_user");
      localStorage.removeItem("famdoc_token");
    }
  };
})();
