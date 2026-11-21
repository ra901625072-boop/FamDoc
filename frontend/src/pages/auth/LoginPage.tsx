import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AlertCircle, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login(email, password);
      setAuth(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(msg);
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
            Sign In to FamDoc
          </h1>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1.5">
            Enter your credentials to access your family's vault
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-[var(--text-ink)]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-[var(--text-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              />
            </div>
          </div>

          <div className="form-group space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold text-[var(--text-ink)]">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-[var(--text-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border-paper)] text-center text-xs text-[var(--text-ink-muted)] space-y-2">
          <div>
            Need a new family vault?{' '}
            <Link to="/register" className="font-semibold text-[var(--color-primary)] hover:underline">
              Create Vault
            </Link>
          </div>
          <div>
            Have an invite code?{' '}
            <Link to="/join" className="font-semibold text-[var(--color-primary)] hover:underline">
              Join Family
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
