import { useState, useRef } from 'react';
import {
  useStorageConfig,
  useStorageAccounts,
  useUpdateStorageMode,
  useDeleteStorageAccount,
  useFamilyMembers,
} from '../api/hooks';
import { api } from '../api/client';
import type { StorageAccount } from '../api/types';

export function StoragePage() {
  const { data: config, refetch: refetchConfig } = useStorageConfig();
  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useStorageAccounts();
  const { data: members = [] } = useFamilyMembers();
  const updateModeMut = useUpdateStorageMode();
  const deleteAccountMut = useDeleteStorageAccount();

  const [connecting, setConnecting] = useState(false);
  const [oauthDrawerOpen, setOauthDrawerOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const credFileInputRef = useRef<HTMLInputElement>(null);

  // Modals for Edit Label & Assign Member
  const [editingAccount, setEditingAccount] = useState<StorageAccount | null>(null);
  const [newLabelText, setNewLabelText] = useState('');
  const [assigningAccount, setAssigningAccount] = useState<StorageAccount | null>(null);
  const [selectedAssignUserId, setSelectedAssignUserId] = useState<number | null>(null);

  // Compute real storage pool metrics
  const calculatedCapacity = accounts.reduce((sum, a) => sum + (a.cached_quota_total || 0), 0);
  const calculatedUsed = accounts.reduce((sum, a) => sum + (a.cached_quota_used || 0), 0);
  const totalBytes = config?.total_capacity_bytes && config.total_capacity_bytes > 0
    ? config.total_capacity_bytes
    : calculatedCapacity > 0
    ? calculatedCapacity
    : 15 * 1024 * 1024 * 1024;
  const usedBytes = config?.total_used_bytes !== undefined && config.total_used_bytes > 0
    ? config.total_used_bytes
    : calculatedUsed;
  const freeBytes = Math.max(0, totalBytes - usedBytes);
  const usedPct = totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;

  const redirectUri = `${window.location.origin}/api/storage/oauth2callback`;

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleConnectGoogleDrive = async () => {
    setConnecting(true);
    try {
      const res = await api.storage.getGoogleAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to initialize Google OAuth flow.');
    } finally {
      setConnecting(false);
    }
  };

  const handleCredentialsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const web = parsed.web || parsed.installed;
        if (web) {
          if (web.client_id) setClientId(web.client_id);
          if (web.client_secret) setClientSecret(web.client_secret);
          alert('Credentials successfully parsed from file!');
        } else {
          alert('Invalid credentials.json format. Expected "web" or "installed" key.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.storage.getGoogleAuthUrl(clientId, clientSecret);
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save credentials and connect.');
    }
  };

  const handleDeleteAccount = async (id: number, email: string) => {
    if (confirm(`Disconnect and remove Google Account "${email}" from the pooled vault?`)) {
      await deleteAccountMut.mutateAsync(id);
      refetchAccounts();
      refetchConfig();
    }
  };

  const handleSaveLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await api.storage.updateAccount(editingAccount.id, { label: newLabelText.trim() });
      setEditingAccount(null);
      refetchAccounts();
      refetchConfig();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update account label.');
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAccount) return;
    try {
      await api.storage.updateAccount(assigningAccount.id, { user_id: selectedAssignUserId });
      setAssigningAccount(null);
      refetchAccounts();
      refetchConfig();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to assign member to account.');
    }
  };

  return (
    <div className="fd-fade-in space-y-6">
      {/* Header Container */}
      <div className="storage-header-container fd-fade-in">
        <div>
          <h1 className="page-title">Cloud Storage & Quotas</h1>
          <p className="page-subtitle">Multi-account Google Drive pooling, family storage quotas, and live capacity.</p>
        </div>
        <div className="storage-header-actions" id="storage-header-actions-slot">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConnectGoogleDrive}
            disabled={connecting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <i className="fab fa-google" aria-hidden="true" />
            <span>{connecting ? 'Connecting...' : 'Connect Drive (+15 GB)'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setOauthDrawerOpen(!oauthDrawerOpen)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <i className="fas fa-cog" style={{ color: '#f59e0b' }} aria-hidden="true" />
            <span>API Credentials</span>
          </button>
        </div>
      </div>

      {/* Collapsible OAuth Credentials & Setup Drawer */}
      <div
        id="oauth-config-drawer"
        className={`oauth-config-drawer fd-fade-in ${oauthDrawerOpen ? 'open' : ''}`}
        style={{ display: oauthDrawerOpen ? 'block' : 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.15rem',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <i className="fab fa-google" style={{ color: '#4285F4' }} aria-hidden="true" />
            <span>Google OAuth Setup & Credentials</span>
          </h3>
          <button
            type="button"
            id="btn-close-oauth-drawer"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem' }}
            onClick={() => setOauthDrawerOpen(false)}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-ink-muted)', marginBottom: '1.25rem' }}>
          Configure Google Cloud OAuth credentials once so all family members can link their Google Drive accounts with 1 click.
        </p>

        {/* 1. Authorized Redirect URI Copy Box */}
        <div
          style={{
            marginBottom: '1.25rem',
            background: 'var(--surface-paper-tint)',
            border: '1px solid var(--border-paper-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-ink)',
              marginBottom: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>
              <i className="fas fa-link" style={{ color: '#3b82f6', marginRight: '0.35rem' }} aria-hidden="true" />
              Authorized Redirect URI for Google Cloud Console:
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)' }}>
              Add this in OAuth Client Credentials
            </span>
          </div>

          <div
            className="uri-copy-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--surface-card)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-paper)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
            }}
          >
            <span id="txt-redirect-uri" style={{ flex: 1, userSelect: 'all', wordBreak: 'break-all' }}>
              {redirectUri}
            </span>
            <button
              type="button"
              id="btn-copy-redirect-uri"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyRedirectUri}
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexShrink: 0,
              }}
            >
              <i className={`fas ${copiedUri ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
              <span>{copiedUri ? 'Copied' : 'Copy URI'}</span>
            </button>
          </div>
        </div>

        {/* 2. Drag & Drop credentials.json zone */}
        <div
          className="credentials-dropzone"
          id="credentials-dropzone"
          onClick={() => credFileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-paper-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--surface-paper-tint)',
            marginBottom: '1.25rem',
          }}
        >
          <input
            type="file"
            id="file-credentials-input"
            ref={credFileInputRef}
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleCredentialsFile}
          />
          <div style={{ fontSize: '2rem', color: 'var(--accent-brand)', marginBottom: '0.5rem' }}>
            <i className="fas fa-file-import" aria-hidden="true" />
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-ink)' }}>
            Drag & drop your <code>credentials.json</code> file here
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-ink-muted)', margin: '0.25rem 0 0 0' }}>
            Or click to browse and auto-fill Client ID & Secret from Google Cloud Console download.
          </p>
        </div>

        {/* 3. Form fields */}
        <form id="google-credentials-form" onSubmit={handleSaveCredentials}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="google-client-id">
                Google Client ID
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showClientId ? 'text' : 'password'}
                  id="google-client-id"
                  className="form-control"
                  placeholder="e.g. 12345-abc.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label="Toggle visibility"
                  onClick={() => setShowClientId(!showClientId)}
                >
                  <i className={`fas ${showClientId ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="google-client-secret">
                Google Client Secret
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  id="google-client-secret"
                  className="form-control"
                  placeholder="e.g. GOCSPX-xxxxxxxxxxxxxx"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label="Toggle visibility"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                >
                  <i className={`fas ${showClientSecret ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1rem',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8rem',
                color: 'var(--accent-brand)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <i className="fas fa-external-link-alt" aria-hidden="true" />
              <span>Open Google Cloud Console</span>
            </a>
            <button type="submit" id="btn-save-credentials-action" className="btn btn-primary btn-sm">
              <i className="fas fa-save" aria-hidden="true" />
              <span>Save & Connect Account</span>
            </button>
          </div>
        </form>
      </div>

      {/* 1. HERO STORAGE POOL SUMMARY CARD */}
      <div className="storage-hero-card fd-fade-up">
        <div className="storage-hero-header">
          <div className="storage-hero-title-group">
            <span id="hero-status-pill" className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '0.35rem' }} aria-hidden="true" />
              Active Pool
            </span>
            <h2 className="storage-hero-title">Family Storage Capacity</h2>
          </div>
          <div className="storage-hero-metrics">
            <div className="hero-metric-item">
              <span className="hero-metric-label">Total Pool</span>
              <span className="hero-metric-value" id="hero-total-cap">
                {api.helpers.formatBytes(totalBytes)}
              </span>
            </div>
            <div className="hero-metric-item">
              <span className="hero-metric-label">Used Space</span>
              <span className="hero-metric-value accent" id="hero-used-space">
                {api.helpers.formatBytes(usedBytes)} ({usedPct}%)
              </span>
            </div>
            <div className="hero-metric-item">
              <span className="hero-metric-label">Free Space</span>
              <span className="hero-metric-value" id="hero-free-space">
                {api.helpers.formatBytes(freeBytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Breakdown */}
        <div className="hero-progress-wrapper">
          <div className="hero-progress-bar-container" id="hero-progress-bar">
            <div
              className="storage-progress-segment"
              style={{
                width: `${usedPct}%`,
                background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
              }}
            />
          </div>

          <div className="hero-legend-row" id="hero-legend-row">
            <div className="hero-legend-item">
              <span className="hero-legend-dot" style={{ backgroundColor: '#ec4899', width: '8px', height: '8px', borderRadius: '50%' }} />
              <span>Videos</span>
            </div>
            <div className="hero-legend-item">
              <span className="hero-legend-dot" style={{ backgroundColor: '#3b82f6', width: '8px', height: '8px', borderRadius: '50%' }} />
              <span>Images</span>
            </div>
            <div className="hero-legend-item">
              <span className="hero-legend-dot" style={{ backgroundColor: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }} />
              <span>PDF Documents</span>
            </div>
            <div className="hero-legend-item">
              <span className="hero-legend-dot" style={{ backgroundColor: '#8b5cf6', width: '8px', height: '8px', borderRadius: '50%' }} />
              <span>Word Docs</span>
            </div>
            <div className="hero-legend-item">
              <span className="hero-legend-dot" style={{ backgroundColor: '#10b981', width: '8px', height: '8px', borderRadius: '50%' }} />
              <span>Spreadsheets</span>
            </div>
          </div>
        </div>

        {/* Hero Footer: Mode Switcher */}
        <div className="storage-hero-footer" style={{ borderTop: '1px solid var(--border-paper)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-ink-muted)' }}>
              Active Storage Mode:
            </span>
            <div className="mode-segmented-control" style={{ display: 'flex', border: '1px solid var(--border-paper)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                type="button"
                className={`mode-segment-btn ${config?.storage_provider !== 'local' ? 'active' : ''}`}
                onClick={() => updateModeMut.mutate('google')}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    config?.storage_provider !== 'local'
                      ? 'var(--color-primary-container)'
                      : 'var(--surface-paper-tint)',
                  color:
                    config?.storage_provider !== 'local'
                      ? 'var(--color-primary)'
                      : 'var(--text-ink-muted)',
                  fontWeight: 600,
                }}
              >
                <i className="fab fa-google" style={{ color: '#4285F4', marginRight: '0.35rem' }} aria-hidden="true" />
                Google Drive Pooling (Default)
              </button>
              <button
                type="button"
                className={`mode-segment-btn ${config?.storage_provider === 'local' ? 'active' : ''}`}
                onClick={() => updateModeMut.mutate('local')}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    config?.storage_provider === 'local'
                      ? 'var(--color-primary-container)'
                      : 'var(--surface-paper-tint)',
                  color:
                    config?.storage_provider === 'local'
                      ? 'var(--color-primary)'
                      : 'var(--text-ink-muted)',
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-server" style={{ marginRight: '0.35rem' }} aria-hidden="true" />
                Local Server Storage
              </button>
            </div>
          </div>
          <div id="hero-mode-note" style={{ fontSize: '0.8rem', color: 'var(--text-ink-muted)', fontStyle: 'italic' }}>
            Uploads automatically route and pool across all connected family accounts.
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN DASHBOARD GRID */}
      <div className="storage-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* LEFT COLUMN: Connected Google Drives */}
        <div className="famdoc-card fd-fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fab fa-google" style={{ color: '#4285F4' }} aria-hidden="true" />
                <span>Connected Google Drives</span>
              </h3>
              <span id="drives-count-badge" style={{ fontSize: '0.76rem', color: 'var(--text-ink-muted)', fontWeight: 500 }}>
                {accounts.length} Active Drive{accounts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConnectGoogleDrive}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
            >
              <i className="fas fa-plus" aria-hidden="true" />
              <span>Connect Drive</span>
            </button>
          </div>

          {/* Drives List */}
          <div className="account-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accountsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-ink-muted)' }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                Loading accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-ink-muted)', background: 'var(--surface-paper-tint)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>No external Google Drive accounts connected yet.</p>
                <button
                  type="button"
                  onClick={handleConnectGoogleDrive}
                  className="btn btn-secondary btn-sm"
                >
                  <i className="fab fa-google" style={{ color: '#4285F4' }} aria-hidden="true" />
                  <span>Connect your first Google account</span>
                </button>
              </div>
            ) : (
              accounts.map((acc) => {
                const limit = acc.cached_quota_total && acc.cached_quota_total > 0
                  ? acc.cached_quota_total
                  : 15 * 1024 * 1024 * 1024;
                const used = acc.cached_quota_used || 0;
                const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const displayName = acc.label || acc.email || 'Google Account';

                return (
                  <div
                    key={acc.id}
                    className="fd-fade-up"
                    style={{
                      background: 'var(--surface-paper-tint)',
                      border: '1px solid var(--border-paper)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#e8f0fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <i className="fab fa-google" style={{ color: '#4285F4', fontSize: '1rem' }} aria-hidden="true" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-ink)' }}>
                              {displayName}
                            </span>
                            <span
                              className={`badge ${acc.status === 'active' ? 'badge-primary' : 'badge-secondary'}`}
                              style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                            >
                              {acc.status === 'active' ? 'Active' : acc.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-ink-muted)' }}>
                            {acc.email} • {acc.member_username ? `Assigned to: ${acc.member_username}` : 'Shared Pool'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setEditingAccount(acc);
                            setNewLabelText(acc.label || '');
                          }}
                          title="Edit label"
                        >
                          <i className="fas fa-edit" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setAssigningAccount(acc);
                            setSelectedAssignUserId(acc.user_id || null);
                          }}
                          title="Assign to family member"
                        >
                          <i className="fas fa-user-tag" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteAccount(acc.id, acc.email || displayName)}
                          title="Disconnect account"
                        >
                          <i className="fas fa-trash-alt" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-card)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--accent-gradient)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-ink-muted)' }}>
                      <span>Used: <strong>{api.helpers.formatBytes(used)}</strong> ({pct}%)</span>
                      <span>Total: <strong>{api.helpers.formatBytes(limit)}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Family Contributors Roster */}
        <div className="famdoc-card fd-fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-users" style={{ color: 'var(--accent-brand)' }} aria-hidden="true" />
                <span>Family Cloud Contributors</span>
              </h3>
              <span id="contributors-count-badge" style={{ fontSize: '0.76rem', color: 'var(--text-ink-muted)', fontWeight: 500 }}>
                {members.length} Household Member{members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-ink-muted)', marginBottom: '1rem' }}>
            Every family member who links their Google Drive expands your shared family pool with zero server costs.
          </p>

          <div className="contributors-roster-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {members.map((m) => {
              const linkedAccount = accounts.find(
                (a) => a.user_id === m.user_id || (a.email && a.email.toLowerCase() === m.email.toLowerCase())
              );
              const isConnected = Boolean(linkedAccount || m.storage_connected);
              const quotaText = linkedAccount?.cached_quota_total
                ? api.helpers.formatBytes(linkedAccount.cached_quota_total)
                : m.storage_contributed_bytes
                ? api.helpers.formatBytes(m.storage_contributed_bytes)
                : '15 GB';

              return (
                <div
                  key={m.id}
                  className="fd-fade-up"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-paper-tint)',
                    border: '1px solid var(--border-paper)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-container)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {m.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-ink)' }}>
                        {m.username}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-ink-muted)' }}>
                        {linkedAccount ? `Linked: ${linkedAccount.label || linkedAccount.email}` : m.email}
                      </div>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="cloud-member-badge active" style={{ fontSize: '0.75rem' }}>
                      <i className="fab fa-google" style={{ color: '#4285F4', marginRight: '0.35rem' }} aria-hidden="true" />
                      +{quotaText} Active
                    </span>
                  ) : (
                    <span className="cloud-member-badge none" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-layer-group" style={{ marginRight: '0.35rem' }} aria-hidden="true" />
                      Shared Pool
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Label Modal */}
      {editingAccount && (
        <div className="modal-overlay show" onClick={() => setEditingAccount(null)}>
          <div className="famdoc-modal fd-pop-in" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Drive Label</h3>
              <button type="button" className="modal-close" onClick={() => setEditingAccount(null)}>
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSaveLabel}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-ink-muted)', marginBottom: '1rem' }}>
                  Choose a friendly label for <strong>{editingAccount.email}</strong> (e.g. "Dad's Drive", "Family Photos").
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-drive-label">Drive Label</label>
                  <input
                    type="text"
                    id="edit-drive-label"
                    className="form-control"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    placeholder="e.g. Papa's Drive"
                    required
                    maxLength={50}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingAccount(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Label
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Member Modal */}
      {assigningAccount && (
        <div className="modal-overlay show" onClick={() => setAssigningAccount(null)}>
          <div className="famdoc-modal fd-pop-in" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign to Family Member</h3>
              <button type="button" className="modal-close" onClick={() => setAssigningAccount(null)}>
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSaveAssignment}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-ink-muted)', marginBottom: '1rem' }}>
                  Select which household member contributed <strong>{assigningAccount.email}</strong>:
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="assign-member-select">Household Member</label>
                  <select
                    id="assign-member-select"
                    className="form-control"
                    value={selectedAssignUserId || ''}
                    onChange={(e) => setSelectedAssignUserId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Shared Family Pool (Unassigned)</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.username} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssigningAccount(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
