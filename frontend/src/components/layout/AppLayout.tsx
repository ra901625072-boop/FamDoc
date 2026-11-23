import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCurrentUser } from '../../api/hooks';
import { useThemeStore } from '../../stores/useThemeStore';
import { SegmentedThemeSelector } from '../common/SegmentedThemeSelector';
import { ConnectionPill } from '../common/ConnectionPill';
import { UploadCard } from '../common/UploadCard';
import { pageTransitionVariants, springs } from '../../lib/motion';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_sidebar_collapsed') === 'true' : false;
  });
  const { logout } = useAuthStore();
  const { data: user } = useCurrentUser();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('famdoc_sidebar_collapsed', String(sidebarCollapsed));
    }
    return () => {
      document.body.classList.remove('sidebar-collapsed');
    };
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', mobileMenuOpen);
    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', iconClass: 'fas fa-th-large' },
    { label: 'Shared Vault', to: '/vault', iconClass: 'fas fa-folder' },
    { label: 'Family Group', to: '/family', iconClass: 'fas fa-users' },
    { label: 'Cloud Storage & Quotas', to: '/storage', iconClass: 'fas fa-cloud', id: 'sidebar-storage-link' },
    { label: 'Recycle Bin', to: '/trash', iconClass: 'fas fa-trash-alt' },
    { label: 'Profile & Security', to: '/profile', iconClass: 'fas fa-user-shield' },
  ];

  const userInitials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'FD';
  const roleTitle = user?.role === 'admin' ? 'Vault Administrator' : 'Family Member';

  return (
    <div className={`layout-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Floating Desktop Menu Toggle (re-opens sidebar when collapsed on desktop) */}
      {sidebarCollapsed && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileTap={{ scale: 0.96 }}
          className="desktop-menu-toggle"
          id="desktopMenuToggle"
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <i className="fas fa-bars" aria-hidden="true" />
          <span>Menu</span>
        </motion.button>
      )}

      {/* Mobile Top Header (Matches Android App & Old Web UI) */}
      <header className={`mobile-header ${isScrolled ? 'scrolled shadow-md' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="hamburger"
            id="hamburgerToggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'} aria-hidden="true" />
          </button>
          <NavLink
            to="/dashboard"
            className="mobile-brand-title"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <img src="/img/logo.svg" alt="FamDoc Logo" className="famdoc-logo-img" style={{ height: '28px', width: '28px' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-text" style={{ color: '#FFFFFF', fontSize: '1.15rem', lineHeight: 1.1, fontWeight: 800 }}>
                Fam<span style={{ color: '#60A5FA' }}>Doc</span>
              </span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                Keepsake Vault
              </span>
            </div>
          </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ConnectionPill />
          <button
            type="button"
            className="theme-toggle-btn"
            id="mobileThemeToggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Sidebar Drawer Backdrop (Mobile) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="drawer-backdrop show"
            id="drawerBackdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.gentle}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer (Matches FamDocDrawer.kt & Old Web UI exactly) */}
      <nav
        id="sidebarMenu"
        className={`sidebar fd-fade-in ${mobileMenuOpen ? 'open translate-x-0' : ''}`}
      >
        {/* Drawer Header Banner with Ambient Gradient & Pulsing Avatar */}
        <div className="drawer-header-banner">
          <div
            className="drawer-profile-info"
            id="sidebar-profile-badge"
            role="button"
            tabIndex={0}
            title="View Profile"
            onClick={() => {
              navigate('/profile');
              setMobileMenuOpen(false);
            }}
          >
            <div className="drawer-avatar-wrapper">
              <div className="user-avatar drawer-avatar pulsing-aura">
                {userInitials}
              </div>
            </div>
            <div className="drawer-user-meta">
              <div className="drawer-user-name">{user?.username || 'FamDoc User'}</div>
              <div className="drawer-role-badge">{roleTitle}</div>
              <div className="drawer-user-email" title={user?.email || ''}>{user?.email || ''}</div>
            </div>
          </div>
          <button
            className="sidebar-toggle-btn"
            id="sidebarCollapseBtn"
            type="button"
            aria-label="Close or collapse menu"
            title="Close or collapse menu"
            onClick={(e) => {
              e.stopPropagation();
              if (window.innerWidth <= 768) {
                setMobileMenuOpen(false);
              } else {
                setSidebarCollapsed(true);
              }
            }}
          >
            <i className="fas fa-chevron-left desktop-only" aria-hidden="true" />
            <i className="fas fa-times mobile-only" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.id}
              data-route={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={item.iconClass} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Sidebar Footer with Appearance Segmented Control & Sign Out */}
        <div className="sidebar-footer">
          <div className="drawer-section-label">APPEARANCE</div>
          <div className="theme-selector-container">
            <SegmentedThemeSelector idPrefix="sidebar" />
          </div>

          <a href="/apk/FamDoc.apk" download className="btn-apk-download" title="Download Android APK">
            <i className="fab fa-android" aria-hidden="true" />
            <span>Get Android App</span>
          </a>

          <div className="sidebar-footer-divider" />

          <button
            id="logoutBtn"
            type="button"
            className="btn btn-logout"
            style={{ width: '100%', justifyContent: 'center', gap: '0.6rem' }}
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Mobile Floating Bottom Nav (Matches FamDocBottomNav.kt & Old Web UI) */}
      <nav className="bottom-nav" id="bottomNav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fas fa-th-large" aria-hidden="true" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/vault" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fas fa-folder" aria-hidden="true" />
          <span>Vault</span>
        </NavLink>
        <NavLink to="/family" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fas fa-users" aria-hidden="true" />
          <span>Family</span>
        </NavLink>
        <NavLink to="/trash" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fas fa-trash-alt" aria-hidden="true" />
          <span>Trash</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
          <i className="fas fa-user" aria-hidden="true" />
          <span>Profile</span>
        </NavLink>
      </nav>

      {/* Main Content Area */}
      <main className="main-content" id="mainContent">
        {/* Floating Connection Pill */}
        <div className="fixed top-4 right-6 z-30 hidden md:block">
          <ConnectionPill />
        </div>

        <div id="view-mount-point" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Upload Queue Status Card */}
      <UploadCard />
    </div>
  );
}
