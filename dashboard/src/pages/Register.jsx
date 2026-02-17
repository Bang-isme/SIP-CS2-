import { useState } from 'react';
import { register } from '../services/api';
import './Login.css'; // Reusing Login styles for consistency

function Register({ onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await register(username, email, password);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
            <p className="brand-tagline">Join the platform for Comprehensive HR & Payroll Intelligence.</p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="icon">FAST</span>
                <div>
                  <h4>Get Started</h4>
                  <p>Create your account today</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">SEC</span>
                <div>
                  <h4>Secure Access</h4>
                  <p>Enterprise-grade security</p>
                </div>
              </div>
            </div>
          </div>
          <div className="brand-overlay"></div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="login-form-panel">
          <div className="form-wrapper">
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Please enter your details to register.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="register-username">Username</label>
                <input
                  id="register-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  required
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="register-email">Email Address</label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="input-field"
                />
              </div>

              {error && (
                <div className="error-message" role="alert">
                  <span>WARN</span> {error}
                </div>
              )}

              {success && (
                <div className="success-message" role="status" aria-live="polite">
                  <span>OK</span> {success}
                </div>
              )}

              <button type="submit" disabled={loading} className="login-btn">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div className="login-footer">
              <p>
                Already have an account?
                <button type="button" className="login-link-btn" onClick={onSwitchToLogin}>Sign In</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
