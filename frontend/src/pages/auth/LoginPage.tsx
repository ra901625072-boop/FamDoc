import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="guest-wrapper">
      <div className="landing-ambient-glow" aria-hidden="true" />
      <div className="guest-theme-toggle">
        <ThemeToggle />
      </div>

      <div id="auth-card" className="famdoc-card auth-card fd-pop-in" style={{ position: 'relative', zIndex: 1 }}>
        <div className="auth-header">
          <Link to="/" className="auth-crest-container" title="Back to home">
            <img src="/img/logo.svg" alt="FamDoc Crest" className="auth-crest-img" />
          </Link>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Enter your family keepsake vault</p>
        </div>

        {error && (
          <div id="error-alert" className="famdoc-alert warning fd-shake" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
            <div id="error-message">{error}</div>
          </div>
        )}

        <form id="login-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="form-control"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="password" className="form-label" style={{ marginBottom: 0, fontWeight: 600, fontSize: '0.85rem' }}>
                Password
              </label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                Forgot Password?
              </Link>
            </div>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-control"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff style={{ width: '1rem', height: '1rem' }} /> : <Eye style={{ width: '1rem', height: '1rem' }} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            <i className="fas fa-sign-in-alt" aria-hidden="true" />
            <span>{loading ? 'Authenticating...' : 'Enter Vault'}</span>
          </button>
        </form>

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.75rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <div>
            New to FamDoc?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Create a Vault
            </Link>
          </div>
          <div>
            Have an invite code?{' '}
            <Link to="/join" style={{ color: 'var(--brand-accent)', fontWeight: 700 }}>
              Join Family Vault
            </Link>
          </div>
        </div>

        <div className="auth-divider" style={{ margin: '1.75rem 0 1.25rem 0' }}>
          <span>or continue with</span>
        </div>

        <GoogleSignInButton
          label="Continue with Google"
          onError={(msg) => setError(msg)}
        />
      </div>
    </div>
  );
}
