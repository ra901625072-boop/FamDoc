/**
 * FamDoc Authentication & Layout Manager
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Determine page type
  const path = window.location.pathname;
  
  // Public shared link page doesn't require session redirects
  const isSharedPage = path.includes("shared.html");
  if (isSharedPage) {
    return;
  }

  // Landing / Home page should show for everyone and not auto-redirect
  const isLandingPage = path.includes("index.html") || 
                        path === "/" || 
                        path === "";

  // Guest-only authentication pages
  const isGuestAuthPage = path.includes("login.html") || 
                          path.includes("register.html") || 
                          path.includes("join.html");

  const token = localStorage.getItem("famdoc_token");

  if (isLandingPage) {
    return;
  }

  if (isGuestAuthPage) {
    // If logged in, redirect away from guest auth pages to dashboard
    if (token) {
      window.location.href = "/dashboard.html";
    }
    return;
  }

  // Protected pages require token
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  // Load user profile
  let user = null;
  try {
    user = await FamDocAPI.auth.me();
  } catch (error) {
    // Session expired or invalid
    FamDocAPI.utils.showToast("Your session has expired. Please log in again.", "error");
    setTimeout(() => {
      FamDocAPI.auth.logout();
    }, 1500);
    return;
  }

  // Check family association requirement
  if (!user.family_id) {
    if (user.role === "admin") {
      try {
        const defaultName = `${user.username}'s Family`;
        // Create the family vault
        const result = await FamDocAPI.family.setup(defaultName, 10);
        // Refresh profile to get the new family ID
        const freshUser = await FamDocAPI.auth.me();
        localStorage.setItem("famdoc_user", JSON.stringify(freshUser));
        FamDocAPI.utils.showToast(`Initialized family vault: ${defaultName}`, "success");
        // Reload page to reflect the new family setup
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        console.error("Auto family setup failed:", err);
      }
    } else {
      // Members must always belong to a family (registered via code)
      FamDocAPI.utils.showToast("Account error: No family associated.", "error");
      FamDocAPI.auth.logout();
      return;
    }
  }

  // Dynamic layout injection
  injectLayout(user);
});

function injectLayout(user) {
  const container = document.getElementById("famdoc-layout-container");
  if (!container) return;

  const currentPath = window.location.pathname;
  const isActive = (page) => currentPath.includes(page) ? "active" : "";

  // 1. Create Layout Wrapper
  const layoutWrapper = document.createElement("div");
  layoutWrapper.className = "layout-wrapper";

  // 2. Create Mobile Header
  const mobileHeader = document.createElement("div");
  mobileHeader.className = "mobile-header";
  mobileHeader.innerHTML = `
    <a href="/dashboard.html" class="sidebar-logo" style="margin-bottom: 0; font-size: 1.25rem;">
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

  // 3. Create Sidebar
  const sidebar = document.createElement("nav");
  sidebar.className = "sidebar fd-fade-in";
  sidebar.id = "sidebarMenu";
  sidebar.innerHTML = `
    <a href="/dashboard.html" class="sidebar-logo">
      <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
      <span class="brand-text">Fam<span class="highlight">Doc</span></span>
    </a>
    
    <div class="sidebar-nav">
      <a href="/dashboard.html" class="nav-item ${isActive('dashboard.html')}">
        <i class="fas fa-th-large"></i>
        <span>Dashboard</span>
      </a>
      <a href="/files.html" class="nav-item ${isActive('files.html')}">
        <i class="fas fa-archive"></i>
        <span>Shared Vault</span>
      </a>
      <a href="/recycle-bin.html" class="nav-item ${isActive('recycle-bin.html')}">
        <i class="fas fa-trash-alt"></i>
        <span>Recycle Bin</span>
      </a>
      <a href="/family.html" class="nav-item ${isActive('family.html')}">
        <i class="fas fa-users"></i>
        <span>Family Group</span>
      </a>
      ${user.role === 'admin' ? `
      <a href="/storage-config.html" class="nav-item ${isActive('storage-config.html')}">
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
      <div class="user-profile-badge" onclick="window.location.href='/profile.html'" style="cursor: pointer;">
        <div class="user-avatar">
          ${user.username ? user.username.substring(0, 2).toUpperCase() : "U"}
        </div>
        <div class="user-info">
          <span class="user-name">${user.username}</span>
          <span class="user-role">${user.role}</span>
        </div>
      </div>
      <button id="logoutBtn" class="btn btn-secondary" style="width: 100%; justify-content: center; gap: 0.5rem;">
        <i class="fas fa-sign-out-alt"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  // 4. Create Backdrop Overlay
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.id = "drawerBackdrop";

  // 5. Create Bottom Navigation Bar
  const bottomNav = document.createElement("nav");
  bottomNav.className = "bottom-nav";
  bottomNav.innerHTML = `
    <a href="/dashboard.html" class="nav-btn ${isActive('dashboard.html')}">
      <i class="fas fa-th-large"></i>
      <span>Home</span>
    </a>
    <a href="/files.html" class="nav-btn ${isActive('files.html')}">
      <i class="fas fa-archive"></i>
      <span>Vault</span>
    </a>
    <a href="/family.html" class="nav-btn ${isActive('family.html')}">
      <i class="fas fa-users"></i>
      <span>Family</span>
    </a>
    <a href="#" class="nav-btn" id="bottomNavMore">
      <i class="fas fa-ellipsis-h"></i>
      <span>More</span>
    </a>
    <a href="/profile.html" class="nav-btn ${isActive('profile.html')}">
      <i class="fas fa-user"></i>
      <span>Profile</span>
    </a>
  `;

  // 6. Create Main Content element
  const mainContent = document.createElement("main");
  mainContent.className = "main-content fd-page-enter";
  mainContent.id = "mainContent";

  // Move all existing children of container into mainContent (preserves event listeners!)
  while (container.firstChild) {
    mainContent.appendChild(container.firstChild);
  }

  // 7. Append to layout wrapper
  layoutWrapper.appendChild(mobileHeader);
  layoutWrapper.appendChild(sidebar);
  layoutWrapper.appendChild(backdrop);
  layoutWrapper.appendChild(bottomNav);
  layoutWrapper.appendChild(mainContent);

  // 8. Put layoutWrapper back into container
  container.appendChild(layoutWrapper);

  // Attach logout handler
  document.getElementById("logoutBtn").addEventListener("click", () => {
    FamDocAPI.auth.logout();
  });

  // Navigation toggle listeners
  const hamburger = document.getElementById("hamburgerToggle");
  const sidebarMenu = document.getElementById("sidebarMenu");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const bottomNavMore = document.getElementById("bottomNavMore");

  const toggleSidebar = (e) => {
    if (e) e.stopPropagation();
    sidebarMenu.classList.toggle("open");
    
    // Toggle backdrop visibility
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

  // Hamburger click
  if (hamburger) {
    hamburger.addEventListener("click", toggleSidebar);
  }

  // "More" bottom nav item click
  if (bottomNavMore) {
    bottomNavMore.addEventListener("click", (e) => {
      e.preventDefault();
      toggleSidebar(e);
    });
  }

  // Backdrop click to close sidebar
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", closeSidebar);
  }

  // Close on main content click
  mainContent.addEventListener("click", closeSidebar);
}
