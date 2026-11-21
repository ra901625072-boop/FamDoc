import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useFamilyDetails,
  useFamilyMembers,
  useRemoveFamilyMember,
  useRegenerateSecretCode,
  useCurrentUser,
} from '../api/hooks';
import { api } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';

export function FamilyPage() {
  const { data: user } = useCurrentUser();
  const authUser = useAuthStore((s) => s.user);
  const effectiveUser = user || authUser;
  const { data: family, isLoading: familyLoading, refetch: refetchFamily } = useFamilyDetails();
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useFamilyMembers();
  const removeMemberMut = useRemoveFamilyMember();
  const regenCodeMut = useRegenerateSecretCode();

  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [localSecretCode, setLocalSecretCode] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_family_secret_code') : null;
  });
  const [expiresAt, setExpiresAt] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_family_code_expires_at') : null;
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isAdmin = effectiveUser?.role === 'admin';

  useEffect(() => {
    if (family?.expires_at) {
      setExpiresAt(family.expires_at);
      localStorage.setItem('famdoc_family_code_expires_at', family.expires_at);
    }
  }, [family]);

  // Live 1-Minute Countdown Timer
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    const calcRemaining = () => {
      const expTime = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = Math.floor((expTime - now) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    };

    calcRemaining();
    const timer = setInterval(calcRemaining, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    const handleCodeUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ secret_code: string; expires_at?: string } | string>;
      if (custom.detail && typeof custom.detail === 'object') {
        setLocalSecretCode(custom.detail.secret_code);
        if (custom.detail.expires_at) {
          setExpiresAt(custom.detail.expires_at);
          localStorage.setItem('famdoc_family_code_expires_at', custom.detail.expires_at);
        }
      } else if (typeof custom.detail === 'string') {
        setLocalSecretCode(custom.detail);
      } else {
        setLocalSecretCode(localStorage.getItem('famdoc_family_secret_code'));
        setExpiresAt(localStorage.getItem('famdoc_family_code_expires_at'));
      }
    };
    window.addEventListener('famdoc:secret-code-updated', handleCodeUpdate);
    return () => window.removeEventListener('famdoc:secret-code-updated', handleCodeUpdate);
  }, []);

  const effectiveCode = family?.secret_code || localSecretCode || 'FAMD-0000-0000';

  const handleCopyCode = () => {
    if (!effectiveCode || effectiveCode === 'FAMD-0000-0000') {
      alert('Please generate a family invitation code first.');
      return;
    }
    if (timeLeft === 0) {
      alert('This family code has expired (it was only valid for 1 minute). Please click the regenerate button to create a fresh code.');
      return;
    }
    navigator.clipboard.writeText(effectiveCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    const promptText = effectiveCode && effectiveCode !== 'FAMD-0000-0000'
      ? 'Regenerate family secret code? The old code will immediately stop working for new invites.'
      : 'Generate a new family vault invitation code?';
    if (confirm(promptText)) {
      try {
        const res = await regenCodeMut.mutateAsync({
          name: family?.name || 'Family Vault',
          maxMembers: family?.max_members || 10,
        });
        if (res && res.secret_code) {
          localStorage.setItem('famdoc_family_secret_code', res.secret_code);
          setLocalSecretCode(res.secret_code);
          const exp = res.expires_at || new Date(Date.now() + 60 * 1000).toISOString();
          localStorage.setItem('famdoc_family_code_expires_at', exp);
          setExpiresAt(exp);
          alert(`New 1-minute secret code generated: ${res.secret_code} (Valid for 60 seconds)`);
          refetchFamily();
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to regenerate code.');
      }
    }
  };

  const handleRemove = async (userId: number, memberName: string) => {
    if (
      confirm(
        `Are you sure you want to remove "${memberName}" from the family vault? They will immediately lose all access rights and session keys.`
      )
    ) {
      try {
        await removeMemberMut.mutateAsync(userId);
        refetchMembers();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to remove member.');
      }
    }
  };

  const connectedCount = members.filter((m) => m.storage_connected).length;
  const totalPooledBytes = members.reduce((sum, m) => sum + (m.storage_contributed_bytes || 0), 0);

  return (
    <div className="fd-fade-in space-y-6">
      {/* Content Header */}
      <div className="content-header fd-fade-in">
        <div>
          <h1 className="page-title">Family Group & Settings</h1>
          <p className="page-subtitle">Manage vault members and access privileges.</p>
        </div>
        <div className="toolbar-actions" id="family-toolbar-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            <i className="fas fa-user-plus" aria-hidden="true" />
            <span>Invite Members</span>
          </button>
        </div>
      </div>

      {/* Secret Invite Code Card */}
      <div
        className="famdoc-card fd-fade-up"
        style={{
          background: 'linear-gradient(135deg, rgba(4, 120, 87, 0.12), rgba(16, 185, 129, 0.05))',
          borderColor: 'rgba(4, 120, 87, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--accent-brand)',
                fontWeight: 700,
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <i className="fas fa-key" aria-hidden="true" />
              <span>Family Secret Invite Code</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-ink-muted)' }}>
              Share this code with family members so they can join your cloud vault from web or Android.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  color: 'var(--text-ink)',
                  backgroundColor: 'var(--surface-card)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-paper)',
                  boxShadow: 'var(--shadow-sm)',
                  textDecoration: timeLeft === 0 ? 'line-through' : 'none',
                  opacity: timeLeft === 0 ? 0.6 : 1,
                }}
              >
                {familyLoading ? 'LOADING...' : effectiveCode}
              </span>
              {effectiveCode && effectiveCode !== 'FAMD-0000-0000' && timeLeft !== null && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: timeLeft === 0 || timeLeft <= 15 ? (timeLeft === 0 ? '#ef4444' : '#f59e0b') : '#10b981',
                    backgroundColor:
                      timeLeft === 0 || timeLeft <= 15
                        ? timeLeft === 0
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(245, 158, 11, 0.18)'
                        : 'rgba(16, 185, 129, 0.15)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <i
                    className={`fas ${
                      timeLeft === 0
                        ? 'fa-exclamation-circle'
                        : timeLeft > 65
                        ? 'fa-shield-alt'
                        : 'fa-stopwatch'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {timeLeft === 0
                      ? 'Expired (1-Min Limit)'
                      : timeLeft > 65
                      ? 'Standard Access Code'
                      : timeLeft <= 15
                      ? `Expiring in: ${timeLeft}s`
                      : `Valid for: ${timeLeft}s`}
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyCode}
              disabled={timeLeft === 0}
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
              <span>{copied ? 'Copied' : timeLeft === 0 ? 'Expired' : 'Copy Code'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRegenerateCode}
                title="Regenerate 1-minute secret invite code"
                style={{ padding: '0.5rem 0.75rem' }}
                disabled={regenCodeMut.isPending}
              >
                <i className={`fas fa-sync-alt ${regenCodeMut.isPending ? 'fa-spin' : ''}`} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Card: Family Roster */}
      <div className="famdoc-card fd-fade-up">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          <i className="fas fa-users-cog" style={{ color: 'var(--accent-brand)', marginRight: '0.5rem' }} aria-hidden="true" />
          Family Roster
        </h2>

        {/* Storage Contribution Overview Banner */}
        <div
          className="family-storage-summary-banner"
          id="family-storage-banner"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-paper-tint)',
            border: '1px solid var(--border-paper)',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#e8f0fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fab fa-google" style={{ color: '#4285F4', fontSize: '1.15rem' }} aria-hidden="true" />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-ink)' }}>
                Family Cloud Storage Pool: {connectedCount > 0 ? `${connectedCount} Connected Drive${connectedCount !== 1 ? 's' : ''}` : 'Shared Pool Active'} ({totalPooledBytes > 0 ? api.helpers.formatBytes(totalPooledBytes) : '15 GB'} Total Capacity)
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-ink-muted)' }}>
                {members.length} Household Members enrolled in family keepsakes vault.
              </div>
            </div>
          </div>

          <Link
            to="/storage"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', textDecoration: 'none' }}
          >
            <i className="fas fa-cog" aria-hidden="true" />
            <span>Cloud Storage Settings</span>
          </Link>
        </div>

        {/* Tabular Roster Design */}
        <div className="famdoc-table-wrapper">
          <table className="famdoc-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Cloud Storage</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr className="fd-skel-table-row">
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="empty-state" style={{ padding: '1rem' }}>
                      <i className="fas fa-spinner fa-spin state-icon loading" aria-hidden="true" />
                      <p className="empty-state-text">Loading member roster...</p>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-ink-muted)' }}>
                    No members have joined yet.
                  </td>
                </tr>
              ) : (
                members.map((m, index) => {
                  const isCurrent = m.id === user?.id || m.username === user?.username;
                  const joinedDate = m.joined_at ? api.helpers.formatDate(m.joined_at).split(',')[0] : 'Active';

                  return (
                    <tr
                      key={m.id}
                      className="fd-fade-up fd-stagger"
                      style={{ '--fd-delay': `${index * 0.05}s` } as React.CSSProperties}
                    >
                      <td data-label="Member">
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary-container)',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {m.username.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{m.username}</span>
                          {m.role === 'admin' && (
                            <i
                              className="fas fa-crown"
                              style={{ color: '#f59e0b', fontSize: '0.75rem' }}
                              title="Family Administrator"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </td>

                      <td data-label="Email" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {m.email || '—'}
                      </td>

                      <td data-label="Role">
                        {m.role === 'admin' ? (
                          <span className="badge badge-primary">Admin</span>
                        ) : (
                          <span className="badge badge-success">Member</span>
                        )}
                      </td>

                      <td data-label="Cloud Storage">
                        {m.storage_connected ? (
                          <span className="cloud-member-badge active" title="Storage Pool Active">
                            <i className="fab fa-google" style={{ color: '#4285F4', marginRight: '0.35rem' }} aria-hidden="true" />
                            Google Drive ({api.helpers.formatBytes(m.storage_contributed_bytes || 16106127360)})
                          </span>
                        ) : (
                          <span className="cloud-member-badge none" title="Using shared family pool">
                            <i className="fas fa-layer-group" style={{ marginRight: '0.35rem' }} aria-hidden="true" />
                            Shared Pool
                          </span>
                        )}
                      </td>

                      <td data-label="Joined">{joinedDate}</td>

                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        {isCurrent ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-ink-muted)', fontStyle: 'italic' }}>
                            You
                          </span>
                        ) : isAdmin ? (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => handleRemove(m.user_id, m.username)}
                          >
                            <i className="fas fa-user-minus" aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-ink-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Dialog Modal */}
      {showInviteModal && (
        <div id="modal-invite" className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="famdoc-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Invite Family Member</h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Close modal"
                onClick={() => setShowInviteModal(false)}
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <i
                className="fas fa-envelope-open-text"
                style={{ fontSize: '3rem', color: 'var(--accent-brand)', marginBottom: '1rem' }}
                aria-hidden="true"
              />
              <h4 style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, marginBottom: '0.5rem' }}>
                Share Your Secret Invite Code
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-ink-muted)', marginBottom: '1.5rem' }}>
                Family members can install the FamDoc Android app or visit the web app, click &quot;Join Family Vault&quot;,
                and enter this invitation code:
              </p>

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '3px',
                  color: 'var(--accent-brand)',
                  backgroundColor: 'var(--surface-paper-tint)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-paper-dark)',
                  marginBottom: '1rem',
                  textDecoration: timeLeft === 0 ? 'line-through' : 'none',
                  opacity: timeLeft === 0 ? 0.6 : 1,
                }}
              >
                {effectiveCode}
              </div>

              {effectiveCode && effectiveCode !== 'FAMD-0000-0000' && timeLeft !== null && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: timeLeft === 0 || timeLeft <= 15 ? (timeLeft === 0 ? '#ef4444' : '#f59e0b') : '#10b981',
                      backgroundColor:
                        timeLeft === 0 || timeLeft <= 15
                          ? timeLeft === 0
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.18)'
                          : 'rgba(16, 185, 129, 0.15)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <i
                      className={`fas ${
                        timeLeft === 0
                          ? 'fa-exclamation-circle'
                          : timeLeft > 65
                          ? 'fa-shield-alt'
                          : 'fa-stopwatch'
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      {timeLeft === 0
                        ? 'Expired (1-Min Limit)'
                        : timeLeft > 65
                        ? 'Standard Access Code'
                        : timeLeft <= 15
                        ? `Expiring in: ${timeLeft}s`
                        : `Valid for: ${timeLeft}s`}
                    </span>
                  </span>
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={timeLeft === 0}
                onClick={() => {
                  handleCopyCode();
                  setShowInviteModal(false);
                }}
              >
                <i className="fas fa-copy" aria-hidden="true" />
                <span>{timeLeft === 0 ? 'Code Expired (Regenerate First)' : 'Copy Code & Close'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
