import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderLock,
  Users,
  Cloud,
  Trash2,
  Shield,
  LogOut,
  Menu,
  X,
  Smartphone,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCurrentUser } from '../../api/hooks';
import { ThemeToggle } from '../common/ThemeToggle';
import { ConnectionPill } from '../common/ConnectionPill';
import { UploadCard } from '../common/UploadCard';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuthStore();
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Shared Vault', to: '/vault', icon: FolderLock },
    { label: 'Family Group', to: '/family', icon: Users },
    { label: 'Cloud Storage', to: '/storage', icon: Cloud, id: 'sidebar-storage-link' },
    { label: 'Recycle Bin', to: '/trash', icon: Trash2 },
    { label: 'Profile & Security', to: '/profile', icon: Shield },
  ];

  const userInitials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'FD';
  const roleTitle = user?.role === 'admin' ? 'Vault Administrator' : 'Family Member';

  return (
    <div className="layout-wrapper min-h-screen flex flex-col md:flex-row bg-[var(--bg-linen)] text-[var(--text-ink)]">
      {/* Mobile Top App Bar */}
      <header className="mobile-header md:hidden flex items-center justify-between px-4 py-3 bg-[var(--appbar-bg)] text-white sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="hamburgerToggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hamburger p-1 rounded-lg hover:bg-white/10 text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-2 text-white no-underline">
            <img src="/img/logo.svg" alt="FamDoc Logo" className="h-7 w-7" />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg leading-tight tracking-tight">
                Fam<span className="text-emerald-300">Doc</span>
              </span>
              <span className="text-[10px] text-white/80 leading-none">Keepsake Vault</span>
            </div>
          </NavLink>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionPill />
          <ThemeToggle />
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <nav
        id="sidebarMenu"
        className={`sidebar fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface-card)] border-r border-[var(--border-paper)] flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header Banner */}
        <div className="p-4 bg-[var(--drawer-header-bg)] text-white border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <NavLink to="/dashboard" className="flex items-center gap-2 text-white no-underline">
              <img src="/img/logo.svg" alt="FamDoc" className="h-6 w-6" />
              <span className="font-bold text-base tracking-tight">
                Fam<span className="text-emerald-300">Doc</span>
              </span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-white/80 hover:text-white p-1"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            id="sidebar-profile-badge"
            onClick={() => {
              navigate('/profile');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer p-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-inner ring-2 ring-emerald-300/40">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate text-white">{user?.username || 'User'}</div>
              <div className="text-[11px] text-emerald-200 truncate">{roleTitle}</div>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="sidebar-nav flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={item.id}
                data-route={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--text-ink)] hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer p-3 border-t border-[var(--border-paper)] space-y-2 bg-[var(--surface-paper-tint)]/40">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-[var(--text-ink-muted)]">APPEARANCE</span>
            <ThemeToggle />
          </div>

          <a
            href="/apk/FamDoc.apk"
            download
            className="btn-apk-download flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-medium bg-[var(--surface-card)] hover:bg-[var(--surface-paper-hover)] border border-[var(--border-paper)] text-[var(--text-ink)] transition-colors no-underline shadow-xs"
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Get Android App</span>
          </a>

          <button
            type="button"
            id="btn-sidebar-logout"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-[var(--border-paper)] bg-[var(--surface-card)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[var(--text-ink)]">FamDoc Cloud Vault</h1>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionPill />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating Upload Queue Status Card */}
      <UploadCard />

      {/* Mobile Floating Bottom Nav */}
      <nav className="md:hidden fixed bottom-3 left-4 right-4 z-40 bg-[var(--surface-card)]/90 backdrop-blur-md border border-[var(--border-paper)] rounded-2xl shadow-xl flex items-center justify-around py-2 px-1">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-route={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--color-primary)] font-bold'
                    : 'text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
