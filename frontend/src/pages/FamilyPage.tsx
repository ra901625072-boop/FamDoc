import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useFamilyDetails,
  useFamilyMembers,
  useRemoveFamilyMember,
  useRegenerateSecretCode,
  useCurrentUser,
} from '../api/hooks';
import { api } from '../api/client';

export function FamilyPage() {
  const { data: user } = useCurrentUser();
  const { data: family, isLoading: familyLoading, refetch: refetchFamily } = useFamilyDetails();
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useFamilyMembers();
  const removeMemberMut = useRemoveFamilyMember();

  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [localSecretCode, setLocalSecretCode] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_family_secret_code') : null;
  });
  const isAdmin = user?.role === 'admin';

  const effectiveCode = family?.secret_code || localSecretCode || 'FAMD-0000-0000';

  const handleCopyCode = () => {
    if (effectiveCode) {
      navigator.clipboard.writeText(effectiveCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (confirm('Regenerate family secret code? The old code will immediately stop working for new invites.')) {
      try {
        const res = await api.family.regenerateCode(family?.name, family?.max_members);
        if (res && res.secret_code) {
          localStorage.setItem('famdoc_family_secret_code', res.secret_code);
          setLocalSecretCode(res.secret_code);
          alert(`New secret code generated: ${res.secret_code}`);
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
              }}
            >
              {familyLoading ? 'LOADING...' : effectiveCode}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyCode}
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRegenerateCode}
                title="Regenerate secret invite code"
                style={{ padding: '0.5rem 0.75rem' }}
              >
                <i className="fas fa-sync-alt" aria-hidden="true" />
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
                  marginBottom: '1.5rem',
                }}
              >
                {family?.secret_code || 'FAMD-0000-0000'}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  handleCopyCode();
                  setShowInviteModal(false);
                }}
              >
                <i className="fas fa-copy" aria-hidden="true" />
                <span>Copy Code & Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
