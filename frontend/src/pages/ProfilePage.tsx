import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser, useFamilyDetails } from '../api/hooks';
import { api, resolveApiBaseUrl } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';
import { Shield, User, Lock, KeyRound, Copy, Check, Server, Save } from 'lucide-react';

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const { data: family } = useFamilyDetails();
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user?.username) setUsername(user.username);
    setCustomApiUrl(resolveApiBaseUrl());
  }, [user]);

  useEffect(() => {
    if (searchParams.get('invite') === 'true') {
      const el = document.getElementById('invite-code-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusMsg(null);
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

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customApiUrl) {
      localStorage.setItem('famdoc_api_base_url', customApiUrl.trim());
    } else {
      localStorage.removeItem('famdoc_api_base_url');
    }
    alert('API Base URL saved! Page will reload to apply changes.');
    window.location.reload();
  };

  const handleCopyCode = () => {
    if (family?.secret_code) {
      navigator.clipboard.writeText(family.secret_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        <h1 className="text-xl font-bold text-[var(--text-ink)]">Profile & Security Settings</h1>
        <p className="text-xs text-[var(--text-ink-muted)] mt-1">
          Manage your personal credentials, family access keys, and cloud configurations.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Secret Invite Code Card */}
      <div
        id="invite-code-section"
        className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-lg space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-emerald-300" />
          <h2 className="text-sm font-bold">Family Secret Invite Code</h2>
        </div>
        <p className="text-xs text-emerald-200">
          Share this code with your family members so they can join this vault directly.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 p-3 px-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-base font-bold tracking-widest text-emerald-300 select-all">
            {family?.secret_code || 'FAMD-0000-0000'}
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <div className="p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        <div className="flex items-center gap-2.5 mb-6">
          <User className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-ink)]">Account Details</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-ink)]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-ink)]">Email Address (Read-only)</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/20 text-xs text-[var(--text-ink-muted)] cursor-not-allowed"
            />
          </div>

          <div className="pt-4 border-t border-[var(--border-paper)] space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--color-primary)]" />
              <h3 className="text-xs font-bold text-[var(--text-ink)]">Change Password</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-ink)]">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-ink)]">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cloud Backend Configuration */}
      <div className="p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <Server className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-ink)]">Custom API Base URL</h2>
        </div>
        <p className="text-xs text-[var(--text-ink-muted)] mb-4">
          Default connects to Cloudflare backend at <code>https://api.famdoc.com</code>.
        </p>

        <form onSubmit={handleSaveApiUrl} className="flex gap-2">
          <input
            type="text"
            value={customApiUrl}
            onChange={(e) => setCustomApiUrl(e.target.value)}
            placeholder="https://api.famdoc.com or /api"
            className="flex-1 px-4 py-2 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-xs font-mono text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[var(--surface-paper-tint)] hover:bg-[var(--surface-paper-hover)] border border-[var(--border-paper)] text-xs font-semibold text-[var(--text-ink)] transition-colors cursor-pointer"
          >
            Save URL
          </button>
        </form>
      </div>
    </div>
  );
}
