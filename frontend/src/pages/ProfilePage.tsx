import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser, useFamilyDetails, useRegenerateSecretCode } from '../api/hooks';
import { api } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const { data: family } = useFamilyDetails();
  const regenCodeMut = useRegenerateSecretCode();
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [localSecretCode, setLocalSecretCode] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_family_secret_code') : null;
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = user?.role === 'admin';
  const effectiveCode = localSecretCode || family?.secret_code || '';

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user]);

  useEffect(() => {
    const handleCodeUpdate = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setLocalSecretCode(custom.detail);
      } else {
        setLocalSecretCode(localStorage.getItem('famdoc_family_secret_code'));
      }
    };
    window.addEventListener('famdoc:secret-code-updated', handleCodeUpdate);
    return () => window.removeEventListener('famdoc:secret-code-updated', handleCodeUpdate);
  }, []);

  useEffect(() => {
    if (searchParams.get('invite') === 'true') {
      const el = document.getElementById('ticket-reveal-container');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    setSavingProfile(true);
    try {
      const payload: { username?: string; password?: string; current_password?: string } = {};
      if (username !== user?.username) payload.username = username;
      if (newPassword) {
        payload.password = newPassword;
        payload.current_password = currentPassword;
      }

      const updated = await api.auth.updateProfile(payload);
      setUser(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: unknown) {
      setStatusMsg({
        text: err instanceof Error ? err.message : 'Failed to update profile.',
        type: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCopyCode = () => {
    if (effectiveCode) {
      navigator.clipboard.writeText(effectiveCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      alert('Please generate an invitation code first.');
    }
  };

  const handleRegenerateCode = async () => {
    const promptText = effectiveCode
      ? 'Regenerate vault invitation code? The old code will stop working for new members.'
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
          setStatusMsg({
            text: `New family invite code generated: ${res.secret_code}`,
            type: 'success',
          });
        }
      } catch (err: unknown) {
        setStatusMsg({
          text: err instanceof Error ? err.message : 'Failed to generate code.',
          type: 'error',
        });
      }
    }
  };

  return (
    <div className="fd-fade-in space-y-6">
      {/* Content Header */}
      <div className="content-header fd-fade-in">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your credentials and family vault details.</p>
        </div>
      </div>

      {statusMsg && (
        <div
          className="famdoc-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: statusMsg.type === 'success' ? 'var(--surface-alert-info)' : 'rgba(239, 68, 68, 0.1)',
            color: statusMsg.type === 'success' ? 'var(--color-primary)' : 'var(--warning-red)',
            border: `1px solid ${statusMsg.type === 'success' ? 'var(--border-paper)' : 'rgba(239, 68, 68, 0.3)'}`,
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          <i
            className={`fas ${statusMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}
            aria-hidden="true"
          />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Two-Column Grid */}
      <div className="profile-grid">
        {/* Card 1: Account Details */}
        <div className="famdoc-card fd-fade-up" style={{ '--fd-delay': '0.05s' } as React.CSSProperties}>
          <div className="famdoc-card-header" style={{ marginBottom: '1.25rem' }}>
            <h2 className="famdoc-card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>
              <i className="fas fa-user-circle" style={{ color: 'var(--accent-brand)', marginRight: '0.5rem' }} aria-hidden="true" />
              Account Details
            </h2>
          </div>

          <form id="profile-form" onSubmit={handleUpdateProfile}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="profile-email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="profile-email"
                className="form-control"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="profile-username" className="form-label">
                Username
              </label>
              <input
                type="text"
                id="profile-username"
                className="form-control"
                placeholder="Choose a username"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="profile-password" className="form-label">
                Update Password (Optional)
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  id="profile-password"
                  className="form-control"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label="Toggle visibility"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                >
                  <i className={`fas ${showCurrentPw ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="profile-confirm-password" className="form-label">
                New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  id="profile-confirm-password"
                  className="form-control"
                  placeholder="Min. 8 characters with 1 uppercase and 1 number"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label="Toggle visibility"
                  onClick={() => setShowNewPw(!showNewPw)}
                >
                  <i className={`fas ${showNewPw ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-save-profile"
              className="btn btn-primary"
              disabled={savingProfile}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <i className="fas fa-save" aria-hidden="true" />
              <span>{savingProfile ? 'Saving...' : 'Save Profile Details'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Family Vault Details */}
        <div className="famdoc-card fd-fade-up" style={{ '--fd-delay': '0.1s' } as React.CSSProperties}>
          <div className="famdoc-card-header" style={{ marginBottom: '1.25rem' }}>
            <h2 className="famdoc-card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>
              <i className="fas fa-home" style={{ color: 'var(--accent-brand)', marginRight: '0.5rem' }} aria-hidden="true" />
              Family Vault Details
            </h2>
          </div>

          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-ink-muted)',
                  marginBottom: '0.25rem',
                }}
              >
                Vault Name
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-ink)' }}>
                {family?.name || "Kanuji's Family"}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-ink-muted)',
                  marginBottom: '0.25rem',
                }}
              >
                Members Roster Capacity
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-ink)' }}>
                {family?.max_members || 10} Members Maximum
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary"
                id="btn-regen-family-code"
                style={{ width: 'fit-content' }}
                onClick={handleRegenerateCode}
                disabled={regenCodeMut.isPending}
              >
                <i className={`fas fa-sync-alt ${regenCodeMut.isPending ? 'fa-spin' : ''}`} aria-hidden="true" />
                <span>
                  {regenCodeMut.isPending
                    ? 'Generating...'
                    : effectiveCode
                    ? 'Regenerate Vault Invitation Code'
                    : 'Generate Vault Invitation Code'}
                </span>
              </button>
            )}

            {/* Perforated Invitation Stub */}
            <div id="ticket-reveal-container" style={{ marginTop: '2rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-ink-muted)',
                  marginBottom: '0.5rem',
                }}
              >
                Share invitation code
              </div>

              <div className="ticket-stub">
                <div>
                  <div className="ticket-label">Family Invitation</div>
                  <div className="ticket-code" id="revealed-code">
                    {effectiveCode || (isAdmin ? 'CLICK GENERATE ABOVE' : 'FAMD-0000-0000')}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  id="btn-copy-code"
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={handleCopyCode}
                  disabled={!effectiveCode}
                >
                  <i className={`far ${copiedCode ? 'fa-check-circle' : 'fa-copy'}`} aria-hidden="true" />
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
