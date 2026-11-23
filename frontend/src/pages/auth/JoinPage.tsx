import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { scaleInVariants, easings } from '../../lib/motion';

export function JoinPage() {
  const [secretCode, setSecretCode] = useState('');
  const [username, setUsername] = useState('');
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
      const res = await api.auth.joinFamily(username, email, secretCode, password);
      setAuth(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join family vault.';
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

      <motion.div
        id="auth-card"
        variants={scaleInVariants}
        initial="initial"
        animate="animate"
        className="famdoc-card auth-card"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="auth-header">
          <Link to="/" className="auth-crest-container" title="Back to home">
            <img src="/img/logo.svg" alt="FamDoc Crest" className="auth-crest-img" />
          </Link>
          <h1 className="auth-title">Join Family Vault</h1>
          <p className="auth-subtitle">Enter the secret code shared by your family vault organizer</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              id="error-alert"
              className="famdoc-alert warning"
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto', x: [0, -4, 4, -3, 3, 0] }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.35, ease: easings.easeInOut }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', overflow: 'hidden' }}
            >
              <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <div id="error-message">{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <form id="join-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="secret-code" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Family Secret Invite Code
            </label>
            <input
              id="secret-code"
              type="text"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
              placeholder="e.g. FAMD-7K9W2X"
              required
              className="form-control"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="username" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Your Name / Display Name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Grandma_Meera"
              required
              className="form-control"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

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
            <label htmlFor="password" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Choose a Password
            </label>
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

          <motion.button
            type="submit"
            id="btn-submit"
            disabled={loading}
            className="btn btn-primary"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-key'} aria-hidden="true" />
            <span>{loading ? 'Joining Vault...' : 'Join Family Vault'}</span>
          </motion.button>
        </form>

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <div>
            Need to create your own family vault?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Create a Vault
            </Link>
          </div>
          <div>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
