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

      // 2. Build Mobile Header (Matches FamDocAppBar.kt)
      const mobileHeader = document.createElement("div");
      mobileHeader.className = "mobile-header";
      mobileHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <button class="hamburger" id="hamburgerToggle" aria-label="Toggle navigation menu">
            <i class="fas fa-bars"></i>
          </button>
          <a href="#/dashboard" class="mobile-brand-title" style="display: flex; align-items: center; gap: 0.5rem; text-decoration: none;">
            <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img" style="height: 28px; width: 28px;">
            <div style="display: flex; flex-direction: column;">
              <span class="brand-text" style="color: #FFFFFF; font-size: 1.15rem; line-height: 1.1; font-weight: 800;">Fam<span style="color: #6EE7B7;">Doc</span></span>
              <span style="font-size: 0.68rem; color: rgba(255, 255, 255, 0.8); font-weight: 400;">Keepsake Vault</span>
            </div>
          </a>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="theme-toggle-btn" id="mobileThemeToggle" aria-label="Toggle theme">
            <i class="fas fa-moon"></i>
          </button>
        </div>
      `;

      // 3. Build Sidebar Drawer (Matches FamDocDrawer.kt)
      const sidebar = document.createElement("nav");
      sidebar.className = "sidebar fd-fade-in";
      sidebar.id = "sidebarMenu";
      
      const userInitials = user.username ? user.username.substring(0, 2).toUpperCase() : "U";
      const isAdmin = user.role === "admin";
      const roleTitle = isAdmin ? "Vault Administrator" : "Family Member";

      sidebar.innerHTML = `
        <!-- Drawer Header Banner with Ambient Gradient & Pulsing Avatar -->
        <div class="drawer-header-banner">
          <div class="drawer-profile-info" id="sidebar-profile-badge" role="button" tabindex="0" title="View Profile">
            <div class="drawer-avatar-wrapper">
              <div class="user-avatar drawer-avatar pulsing-aura">
                ${userInitials}
              </div>
            </div>
            <div class="drawer-user-meta">
              <div class="drawer-user-name">${user.username || 'FamDoc User'}</div>
              <div class="drawer-role-badge">${roleTitle}</div>
              <div class="drawer-user-email">${user.email || ''}</div>
            </div>
          </div>
          <button class="sidebar-toggle-btn" id="sidebarCollapseBtn" type="button" aria-label="Close or collapse menu" title="Close or collapse menu">
            <i class="fas fa-chevron-left desktop-only"></i>
            <i class="fas fa-times mobile-only"></i>
          </button>
        </div>
        
        <!-- Navigation Items List -->
        <div class="sidebar-nav">
          <a href="#/dashboard" class="nav-item" data-route="/dashboard">
            <i class="fas fa-th-large"></i>
            <span>Dashboard</span>
          </a>
          <a href="#/vault" class="nav-item" data-route="/vault">
            <i class="fas fa-folder"></i>
            <span>Shared Vault</span>
          </a>
          <a href="#/family" class="nav-item" data-route="/family">
            <i class="fas fa-users"></i>
            <span>Family Group</span>
          </a>
          <a href="#/storage" class="nav-item" data-route="/storage" id="sidebar-storage-link">
            <i class="fas fa-cloud"></i>
            <span>Cloud Storage & Quotas</span>
          </a>
          <a href="#/trash" class="nav-item" data-route="/trash">
            <i class="fas fa-trash-alt"></i>
            <span>Recycle Bin</span>
          </a>
          <a href="#/profile" class="nav-item" data-route="/profile">
            <i class="fas fa-user-shield"></i>
            <span>Profile & Security</span>
          </a>
        </div>

        <!-- Sidebar Footer with Appearance Segmented Control & Sign Out -->
        <div class="sidebar-footer">
          <div class="drawer-section-label">APPEARANCE</div>
          <div class="theme-selector-container">
            ${window.FamDocTheme ? window.FamDocTheme.renderSegmentedSelectorHTML('sidebar') : ''}
          </div>
          
          <a href="/apk/FamDoc.apk" download class="btn-apk-download" title="Download Android APK">
            <i class="fab fa-android"></i>
            <span>Get Android App (APK)</span>
          </a>

          <div class="sidebar-footer-divider"></div>

          <button id="logoutBtn" class="btn btn-logout" style="width: 100%; justify-content: center; gap: 0.6rem;">
            <i class="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      `;

      // 4. Drawer Backdrop Overlay
      const backdrop = document.createElement("div");
      backdrop.className = "drawer-backdrop";
      backdrop.id = "drawerBackdrop";

      // 5. Mobile Bottom Navigation (Floating Pill Bar matching FamDocBottomNav.kt)
      const bottomNav = document.createElement("nav");
      bottomNav.className = "bottom-nav";
      bottomNav.innerHTML = `
        <a href="#/dashboard" class="nav-btn" data-route="/dashboard">
          <i class="fas fa-th-large"></i>
          <span>Dashboard</span>
        </a>
        <a href="#/vault" class="nav-btn" data-route="/vault">
          <i class="fas fa-folder"></i>
          <span>Vault</span>
        </a>
        <a href="#/family" class="nav-btn" data-route="/family">
          <i class="fas fa-users"></i>
          <span>Family</span>
        </a>
        <a href="#/trash" class="nav-btn" data-route="/trash">
          <i class="fas fa-trash-alt"></i>
          <span>Trash</span>
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

      // Floating Desktop Menu Toggle Button
      const desktopMenuToggle = document.createElement("button");
      desktopMenuToggle.className = "desktop-menu-toggle";
      desktopMenuToggle.id = "desktopMenuToggle";
      desktopMenuToggle.setAttribute("aria-label", "Open navigation menu");
      desktopMenuToggle.setAttribute("title", "Open navigation menu");
      desktopMenuToggle.innerHTML = `<i class="fas fa-bars"></i><span>Menu</span>`;

      // Assemble Shell
      layoutWrapper.appendChild(desktopMenuToggle);
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
        document.body.classList.remove("sidebar-collapsed");
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
      const collapseBtn = document.getElementById("sidebarCollapseBtn");

      const isMobile = () => window.innerWidth <= 768;

      const setSidebarCollapsed = (collapsed) => {
        if (collapsed) {
          document.body.classList.add("sidebar-collapsed");
          localStorage.setItem("famdoc-sidebar-collapsed", "true");
        } else {
          document.body.classList.remove("sidebar-collapsed");
          localStorage.setItem("famdoc-sidebar-collapsed", "false");
        }
      };

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

      if (collapseBtn) {
        collapseBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isMobile()) {
            closeSidebar();
          } else {
            setSidebarCollapsed(true);
          }
        });
      }

      desktopMenuToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        setSidebarCollapsed(false);
      });

      // Restore collapsed state on desktop
      if (!isMobile() && localStorage.getItem("famdoc-sidebar-collapsed") === "true") {
        setSidebarCollapsed(true);
      }

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

      const name = existingBadge.querySelector(".drawer-user-name, .user-name");
      if (name) name.textContent = user.username || 'FamDoc User';

      const email = existingBadge.querySelector(".drawer-user-email");
      if (email) email.textContent = user.email || '';

      const role = existingBadge.querySelector(".drawer-role-badge, .user-role");
      if (role) role.textContent = user.role === "admin" ? "Vault Administrator" : (user.role || 'Family Member');

      // Ensure active nav link state is updated
      this.updateActiveNavLinks();
    },

    // Reset session caches
    clearSession: function() {
      cachedUser = null;
      localStorage.removeItem("famdoc_user");
      localStorage.removeItem("famdoc_token");
    }
  };
})();
