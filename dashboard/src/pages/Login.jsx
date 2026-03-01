import { useState } from 'react';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiHelpCircle,
  FiInfo,
  FiLogIn,
  FiLock,
  FiMail,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import { login } from '../services/api';
import './Login.css';

const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@localhost';
const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'admin_dev';

function Login({ onLogin, onSwitchToRegister, sessionNotice = '' }) {
  const [email, setEmail] = useState(DEMO_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEMO_ADMIN_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="login-container fade-in">
      <div className="login-split">
        {/* Left Side - Brand & Visual */}
        <div className="login-brand-panel">
          <div className="brand-content">
            <h1>SIP-CS <span className="highlight">Analytics</span></h1>
            <p className="brand-tagline">Comprehensive HR & Payroll Intelligence for the Modern Enterprise.</p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="icon" aria-hidden="true"><FiBarChart2 size={20} /></span>
                <div>
                  <h4>Real-time Insights</h4>
                  <p>Monitor KPIs instantly</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon" aria-hidden="true"><FiShield size={20} /></span>
                <div>
                  <h4>Secure Access</h4>
                  <p>Enterprise-grade security</p>
                </div>
              </div>
            </div>
          </div>
          <div className="brand-overlay"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-panel">
          <div className="form-wrapper">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Please enter your details to sign in.</p>
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
                    required
                    className="input-field input-with-icon"
                  />
                </div>
              </div>

              <div className="form-actions">
                <label className="remember-me" htmlFor="remember-me">
                  <input id="remember-me" type="checkbox" /> Remember me
                </label>
                <button
                  type="button"
                  className="forgot-password-btn"
                  onClick={() => setError('Password reset is not available in demo mode.')}
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
              <p>
                Don&apos;t have an account?
                <button type="button" className="login-link-btn" onClick={onSwitchToRegister}>Sign Up</button>
              </p>
              <div className="demo-credentials">
                <FiUser size={13} aria-hidden="true" />
                <span>Demo:</span>
                <code>{DEMO_ADMIN_EMAIL}</code> / <code>{DEMO_ADMIN_PASSWORD}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}

export default Login;
