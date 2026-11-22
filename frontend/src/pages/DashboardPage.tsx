import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboardStats, useCurrentUser } from '../api/hooks';
import { api } from '../api/client';
import { uploadService } from '../services/uploadManager';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading, refetch } = useDashboardStats();
  const { data: user } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalFiles = stats?.total_files ?? 0;
  const totalFolders = stats?.total_folders ?? 0;
  const totalSize = stats?.total_size_bytes ?? stats?.total_storage_bytes ?? 0;
  const memberCount = stats?.total_members ?? 1;

  const breakdown = stats?.storage_breakdown || {};
  const getCatData = (key: string) => {
    if (breakdown[key]) return breakdown[key];
    const catFallback = stats?.category_breakdown as Record<string, number> | undefined;
    const count = catFallback?.[key] ?? 0;
    return { size: 0, count };
  };

  const videoData = getCatData('video');
  const imageData = getCatData('image');
  const pdfData = getCatData('pdf');
  const docData = getCatData('document');
  const sheetData = getCatData('sheet');
  const textData = getCatData('text');
  const otherData = getCatData('other');

  const quotaBytes = stats?.storage_quota_bytes || 15 * 1024 * 1024 * 1024;
  const usedBytes = totalSize;

  const categorySegments = [
    { key: 'video', label: 'Videos', color: 'var(--cat-video, #ec4899)', ...videoData },
    { key: 'image', label: 'Images', color: 'var(--cat-images, #0ea5e9)', ...imageData },
    { key: 'pdf', label: 'PDFs', color: 'var(--cat-pdfs, #ef4444)', ...pdfData },
    { key: 'document', label: 'Docs', color: 'var(--cat-docs, #8b5cf6)', ...docData },
    { key: 'sheet', label: 'Sheets', color: 'var(--cat-sheets, #0d9488)', ...sheetData },
    { key: 'text', label: 'Text', color: 'var(--cat-text, #f59e0b)', ...textData },
    { key: 'other', label: 'Other', color: 'var(--cat-other, #64748b)', ...otherData },
  ];

  const recentUploads = stats?.recent_uploads || stats?.recent_files || [];
  const recentActivity = stats?.recent_activity || [];

  // Compute friendly time-of-day greeting matching old UI
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setToastMessage(`Adding ${file.name} to upload queue...`);
    try {
      await uploadService.addFiles([file]);
      setToastMessage(`Upload queued: ${file.name}`);
      setTimeout(() => setToastMessage(null), 3500);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setToastMessage(`Failed to queue upload: ${msg}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getActionLabel = (action = '') => {
    const map: Record<string, string> = {
      DOWNLOAD_FILE: 'Downloaded file',
      UPLOAD_FILE: 'Uploaded file',
      CREATE_FOLDER: 'Created folder',
      DELETE_FILE: 'Moved item to trash',
      SHARE_LINK_CREATE: 'Created share link',
      SHARE_LINK_REVOKE: 'Revoked share link',
      RESTORE_FILE: 'Restored file',
      RENAME_FILE: 'Renamed file',
      RENAME_FOLDER: 'Renamed folder',
      MOVE_FILE: 'Moved file',
      MOVE_FOLDER: 'Moved folder',
      LOGIN: 'Signed in',
      REGISTER: 'Registered account',
    };
    return map[action] || action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  };

  const getActivityIcon = (action = '') => {
    const a = action.toLowerCase();
    if (a.includes('upload') || a.includes('file')) return 'fas fa-cloud-upload-alt';
    if (a.includes('folder')) return 'fas fa-folder-plus';
    if (a.includes('member') || a.includes('invite')) return 'fas fa-user-plus';
    if (a.includes('login') || a.includes('auth')) return 'fas fa-sign-in-alt';
    if (a.includes('delete') || a.includes('trash')) return 'fas fa-trash-alt';
    return 'fas fa-history';
  };

  return (
    <div className="dashboard-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[var(--surface-card)] border border-[var(--color-primary)] text-sm font-semibold shadow-xl flex items-center gap-2.5 transition-all"
          style={{ animation: 'fadeInDown 0.3s ease' }}
        >
          <i className="fas fa-check-circle text-emerald-500" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Content Header (Matches Old UI) */}
      <div className="content-header fd-fade-in">
        <div>
          <h1 className="page-title" id="welcome-message">
            {getGreeting()}, {user?.username || 'FamDoc User'} 👋
          </h1>
          <p className="page-subtitle">Here is the latest from your family vault.</p>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="quick-actions-bar fd-fade-in">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleQuickUpload}
        />
        <button
          type="button"
          className="quick-action-btn primary"
          id="btn-quick-upload"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className={isUploading ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'} aria-hidden="true" />
          <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
        </button>
        <Link to="/vault?action=new-folder" className="quick-action-btn" id="btn-quick-folder">
          <i className="fas fa-folder-plus" aria-hidden="true" />
          <span>New Folder</span>
        </Link>
        <Link to="/profile?invite=true" className="quick-action-btn" id="btn-quick-invite">
          <i className="fas fa-user-plus" aria-hidden="true" />
          <span>Invite Member</span>
        </Link>
        <Link to="/storage" className="quick-action-btn" id="btn-quick-storage">
          <i className="fas fa-cloud" aria-hidden="true" />
          <span>Cloud Storage Pool</span>
        </Link>
      </div>

      {/* Dashboard Statistics Grid (4 Cards with Colored Glow Borders & Pastel Badges) */}
      <div className="dashboard-grid">
        <Link to="/vault" id="card-stat-files" className="stat-card fd-fade-up fd-stagger" style={{ textDecoration: 'none' }}>
          <div className="icon-chip stat-icon">
            <i className="fas fa-file-alt" aria-hidden="true" />
          </div>
          <span className="stat-label">Total Files</span>
          <div id="stat-files" className="stat-val">
            {statsLoading ? '...' : totalFiles}
          </div>
        </Link>

        <Link to="/vault" id="card-stat-folders" className="stat-card fd-fade-up fd-stagger" style={{ textDecoration: 'none' }}>
          <div className="icon-chip stat-icon">
            <i className="fas fa-folder" aria-hidden="true" />
          </div>
          <span className="stat-label">Folders</span>
          <div id="stat-folders" className="stat-val">
            {statsLoading ? '...' : totalFolders}
          </div>
        </Link>

        <Link to="/storage" id="card-stat-size" className="stat-card fd-fade-up fd-stagger" style={{ textDecoration: 'none' }}>
          <div className="icon-chip stat-icon">
            <i className="fas fa-database" aria-hidden="true" />
          </div>
          <span className="stat-label">Space Occupied</span>
          <div id="stat-size" className="stat-val">
            {statsLoading ? '...' : api.helpers.formatBytes(totalSize)}
          </div>
          <div className="stat-subtext" style={{ fontSize: '0.74rem', color: 'var(--text-ink-muted)', marginTop: '0.25rem' }}>
            {statsLoading ? 'Calculating capacity...' : `of ${api.helpers.formatBytes(quotaBytes)} (${Math.round((totalSize / (quotaBytes || 1)) * 100)}%)`}
          </div>
          <div className="stat-card-bottom-progress">
            <div
              className="progress-bar-fill"
              style={{
                width: quotaBytes > 0 ? `${Math.min(100, (totalSize / quotaBytes) * 100)}%` : '0%',
                background: 'var(--color-primary)',
              }}
            />
          </div>
        </Link>

        <Link to="/family" id="card-stat-members" className="stat-card fd-fade-up fd-stagger" style={{ textDecoration: 'none' }}>
          <div className="icon-chip stat-icon">
            <i className="fas fa-users" aria-hidden="true" />
          </div>
          <span className="stat-label">Family Members</span>
          <div id="stat-members" className="stat-val">
            {statsLoading ? '...' : memberCount}
          </div>
        </Link>
      </div>

      {/* Storage Category Distribution Breakdown Card */}
      <div id="dashboard-storage-card" className="storage-breakdown-card fd-fade-up">
        <div className="breakdown-header">
          <h2 className="breakdown-title">
            <i className="fas fa-chart-pie" style={{ color: 'var(--accent-brand)' }} aria-hidden="true" />
            <span>Storage Category Distribution</span>
          </h2>
          <div id="breakdown-pooled-info" className="breakdown-subtitle">
            Pooled Cloud Storage
          </div>
        </div>

        {/* Multi-Segmented Progress Bar */}
        <div id="category-progress-container" className="breakdown-progress-container" style={{ display: 'flex', overflow: 'hidden' }}>
          {categorySegments.filter((c) => c.size > 0).length > 0 ? (
            categorySegments
              .filter((c) => c.size > 0)
              .map((c) => {
                const segPercent = Math.max(2, (c.size / (usedBytes || 1)) * 100);
                return (
                  <div
                    key={c.key}
                    className="storage-progress-segment"
                    style={{
                      width: `${segPercent}%`,
                      height: '100%',
                      backgroundColor: c.color,
                      transition: 'width 0.4s ease',
                    }}
                    title={`${c.label}: ${api.helpers.formatBytes(c.size)} (${c.count} files)`}
                  />
                );
              })
          ) : (
            <div
              id="category-progress-bar"
              className="progress-bar-fill"
              style={{
                width: '100%',
                background: 'var(--surface-paper-tint)',
              }}
            />
          )}
        </div>

        {/* Category Legend Chips Grid */}
        <div id="breakdown-legend-grid" className="breakdown-legend-grid">
          {categorySegments.map((c) => {
            const isZero = c.size === 0 && c.count === 0;
            return (
              <div
                key={c.key}
                className="breakdown-legend-chip"
                style={isZero ? { opacity: 0.6 } : {}}
              >
                <div className="chip-color-dot" style={{ backgroundColor: c.color }} />
                <div className="chip-info">
                  <span className="chip-label">{c.label}</span>
                  <span id={`meta-cat-${c.key}`} className="chip-meta">
                    {isZero ? '0 B (0)' : `${api.helpers.formatBytes(c.size)} (${c.count})`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Double Sections: Recent Vault Uploads & Activity Feed (Matches Old UI) */}
      <div className="dashboard-sections fd-fade-up">
        {/* Recent Uploads Card */}
        <div className="famdoc-card">
          <div className="famdoc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="famdoc-card-title">
              <i className="fas fa-clock" style={{ color: 'var(--accent-brand)', marginRight: '0.5rem' }} aria-hidden="true" />
              Recent Vault Uploads
            </h2>
            <Link to="/vault" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-brand)', textDecoration: 'none' }}>
              Browse All <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
            </Link>
          </div>

          <div id="recent-uploads-list" className="items-list scrollable-dashboard-list">
            {recentUploads.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-ink-muted)' }}>
                <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.2rem', opacity: 0.4, marginBottom: '0.75rem', display: 'block' }} aria-hidden="true" />
                <p style={{ fontSize: '0.88rem', margin: 0 }}>No recent uploads found.</p>
                <p style={{ fontSize: '0.78rem', margin: '0.35rem 0 0', opacity: 0.8 }}>Click &quot;Upload File&quot; above to store keepsakes!</p>
              </div>
            ) : (
              recentUploads.slice(0, 5).map((file) => (
                <div
                  key={file.id}
                  className="vault-item"
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    borderBottom: '1px solid var(--border-paper)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/vault?preview=${file.id}`)}
                >
                  <div className="thumbnail-wrapper" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-paper-tint)', flexShrink: 0, position: 'relative' }}>
                    <i className={`item-icon ${api.helpers.getFileIconClass(file.filename, file.file_type)} thumbnail-fallback`} style={{ fontSize: '1.2rem' }} aria-hidden="true" />
                    {(file.file_type?.toLowerCase().startsWith('image/') ||
                      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.filename) ||
                      file.file_type === 'application/pdf' ||
                      file.filename.toLowerCase().endsWith('.pdf')) && (
                      <img
                        className="item-icon item-thumbnail"
                        src={api.files.getPreviewUrl(file.id, file.preview_token, true)}
                        alt={file.filename}
                        loading="lazy"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onLoad={(e) => {
                          (e.currentTarget as HTMLElement).classList.add('loaded');
                          const fallback = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement | null;
                          if (fallback) fallback.style.opacity = '0';
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement | null;
                          if (fallback) fallback.style.opacity = '1';
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.filename}
                      </span>
                      <span className="file-format-pill">{api.helpers.getFileFormatLabel(file.filename, file.file_type)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)', marginTop: '0.15rem' }}>
                      {api.helpers.formatBytes(file.file_size ?? file.size_bytes ?? 0)} &bull; {api.helpers.getRelativeTime(file.created_at ?? file.upload_date)}
                    </div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)' }} aria-hidden="true" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vault Activity Card */}
        <div className="famdoc-card">
          <div className="famdoc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="famdoc-card-title">
              <i className="fas fa-history" style={{ color: 'var(--accent-brand)', marginRight: '0.5rem' }} aria-hidden="true" />
              Vault Activity
            </h2>
            <span
              className="badge badge-primary"
              style={{
                fontSize: '0.72rem',
                padding: '0.2rem 0.6rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <i className="fas fa-circle" style={{ fontSize: '0.45rem', marginRight: '0.35rem', color: 'var(--color-primary-light)' }} aria-hidden="true" />
              Live Stream
            </span>
          </div>

          <div id="activity-feed-list" className="activity-feed scrollable-dashboard-list" style={{ padding: '0.5rem 0' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-ink-muted)' }}>
                <i className="fas fa-shield-alt" style={{ fontSize: '2.2rem', opacity: 0.4, marginBottom: '0.75rem', display: 'block' }} aria-hidden="true" />
                <p style={{ fontSize: '0.88rem', margin: 0 }}>Vault is secure and operational.</p>
                <p style={{ fontSize: '0.78rem', margin: '0.35rem 0 0', opacity: 0.8 }}>File uploads, folder creations, and shares appear here in real time.</p>
              </div>
            ) : (
              recentActivity.slice(0, 6).map((act) => (
                <div key={act.id} className="activity-item">
                  <div className="activity-icon">
                    <i className={getActivityIcon(act.action)} aria-hidden="true" />
                  </div>
                  <div className="activity-details">
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                      {getActionLabel(act.action)}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-ink-muted)', marginTop: '0.15rem' }}>
                      {act.username || act.actor_username ? `By ${act.username || act.actor_username} • ` : ''}
                      {api.helpers.getRelativeTime(act.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
