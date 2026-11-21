import { Link } from 'react-router-dom';
import { useDashboardStats, useFamilyDetails } from '../api/hooks';
import { api } from '../api/client';

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
    <div className="dashboard-page-container">
      {/* Header Banner */}
      <div
        className="dashboard-header-banner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 1.75rem',
          borderRadius: 'var(--radius-xl, 20px)',
          background: 'var(--appbar-bg)',
          color: '#FFFFFF',
          marginBottom: '1.75rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            {family?.name ? `${family.name}'s Keepsake Vault` : 'Family Keepsake Vault'}
          </h1>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
            Multi-Account Pooled Storage &bull; End-to-End Encrypted &bull; Failover Protected
          </p>
        </div>
        <Link
          to="/vault"
          className="btn btn-secondary btn-compact"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            borderColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <i className="fas fa-folder-open" aria-hidden="true" />
          <span>Open Vault</span>
        </Link>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="quick-actions-bar">
        <Link to="/vault?action=upload" id="btn-quick-upload" className="quick-action-btn primary">
          <i className="fas fa-cloud-upload-alt" aria-hidden="true" />
          <span>Upload Document</span>
        </Link>
        <Link to="/vault?action=new-folder" id="btn-quick-folder" className="quick-action-btn">
          <i className="fas fa-folder-plus" aria-hidden="true" />
          <span>New Folder</span>
        </Link>
        <Link to="/profile?invite=true" id="btn-quick-invite" className="quick-action-btn">
          <i className="fas fa-user-plus" aria-hidden="true" />
          <span>Invite Member</span>
        </Link>
        <Link to="/storage" id="btn-quick-storage" className="quick-action-btn">
          <i className="fas fa-hdd" aria-hidden="true" />
          <span>Storage Pool</span>
        </Link>
      </div>

      {/* Dashboard Statistics Grid (4 Cards) */}
      <div className="dashboard-grid">
        <Link to="/vault" id="card-stat-files" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon">
            <i className="fas fa-file-alt" aria-hidden="true" />
          </div>
          <span className="stat-label">Total Files</span>
          <div id="stat-files" className="stat-val">
            {statsLoading ? '...' : totalFiles}
          </div>
        </Link>

        <Link to="/vault" id="card-stat-folders" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon">
            <i className="fas fa-folder" aria-hidden="true" />
          </div>
          <span className="stat-label">Total Folders</span>
          <div id="stat-folders" className="stat-val">
            {statsLoading ? '...' : totalFolders}
          </div>
        </Link>

        <Link to="/storage" id="card-stat-size" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon">
            <i className="fas fa-database" aria-hidden="true" />
          </div>
          <span className="stat-label">Space Occupied</span>
          <div id="stat-size" className="stat-val">
            {statsLoading ? '...' : api.helpers.formatBytes(totalSize)}
          </div>
          <div className="stat-card-bottom-progress">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(5, (totalSize / (15 * 1024 * 1024 * 1024)) * 100))}%`,
                background: 'var(--color-primary)',
              }}
            />
          </div>
        </Link>

        <Link to="/family" id="card-stat-members" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon">
            <i className="fas fa-users" aria-hidden="true" />
          </div>
          <span className="stat-label">Family Members</span>
          <div id="stat-members" className="stat-val">
            {statsLoading ? '...' : memberCount}
          </div>
        </Link>
      </div>

      {/* Storage Category Distribution Breakdown Card */}
      <div id="dashboard-storage-card" className="storage-breakdown-card">
        <div className="breakdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i className="fas fa-chart-pie" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }} aria-hidden="true" />
            <h2 className="breakdown-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Storage Category Distribution
            </h2>
          </div>
          <span id="breakdown-pooled-info" className="breakdown-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-ink-muted)' }}>
            Pooled Google Drive Accounts
          </span>
        </div>

        {/* Multi-Segmented Progress Bar */}
        <div id="category-progress-container" className="breakdown-progress-container" style={{ width: '100%', height: '10px', backgroundColor: 'var(--surface-paper-tint)', borderRadius: '9999px', overflow: 'hidden', display: 'flex', marginBottom: '1.25rem' }}>
          <div
            id="category-progress-bar"
            style={{
              width: `${Math.min(100, Math.max(8, totalFiles > 0 ? 100 : 0))}%`,
              background: 'var(--accent-gradient)',
              borderRadius: '9999px',
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        {/* Category Legend Chips Grid */}
        <div id="breakdown-legend-grid" className="breakdown-legend-grid">
          <div className="breakdown-legend-chip">
            <span className="chip-dot" style={{ backgroundColor: 'var(--cat-video, #EC4899)' }} />
            <div className="chip-info">
              <div className="chip-label">Videos</div>
              <div id="meta-cat-video" className="chip-meta">{categories.video} items</div>
            </div>
          </div>

          <div className="breakdown-legend-chip">
            <span className="chip-dot" style={{ backgroundColor: 'var(--cat-images, #3B82F6)' }} />
            <div className="chip-info">
              <div className="chip-label">Photos &amp; Images</div>
              <div id="meta-cat-image" className="chip-meta">{categories.images} items</div>
            </div>
          </div>

          <div className="breakdown-legend-chip">
            <span className="chip-dot" style={{ backgroundColor: 'var(--cat-pdfs, #EF4444)' }} />
            <div className="chip-info">
              <div className="chip-label">PDF Documents</div>
              <div id="meta-cat-pdf" className="chip-meta">{categories.pdfs} items</div>
            </div>
          </div>

          <div className="breakdown-legend-chip">
            <span className="chip-dot" style={{ backgroundColor: 'var(--cat-docs, #8B5CF6)' }} />
            <div className="chip-info">
              <div className="chip-label">Office &amp; Word</div>
              <div id="meta-cat-doc" className="chip-meta">{categories.docs} items</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
