import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AlertCircle, CheckCircle, KeyRound, Lock, Mail } from 'lucide-react';

export function ForgotPasswordPage() {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStage1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.auth.requestPasswordReset(email);
      setSuccess('Verification code sent to your email.');
      setStage(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleStage2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.auth.verifyResetOTP(email, otpCode);
      setSuccess('Code verified successfully.');
      setStage(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleStage3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.auth.confirmPasswordReset(email, otpCode, newPassword);
      setSuccess('Password updated successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-linen)]">
      <div className="w-full max-w-md bg-[var(--surface-card)] rounded-3xl p-8 border border-[var(--border-paper)] shadow-xl relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 no-underline">
            <img src="/img/logo.svg" alt="FamDoc Logo" className="w-12 h-12" />
          </Link>
          <h1 className="auth-title text-2xl font-extrabold text-[var(--text-ink)] tracking-tight">
            Reset Vault Password
          </h1>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1.5">
            Stage {stage} of 3: {stage === 1 ? 'Enter your email' : stage === 2 ? 'Verify code' : 'Choose new password'}
          </p>
        </div>

        {error && (
          <div
            id="error-alert"
            className="famdoc-alert warning mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 fd-shake"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div id="error-message">{error}</div>
          </div>
        )}

        {success && (
          <div className="famdoc-alert success mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        {stage === 1 && (
          <form onSubmit={handleStage1} className="space-y-4">
            <div className="form-group space-y-1.5">
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[var(--text-ink)]">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--text-ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-[var(--text-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                />
              </div>
            </div>

            <button
              id="btn-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {stage === 2 && (
          <form onSubmit={handleStage2} className="space-y-4">
            <div className="form-group space-y-1.5">
              <label htmlFor="otp-code" className="block text-xs font-semibold text-[var(--text-ink)]">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="otp-code"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-[var(--text-ink)] font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                />
              </div>
            </div>

            <button
              id="btn-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying code...' : 'Verify Code'}
            </button>
          </form>
        )}

        {stage === 3 && (
          <form onSubmit={handleStage3} className="space-y-4">
            <div className="form-group space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-semibold text-[var(--text-ink)]">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--text-ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-[var(--text-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                />
              </div>
            </div>

            <button
              id="btn-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Updating password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-[var(--border-paper)] text-center text-xs text-[var(--text-ink-muted)]">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
