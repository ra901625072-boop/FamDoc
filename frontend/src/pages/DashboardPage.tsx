import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStats, useCurrentUser } from '../api/hooks';
import { api } from '../api/client';
import { uploadService } from '../services/uploadManager';
import {
  staggerContainerVariants,
  staggerItemVariants,
  emptyStateFloatVariants,
  toastVariants,
  springs,
  durations,
  easings,
} from '../lib/motion';

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
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            id="dashboard-toast"
            className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[var(--surface-card)] border border-[var(--color-primary)] text-sm font-semibold shadow-xl flex items-center gap-2.5"
          >
            <i className="fas fa-check-circle text-emerald-500" aria-hidden="true" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Header — Apple Minimal Greeting & Primary Action */}
      <div className="content-header fd-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" id="welcome-message" style={{ margin: 0, fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {getGreeting()}, {user?.username || 'FamDoc User'} 👋
          </h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--text-ink-muted)' }}>
            Your family keepsake vault is protected and active.
          </p>
        </div>

        {/* Primary Action Button (Single Dominant Focus) */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleQuickUpload}
          />
          <motion.button
            type="button"
            className="quick-action-btn primary"
            id="btn-quick-upload"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{ height: '42px', padding: '0 1.25rem', fontSize: '0.88rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <i className={isUploading ? 'fas fa-spinner fa-spin' : 'fas fa-plus'} aria-hidden="true" />
            <span>{isUploading ? 'Uploading...' : 'Upload document'}</span>
          </motion.button>
        </div>
      </div>

      {/* Secondary Quiet Actions Toolbar */}
      <div className="quick-actions-bar fd-fade-in" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to="/vault?action=new-folder" className="quick-action-btn" id="btn-quick-folder">
          <i className="fas fa-folder-plus" aria-hidden="true" />
          <span>New folder</span>
        </Link>
        <Link to="/profile?invite=true" className="quick-action-btn" id="btn-quick-invite">
          <i className="fas fa-user-plus" aria-hidden="true" />
          <span>Invite member</span>
        </Link>
        <Link to="/storage" className="quick-action-btn" id="btn-quick-storage">
          <i className="fas fa-cloud" aria-hidden="true" />
          <span>Storage pool</span>
        </Link>
      </div>

      {/* Dashboard Inline Metric Cards (Clean Apple Surface, No Rainbow Overload) */}
      <motion.div
        className="dashboard-grid"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link to="/vault" id="card-stat-files" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="icon-chip stat-icon">
              <i className="fas fa-file-alt" aria-hidden="true" />
            </div>
            <span className="stat-label">Total files</span>
            <div id="stat-files" className="stat-val">
              {statsLoading ? '...' : totalFiles}
            </div>
          </Link>
        </motion.div>

        <motion.div variants={staggerItemVariants} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link to="/vault" id="card-stat-folders" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="icon-chip stat-icon">
              <i className="fas fa-folder" aria-hidden="true" />
            </div>
            <span className="stat-label">Folders</span>
            <div id="stat-folders" className="stat-val">
              {statsLoading ? '...' : totalFolders}
            </div>
          </Link>
        </motion.div>

        <motion.div variants={staggerItemVariants} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link to="/storage" id="card-stat-size" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="icon-chip stat-icon">
              <i className="fas fa-database" aria-hidden="true" />
            </div>
            <span className="stat-label">Storage used</span>
            <div id="stat-size" className="stat-val">
              {statsLoading ? '...' : api.helpers.formatBytes(totalSize)}
            </div>
            <div className="stat-subtext" style={{ fontSize: '0.74rem', color: 'var(--text-ink-muted)', marginTop: '0.2rem' }}>
              {statsLoading ? 'Calculating capacity...' : `of ${api.helpers.formatBytes(quotaBytes)} (${Math.round((totalSize / (quotaBytes || 1)) * 100)}%)`}
            </div>
            <div className="stat-card-bottom-progress">
              <motion.div
                className="progress-bar-fill"
                initial={{ width: 0 }}
                animate={{
                  width: quotaBytes > 0 ? `${Math.min(100, (totalSize / quotaBytes) * 100)}%` : '0%',
                }}
                transition={{ duration: durations.slow, ease: easings.easeOut }}
                style={{
                  background: 'var(--color-primary)',
                }}
              />
            </div>
          </Link>
        </motion.div>

        <motion.div variants={staggerItemVariants} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link to="/family" id="card-stat-members" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="icon-chip stat-icon">
              <i className="fas fa-users" aria-hidden="true" />
            </div>
            <span className="stat-label">Family members</span>
            <div id="stat-members" className="stat-val">
              {statsLoading ? '...' : memberCount}
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Storage Pool Summary Strip — Minimal Apple Single-Accent Bar */}
      <motion.div
        id="dashboard-storage-card"
        className="storage-breakdown-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.gentle}
      >
        <div className="breakdown-header">
          <h2 className="breakdown-title">
            <i className="fas fa-cloud" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            <span>Family storage pool</span>
          </h2>
          <Link to="/storage" id="breakdown-pooled-info" className="breakdown-subtitle">
            Manage storage &rarr;
          </Link>
        </div>

        {/* Calm Single-Accent Progress Bar */}
        <div id="category-progress-container" className="breakdown-progress-container">
          <motion.div
            id="category-progress-bar"
            className="storage-progress-segment"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.round((totalSize / (quotaBytes || 1)) * 100))}%` }}
            transition={{ duration: durations.slow, ease: easings.easeOut }}
            style={{
              backgroundColor: 'var(--color-primary)',
            }}
          />
        </div>

        {/* Clean Meta & Compact Category Chips */}
        <div id="breakdown-legend-grid" className="breakdown-legend-grid">
          <div style={{ fontSize: '0.82rem', color: 'var(--text-ink-muted)', fontWeight: 500, marginRight: 'auto' }}>
            <strong>{api.helpers.formatBytes(totalSize)}</strong> of <strong>{api.helpers.formatBytes(quotaBytes)}</strong> used ({Math.round((totalSize / (quotaBytes || 1)) * 100)}%)
          </div>
          {categorySegments.filter((c) => c.size > 0).slice(0, 4).map((c) => (
            <div key={c.key} className="breakdown-legend-chip">
              <div className="chip-color-dot" style={{ backgroundColor: 'var(--color-primary)' }} />
              <div className="chip-info">
                <span className="chip-label">{c.label}</span>
                <span id={`meta-cat-${c.key}`} className="chip-meta">
                  {api.helpers.formatBytes(c.size)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Double Sections: Recent Vault Uploads & Activity Feed (Matches Old UI) */}
      <div className="dashboard-sections fd-fade-up">
        {/* Recent Uploads Card */}
        <div className="famdoc-card">
          <div className="famdoc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="famdoc-card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Recent documents
            </h2>
            <Link to="/vault" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
              View all &rarr;
            </Link>
          </div>

          <div id="recent-uploads-list" className="items-list scrollable-dashboard-list">
            {recentUploads.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-ink-muted)' }}>
                <motion.div variants={emptyStateFloatVariants} animate="animate">
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', opacity: 0.35, marginBottom: '0.75rem', display: 'block' }} aria-hidden="true" />
                </motion.div>
                <p style={{ fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>No recent documents</p>
                <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0', opacity: 0.8 }}>Click &quot;Upload document&quot; to add your family files.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
                {recentUploads.slice(0, 5).map((file) => (
                  <motion.div
                    key={file.id}
                    variants={staggerItemVariants}
                    whileHover={{ x: 3 }}
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
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Vault Activity Card */}
        <div className="famdoc-card">
          <div className="famdoc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="famdoc-card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Recent activity
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.18rem 0.55rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'var(--color-primary-container)',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <i className="fas fa-circle" style={{ fontSize: '0.4rem', color: 'var(--color-primary)' }} aria-hidden="true" />
              Live
            </span>
          </div>

          <div id="activity-feed-list" className="activity-feed scrollable-dashboard-list" style={{ padding: '0.5rem 0' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-ink-muted)' }}>
                <motion.div variants={emptyStateFloatVariants} animate="animate">
                  <i className="fas fa-shield-alt" style={{ fontSize: '2rem', opacity: 0.35, marginBottom: '0.75rem', display: 'block' }} aria-hidden="true" />
                </motion.div>
                <p style={{ fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>Vault is secure</p>
                <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0', opacity: 0.8 }}>File activity and shares appear here.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
                {recentActivity.slice(0, 6).map((act) => (
                  <motion.div key={act.id} variants={staggerItemVariants} className="activity-item">
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
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
