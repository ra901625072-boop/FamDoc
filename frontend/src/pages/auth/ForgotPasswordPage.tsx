import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../api/client';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { scaleInVariants, fadeInVariants, tactilePress } from '../../lib/motion';

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

      <motion.div
        id="auth-card"
        className="famdoc-card auth-card"
        variants={scaleInVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="auth-header">
          <Link to="/" className="auth-crest-container" title="Back to home">
            <img src="/img/logo.svg" alt="FamDoc Crest" className="auth-crest-img" />
          </Link>
          <h1 className="auth-title">Reset Vault Password</h1>
          <p className="auth-subtitle">
            Step {stage} of 3: {stage === 1 ? 'Enter your email' : stage === 2 ? 'Verify reset code' : 'Set new password'}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              id="error-alert"
              className="famdoc-alert warning"
              initial={{ opacity: 0, y: -6, x: -3 }}
              animate={{ opacity: 1, y: 0, x: [0, -3, 3, -2, 2, 0] }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}
            >
              <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <div id="error-message">{error}</div>
            </motion.div>
          )}

          {success && (
            <motion.div
              className="famdoc-alert success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}
            >
              <CheckCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <div>{success}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {stage === 1 && (
            <motion.form
              key="stage1"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleStage1}
            >
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
              <motion.button
                type="submit"
                id="btn-submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                {...tactilePress}
              >
                <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
              </motion.button>
            </motion.form>
          )}

          {stage === 2 && (
            <motion.form
              key="stage2"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleStage2}
            >
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
              <motion.button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                {...tactilePress}
              >
                <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
              </motion.button>
            </motion.form>
          )}

          {stage === 3 && (
            <motion.form
              key="stage3"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onSubmit={handleStage3}
            >
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
              <motion.button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                {...tactilePress}
              >
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <div>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
