import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser, useFamilyDetails, useRegenerateSecretCode, useUpdateFamilyDetails } from '../api/hooks';
import { api } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const { data: family } = useFamilyDetails();
  const regenCodeMut = useRegenerateSecretCode();
  const updateFamilyMut = useUpdateFamilyDetails();
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Family Editable State
  const [familyName, setFamilyName] = useState('');
  const [maxMembers, setMaxMembers] = useState(10);
  const [savingFamily, setSavingFamily] = useState(false);

  // Code & 1-Minute Expiration State
  const [localSecretCode, setLocalSecretCode] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_family_secret_code') : null;
  });
  const [expiresAt, setExpiresAt] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('famdoc_family_code_expires_at') : null;
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const effectiveUser = user || authUser;
  const isAdmin = effectiveUser?.role === 'admin';
  const effectiveCode = localSecretCode || family?.secret_code || '';

  useEffect(() => {
    if (effectiveUser?.username) setUsername(effectiveUser.username);
  }, [effectiveUser]);

  useEffect(() => {
    if (family) {
      setFamilyName(family.name);
      setMaxMembers(family.max_members);
      if (family.expires_at) {
        setExpiresAt(family.expires_at);
        localStorage.setItem('famdoc_family_code_expires_at', family.expires_at);
      }
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

  const handleSaveFamilyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const trimmedName = familyName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setStatusMsg({ text: 'Family name must be at least 2 characters long.', type: 'error' });
      return;
    }

    if (maxMembers < 2 || maxMembers > 20) {
      setStatusMsg({ text: 'Members capacity must be between 2 and 20.', type: 'error' });
      return;
    }

    setSavingFamily(true);
    try {
      await updateFamilyMut.mutateAsync({
        name: trimmedName,
        maxMembers,
      });
      setStatusMsg({ text: 'Family vault settings saved successfully!', type: 'success' });
    } catch (err: unknown) {
      setStatusMsg({
        text: err instanceof Error ? err.message : 'Failed to save family settings.',
        type: 'error',
      });
    } finally {
      setSavingFamily(false);
    }
  };

  const handleCopyCode = () => {
    if (!effectiveCode) {
      alert('Please generate an invitation code first.');
      return;
    }
    if (timeLeft === 0) {
      alert('This invitation code has expired (it was only valid for 1 minute). Please click "Regenerate 1-Min Code" to create a fresh code.');
      return;
    }
    navigator.clipboard.writeText(effectiveCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateCode = async () => {
    const trimmedName = familyName.trim() || family?.name || 'Family Vault';
    const effectiveMax = maxMembers || family?.max_members || 10;

    try {
      const res = await regenCodeMut.mutateAsync({
        name: trimmedName,
        maxMembers: effectiveMax,
      });
      if (res && res.secret_code) {
        localStorage.setItem('famdoc_family_secret_code', res.secret_code);
        setLocalSecretCode(res.secret_code);
        const exp = res.expires_at || new Date(Date.now() + 60 * 1000).toISOString();
        localStorage.setItem('famdoc_family_code_expires_at', exp);
        setExpiresAt(exp);
        setStatusMsg({
          text: `New 1-minute family code generated: ${res.secret_code} (Valid for 60 seconds)`,
          type: 'success',
        });
      }
    } catch (err: unknown) {
      setStatusMsg({
        text: err instanceof Error ? err.message : 'Failed to generate code.',
        type: 'error',
      });
    }
  };

  // Preview code prefix based on user input
  const cleanLetters = (familyName.replace(/[^a-zA-Z]/g, '').slice(0, 2) || 'FD').toUpperCase();
  const namePrefix = cleanLetters.length === 1 ? `${cleanLetters}X` : cleanLetters;
  const numPrefix = String(maxMembers).padStart(2, '0').slice(-2);
  const codePreviewPrefix = `${namePrefix}${numPrefix}`;

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
            {isAdmin ? (
              <form onSubmit={handleSaveFamilyDetails} style={{ marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="family-name" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vault Name</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)' }}>First 2 letters used in code</span>
                  </label>
                  <input
                    type="text"
                    id="family-name"
                    className="form-control"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g. Family Vault"
                    required
                    minLength={2}
                    maxLength={40}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="family-max-members" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Members Roster Capacity</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)' }}>2 digits used in code (2–20)</span>
                  </label>
                  <input
                    type="number"
                    id="family-max-members"
                    className="form-control"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                    min={2}
                    max={20}
                    required
                  />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-ink-muted)', marginTop: '0.35rem' }}>
                    Allowed capacity: 2 to 20 members. Code preview prefix: <strong style={{ color: 'var(--accent-brand)', fontFamily: 'var(--font-mono)' }}>{codePreviewPrefix}-XXXX</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="submit"
                    id="btn-save-family"
                    className="btn btn-primary"
                    disabled={savingFamily}
                  >
                    <i className="fas fa-save" aria-hidden="true" />
                    <span>{savingFamily ? 'Saving...' : 'Save Vault Details'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    id="btn-regen-family-code"
                    onClick={handleRegenerateCode}
                    disabled={regenCodeMut.isPending}
                  >
                    <i className={`fas fa-sync-alt ${regenCodeMut.isPending ? 'fa-spin' : ''}`} aria-hidden="true" />
                    <span>
                      {regenCodeMut.isPending
                        ? 'Generating...'
                        : effectiveCode
                        ? 'Regenerate 1-Min Code'
                        : 'Generate 1-Min Code'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-ink-muted)', marginBottom: '0.25rem' }}>
                    Vault Name
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-ink)' }}>
                    {family?.name || "Kanuji's Family"}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-ink-muted)', marginBottom: '0.25rem' }}>
                    Members Roster Capacity
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-ink)' }}>
                    {family?.max_members || 10} Members Maximum
                  </div>
                </div>
              </div>
            )}

            {/* Perforated Invitation Stub */}
            <div id="ticket-reveal-container" style={{ marginTop: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-ink-muted)' }}>
                  Share invitation code
                </span>
                {effectiveCode && timeLeft !== null && (
                  timeLeft > 0 ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: timeLeft <= 15 ? '#ef4444' : '#10b981',
                        backgroundColor: timeLeft <= 15 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <i className="fas fa-stopwatch" aria-hidden="true" />
                      <span>Valid for: {timeLeft}s</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <i className="fas fa-exclamation-circle" aria-hidden="true" />
                      <span>Expired (Valid for 1 min)</span>
                    </span>
                  )
                )}
              </div>

              <div className="ticket-stub" style={{ borderColor: timeLeft === 0 ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
                <div>
                  <div className="ticket-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Family Invitation</span>
                    {timeLeft !== null && timeLeft > 0 && (
                      <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>● Active 1-Min Code</span>
                    )}
                  </div>
                  <div
                    className="ticket-code"
                    id="revealed-code"
                    style={{
                      textDecoration: timeLeft === 0 ? 'line-through' : 'none',
                      opacity: timeLeft === 0 ? 0.5 : 1,
                    }}
                  >
                    {effectiveCode || (isAdmin ? 'CLICK GENERATE ABOVE' : 'FAMD-0000-0000')}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  id="btn-copy-code"
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={handleCopyCode}
                  disabled={!effectiveCode || timeLeft === 0}
                  title={timeLeft === 0 ? 'Code has expired. Please regenerate.' : 'Copy invitation code'}
                >
                  <i className={`far ${copiedCode ? 'fa-check-circle' : 'fa-copy'}`} aria-hidden="true" />
                  <span>{copiedCode ? 'Copied' : timeLeft === 0 ? 'Expired' : 'Copy'}</span>
                </button>
              </div>

              {timeLeft === 0 && (
                <div style={{ marginTop: '0.65rem', fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-info-circle" aria-hidden="true" />
                  <span>Invitation codes expire after 1 minute for vault security. Click &quot;Regenerate 1-Min Code&quot; above to create a new code.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
