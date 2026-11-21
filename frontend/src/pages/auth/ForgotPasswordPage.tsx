import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AlertCircle, CheckCircle } from 'lucide-react';

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
          <h1 className="auth-title">Reset Vault Password</h1>
          <p className="auth-subtitle">
            Step {stage} of 3: {stage === 1 ? 'Enter your email' : stage === 2 ? 'Verify reset code' : 'Set new password'}
          </p>
        </div>

        {error && (
          <div id="error-alert" className="famdoc-alert warning fd-shake" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
            <div id="error-message">{error}</div>
          </div>
        )}

        {success && (
          <div className="famdoc-alert success" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <CheckCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
            <div>{success}</div>
          </div>
        )}

        {stage === 1 && (
          <form onSubmit={handleStage1}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="reset-email" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="form-control"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              id="btn-submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
            </button>
          </form>
        )}

        {stage === 2 && (
          <form onSubmit={handleStage2}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="otp" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                6-Digit Reset Code
              </label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                required
                className="form-control"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
            </button>
          </form>
        )}

        {stage === 3 && (
          <form onSubmit={handleStage3}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="new-password" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 chars with 1 uppercase & 1 number"
                required
                className="form-control"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <div>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
