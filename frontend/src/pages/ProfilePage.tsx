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

  // Auto-dismiss status messages after 6 seconds
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

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

  // Intelligent code status badge formatter
  const renderCodeStatusBadge = () => {
    if (!effectiveCode) return null;
    if (timeLeft === null) return null;

    if (timeLeft === 0) {
      return (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            padding: '0.25rem 0.65rem',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <i className="fas fa-exclamation-circle" aria-hidden="true" />
          <span>Expired (1-Min Limit)</span>
        </span>
      );
    }

    if (timeLeft > 65) {
      return (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            padding: '0.25rem 0.65rem',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
          title="Active standard code. Click 'Generate New 1-Min Code' below for disposable 60s security."
        >
          <i className="fas fa-shield-alt" aria-hidden="true" />
          <span>Standard Access Code</span>
        </span>
      );
    }

    if (timeLeft <= 15) {
      return (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.18)',
            padding: '0.25rem 0.65rem',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid rgba(245, 158, 11, 0.4)',
          }}
        >
          <i className="fas fa-stopwatch" aria-hidden="true" />
          <span>Expiring in: {timeLeft}s</span>
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          padding: '0.25rem 0.65rem',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        <i className="fas fa-stopwatch" aria-hidden="true" />
        <span>Valid for: {timeLeft}s</span>
      </span>
    );
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
          className="famdoc-alert fd-fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: statusMsg.type === 'success' ? 'var(--surface-alert-info)' : 'rgba(239, 68, 68, 0.12)',
            color: statusMsg.type === 'success' ? 'var(--color-primary)' : '#ef4444',
            border: `1px solid ${statusMsg.type === 'success' ? 'var(--border-paper)' : 'rgba(239, 68, 68, 0.35)'}`,
            fontWeight: 600,
            fontSize: '0.85rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <i
              className={`fas ${statusMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}
              aria-hidden="true"
            />
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            aria-label="Dismiss alert"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              fontSize: '1rem',
              lineHeight: 1,
              opacity: 0.75,
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
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
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-ink-muted)' }}>
              Configure vault identity and manage 1-minute ephemeral invite passes.
            </p>
          </div>

          <div>
            {isAdmin ? (
              <div>
                {/* Zone 1: Vault Configuration Form */}
                <form onSubmit={handleSaveFamilyDetails}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="family-name" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Vault Name</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)' }}>First 2 letters form code prefix</span>
                    </label>
                    <input
                      type="text"
                      id="family-name"
                      className="form-control"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="e.g. Rajput Kanuji"
                      required
                      minLength={2}
                      maxLength={40}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor="family-max-members" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Members Roster Capacity</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-ink-muted)' }}>2 digits form code middle (2–20)</span>
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
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-ink-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <i className="fas fa-info-circle" style={{ color: 'var(--accent-brand)' }} aria-hidden="true" />
                      <span>
                        Allowed: 2 to 20 members. Code prefix preview:{' '}
                        <strong style={{ color: 'var(--accent-brand)', fontFamily: 'var(--font-mono)' }}>{codePreviewPrefix}-XXXX</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-save-family"
                    className="btn btn-primary"
                    disabled={savingFamily}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1.25rem' }}
                  >
                    <i className={`fas ${savingFamily ? 'fa-spinner fa-spin' : 'fa-save'}`} aria-hidden="true" />
                    <span>{savingFamily ? 'Saving Vault Details...' : 'Save Vault Details'}</span>
                  </button>
                </form>

                {/* Elegant Zone Divider */}
                <div style={{ margin: '1.75rem 0', position: 'relative', textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid var(--border-paper)', position: 'absolute', top: '50%', left: 0, right: 0 }} />
                  <span
                    style={{
                      position: 'relative',
                      background: 'var(--surface-card)',
                      padding: '0 0.85rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-ink-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.75px',
                    }}
                  >
                    Invitation Access Pass
                  </span>
                </div>

                {/* Zone 2: Ephemeral 1-Minute Invitation Pass */}
                <div id="ticket-reveal-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-ink-muted)', fontWeight: 600 }}>
                      Share invitation code
                    </span>
                    {renderCodeStatusBadge()}
                  </div>

                  {/* Perforated Luxury Ticket Stub */}
                  <div
                    className="ticket-stub"
                    style={{
                      borderColor: timeLeft === 0 ? 'rgba(239, 68, 68, 0.4)' : undefined,
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <div className="ticket-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Family Invitation Pass</span>
                        {timeLeft !== null && timeLeft > 0 && timeLeft <= 65 && (
                          <span style={{ color: timeLeft <= 15 ? '#f59e0b' : '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>
                            ● Active 1-Min Code
                          </span>
                        )}
                        {timeLeft !== null && timeLeft > 65 && (
                          <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>
                            ● Vault Secret Code
                          </span>
                        )}
                        {timeLeft === 0 && (
                          <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 600 }}>
                            ✕ Expired
                          </span>
                        )}
                      </div>
                      <div
                        className="ticket-code"
                        id="revealed-code"
                        style={{
                          textDecoration: timeLeft === 0 ? 'line-through' : 'none',
                          opacity: timeLeft === 0 ? 0.45 : 1,
                          letterSpacing: '2.5px',
                        }}
                      >
                        {effectiveCode || 'CLICK GENERATE BELOW'}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      id="btn-copy-code"
                      style={{ padding: '0.55rem 1.15rem' }}
                      onClick={handleCopyCode}
                      disabled={!effectiveCode || timeLeft === 0}
                      title={timeLeft === 0 ? 'Code has expired. Please regenerate.' : 'Copy invitation code'}
                    >
                      <i className={`far ${copiedCode ? 'fa-check-circle' : 'fa-copy'}`} aria-hidden="true" />
                      <span>{copiedCode ? 'Copied!' : timeLeft === 0 ? 'Expired' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Action Button: Directly Under Ticket Stub */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    id="btn-regen-family-code"
                    onClick={handleRegenerateCode}
                    disabled={regenCodeMut.isPending}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.65rem 1.25rem' }}
                  >
                    <i className={`fas fa-sync-alt ${regenCodeMut.isPending ? 'fa-spin' : ''}`} aria-hidden="true" />
                    <span>
                      {regenCodeMut.isPending
                        ? 'Generating Secure 1-Min Code...'
                        : effectiveCode
                        ? 'Regenerate 1-Min Code'
                        : 'Generate 1-Min Code'}
                    </span>
                  </button>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-ink-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem', lineHeight: 1.4 }}>
                    <i className="fas fa-shield-alt" style={{ color: 'var(--accent-brand)', fontSize: '0.85rem' }} aria-hidden="true" />
                    <span>
                      For security, generated codes automatically expire after <strong>60 seconds</strong>. Family members must submit it in &quot;Join Family Vault&quot; before the timer runs out.
                    </span>
                  </div>
                </div>
              </div>
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

                <div className="ticket-stub" style={{ marginTop: '1.5rem' }}>
                  <div>
                    <div className="ticket-label">Family Vault Code</div>
                    <div className="ticket-code">{effectiveCode || 'FAMD-0000-0000'}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyCode}
                    disabled={!effectiveCode}
                  >
                    <i className={`far ${copiedCode ? 'fa-check-circle' : 'fa-copy'}`} aria-hidden="true" />
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
