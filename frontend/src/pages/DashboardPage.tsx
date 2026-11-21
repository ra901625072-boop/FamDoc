import { Link } from 'react-router-dom';
import { useDashboardStats, useFamilyDetails } from '../api/hooks';
import { api } from '../api/client';
import {
  FileText,
  Folder,
  Database,
  Users,
  Upload,
  FolderPlus,
  UserPlus,
  Cloud,
  PieChart,
} from 'lucide-react';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: family } = useFamilyDetails();

  const totalFiles = stats?.total_files ?? 0;
  const totalFolders = stats?.total_folders ?? 0;
  const totalSize = stats?.total_storage_bytes ?? 0;
  const memberCount = family?.member_count ?? 1;

  const categories = stats?.category_breakdown || {
    video: 0,
    images: 0,
    pdfs: 0,
    docs: 0,
    sheets: 0,
    text: 0,
    other: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Family Vault Dashboard</h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            {family?.name ? `${family.name}'s Unified Cloud Vault` : 'Welcome to your family document space'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/vault"
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition-colors no-underline"
          >
            Open Vault
          </Link>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/vault?action=upload"
          id="btn-quick-upload"
          className="quick-action-btn flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-xs transition-all text-[var(--text-ink)] no-underline group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold">Upload Files</div>
            <div className="text-[10px] text-[var(--text-ink-muted)]">Add to vault</div>
          </div>
        </Link>

        <Link
          to="/vault?action=new-folder"
          id="btn-quick-folder"
          className="quick-action-btn flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-xs transition-all text-[var(--text-ink)] no-underline group"
        >
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold">New Folder</div>
            <div className="text-[10px] text-[var(--text-ink-muted)]">Create subfolder</div>
          </div>
        </Link>

        <Link
          to="/profile?invite=true"
          id="btn-quick-invite"
          className="quick-action-btn flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-xs transition-all text-[var(--text-ink)] no-underline group"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold">Invite Member</div>
            <div className="text-[10px] text-[var(--text-ink-muted)]">Share secret code</div>
          </div>
        </Link>

        <Link
          to="/storage"
          id="btn-quick-storage"
          className="quick-action-btn flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-xs transition-all text-[var(--text-ink)] no-underline group"
        >
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold">Storage Pool</div>
            <div className="text-[10px] text-[var(--text-ink-muted)]">Manage accounts</div>
          </div>
        </Link>
      </div>

      {/* Dashboard Statistics Grid (4 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid">
        <div
          id="card-stat-files"
          className="stat-card p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-ink-muted)] stat-label">Total Files</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 stat-icon">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div id="stat-files" className="stat-val text-2xl font-extrabold text-[var(--text-ink)]">
            {statsLoading ? '...' : totalFiles}
          </div>
        </div>

        <div
          id="card-stat-folders"
          className="stat-card p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-ink-muted)] stat-label">Folders</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 stat-icon">
              <Folder className="w-4 h-4" />
            </div>
          </div>
          <div id="stat-folders" className="stat-val text-2xl font-extrabold text-[var(--text-ink)]">
            {statsLoading ? '...' : totalFolders}
          </div>
        </div>

        <div
          id="card-stat-size"
          className="stat-card p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-ink-muted)] stat-label">Space Occupied</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 stat-icon">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div id="stat-size" className="stat-val text-2xl font-extrabold text-[var(--text-ink)]">
            {statsLoading ? '...' : api.helpers.formatBytes(totalSize)}
          </div>
        </div>

        <div
          id="card-stat-members"
          className="stat-card p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-ink-muted)] stat-label">Family Members</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 stat-icon">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div id="stat-members" className="stat-val text-2xl font-extrabold text-[var(--text-ink)]">
            {statsLoading ? '...' : memberCount}
          </div>
        </div>
      </div>

      {/* Storage Category Distribution Card */}
      <div
        id="dashboard-storage-card"
        className="storage-breakdown-card p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between breakdown-header">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="breakdown-title text-base font-bold text-[var(--text-ink)]">
              Storage Category Distribution
            </h2>
          </div>
          <span id="breakdown-pooled-info" className="breakdown-subtitle text-xs text-[var(--text-ink-muted)]">
            Pooled Cloud Storage
          </span>
        </div>

        {/* Progress Bar */}
        <div
          id="category-progress-container"
          className="breakdown-progress-container w-full h-3 bg-[var(--surface-paper-tint)] rounded-full overflow-hidden flex"
        >
          <div
            id="category-progress-bar"
            className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(5, totalFiles > 0 ? 100 : 0))}%` }}
          />
        </div>

        {/* Category Chips Grid */}
        <div id="breakdown-legend-grid" className="breakdown-legend-grid grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="breakdown-legend-chip flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-paper-tint)]/40 text-xs">
            <span className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
            <div className="chip-info truncate">
              <div className="chip-label font-medium text-[var(--text-ink)]">Videos</div>
              <div id="meta-cat-video" className="chip-meta text-[10px] text-[var(--text-ink-muted)]">
                {categories.video} items
              </div>
            </div>
          </div>

          <div className="breakdown-legend-chip flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-paper-tint)]/40 text-xs">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <div className="chip-info truncate">
              <div className="chip-label font-medium text-[var(--text-ink)]">Images</div>
              <div id="meta-cat-image" className="chip-meta text-[10px] text-[var(--text-ink-muted)]">
                {categories.images} items
              </div>
            </div>
          </div>

          <div className="breakdown-legend-chip flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-paper-tint)]/40 text-xs">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
            <div className="chip-info truncate">
              <div className="chip-label font-medium text-[var(--text-ink)]">PDFs</div>
              <div id="meta-cat-pdf" className="chip-meta text-[10px] text-[var(--text-ink-muted)]">
                {categories.pdfs} items
              </div>
            </div>
          </div>

          <div className="breakdown-legend-chip flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-paper-tint)]/40 text-xs">
            <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
            <div className="chip-info truncate">
              <div className="chip-label font-medium text-[var(--text-ink)]">Documents</div>
              <div id="meta-cat-doc" className="chip-meta text-[10px] text-[var(--text-ink-muted)]">
                {categories.docs} items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
