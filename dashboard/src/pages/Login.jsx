import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiHelpCircle,
  FiInfo,
  FiLogIn,
  FiLock,
  FiMail,
  FiShield,
  FiUserPlus,
} from 'react-icons/fi';
import { login } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/formatters';
import { isDemoShortcutsEnabled, isSelfSignupEnabled } from '../utils/featureFlags';
import './Login.css';

const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@localhost';
const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'admin_dev';

function Login() {
  const { handleLogin, authNotice, clearNotice } = useAuth();
  const { notifyError, notifyInfo, notifySuccess } = useToast();
  const location = useLocation();
  const sessionNotice = authNotice || location.state?.notice || '';
  const demoShortcutsEnabled = isDemoShortcutsEnabled();
  const selfSignupEnabled = isSelfSignupEnabled();
  const autoLoginAttemptedRef = useRef(false);
  const [email, setEmail] = useState(demoShortcutsEnabled ? DEMO_ADMIN_EMAIL : '');
  const [password, setPassword] = useState(demoShortcutsEnabled ? DEMO_ADMIN_PASSWORD : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoLoginRequested =
    demoShortcutsEnabled
    && typeof window !== 'undefined'
    && new URLSearchParams(location.search).get('demoLogin') === '1';

  const submitLogin = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      clearNotice();
      notifySuccess('Signed in', 'Dashboard access is ready.');
      handleLogin(response);
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed. Please check credentials.');
      setError(message);
      notifyError('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  }, [clearNotice, email, handleLogin, notifyError, notifySuccess, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin();
  };

  useEffect(() => {
    if (!demoLoginRequested || loading || autoLoginAttemptedRef.current) {
      return;
    }
    autoLoginAttemptedRef.current = true;
    void submitLogin();
  }, [demoLoginRequested, loading, submitLogin]);

  return (

    <div className="login-container fade-in">
      <div className="login-split">
        {/* Left Side - Brand & Visual */}
        <div className="login-brand-panel">
          <div className="brand-content">
            <p className="brand-kicker">People Operations Console</p>
            <h1>Review HR and payroll data with less noise.</h1>
            <p className="brand-tagline">
              {selfSignupEnabled
                ? 'Open one shared workspace to review executive status, operational alerts, and integration health.'
                : 'Open one internal workspace to review executive status, operational alerts, and integration health.'}
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="icon" aria-hidden="true"><FiCheckCircle size={18} /></span>
                <div>
                  <h4>Shared source records</h4>
                  <p>HR records stay in one source and feed the main views.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon" aria-hidden="true"><FiShield size={20} /></span>
                <div>
                  <h4>Role aware</h4>
                  <p>Admin actions stay behind permission checks.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-panel">
          <div className="form-wrapper">
              <div className="form-header">
                <h2>Sign in</h2>
                <p>
                  {demoShortcutsEnabled
                    ? 'Use your account or the local review credentials below.'
                    : selfSignupEnabled
                      ? 'Use your workspace account to continue.'
                      : 'Use your internal account to continue.'}
                </p>
              </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="login-email">Email Address</label>
                <div className="input-shell">
                  <span className="input-icon" aria-hidden="true"><FiMail size={16} /></span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="username"
                    required
                    className="input-field input-with-icon"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <div className="input-shell">
                  <span className="input-icon" aria-hidden="true"><FiLock size={16} /></span>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    autoComplete="current-password"
                    required
                    className="input-field input-with-icon"
                  />
                </div>
              </div>

              <div className="form-actions form-actions--compact">
                <button
                  type="button"
                  className="forgot-password-btn"
                  onClick={() => {
                    const message = 'Password reset is handled outside this console. Contact your administrator or identity provider.';
                    setError(message);
                    notifyInfo('Password reset', message);
                  }}
                >
                  <FiHelpCircle size={14} aria-hidden="true" />
                  <span>Forgot password?</span>
                </button>
              </div>

              {sessionNotice && (
                <div className="notice-message" role="status" aria-live="polite">
                  <FiInfo size={14} aria-hidden="true" />
                  <span>{sessionNotice}</span>
                </div>
              )}

              {error && (
                <div className="error-message" role="alert">
                  <FiAlertTriangle size={14} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="login-btn">
                <span className="login-btn-content">
                  <FiLogIn size={16} aria-hidden="true" />
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                </span>
              </button>
            </form>

              <div className="login-footer">
                {selfSignupEnabled ? (
                  <>
                    <p>Need an account?</p>
                    <div className="login-footer-actions">
                      <Link to="/register" className="login-link-btn login-link-btn--cta">
                        <FiUserPlus size={14} aria-hidden="true" />
                        <span>Create one</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="login-access-note">
                    <FiShield size={14} aria-hidden="true" />
                    <span>Access is provisioned by an administrator for this workspace.</span>
                  </div>
                )}
                {demoShortcutsEnabled && (
                  <div className="demo-credentials">
                    <FiShield size={13} aria-hidden="true" />
                    <span>Local review account</span>
                    <code>{DEMO_ADMIN_EMAIL}</code> / <code>{DEMO_ADMIN_PASSWORD}</code>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );

}

export default Login;
