import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiCheckCircle, FiLogIn, FiLock, FiMail, FiShield, FiUser, FiUserPlus } from 'react-icons/fi';
import { register } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage, isValidEmail } from '../utils/formatters';
import { isSelfSignupEnabled } from '../utils/featureFlags';
import './Login.css'; // Reusing Login styles for consistency

const MIN_PASSWORD_LENGTH = 8;

function Register() {
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useToast();
  const selfSignupEnabled = isSelfSignupEnabled();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) {
      const message = 'Username is required.';
      setError(message);
      setSuccess('');
      notifyError('Registration failed', message);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      const message = 'Enter a valid email address before continuing.';
      setError(message);
      setSuccess('');
      notifyError('Registration failed', message);
      return;
    }

    if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      const message = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      setError(message);
      setSuccess('');
      notifyError('Registration failed', message);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await register(trimmedUsername, trimmedEmail, trimmedPassword, ['user']);
      const message = 'Registration successful! Redirecting to login...';
      setSuccess(message);
      notifySuccess('Account created', message);
      setTimeout(() => {
        navigate('/login', { state: { notice: 'Registration successful! Please sign in.' } });
      }, 2000);
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed. Please try again.');
      setError(message);
      notifyError('Registration failed', message);
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
            <p className="brand-kicker">People Operations Console</p>
            <h1>{selfSignupEnabled ? 'Create a workspace account.' : 'Request access.'}</h1>
            <p className="brand-tagline">
              {selfSignupEnabled
                ? 'Set up a workspace account quickly, then let the same role checks control what each user can reach.'
                : 'This internal dashboard uses administrator-provisioned access instead of open self-registration.'}
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="icon" aria-hidden="true"><FiUserPlus size={18} /></span>
                <div>
                  <h4>{selfSignupEnabled ? 'Simple setup' : 'Provisioned access'}</h4>
                  <p>{selfSignupEnabled ? 'Only username, email, and password are required.' : 'New accounts are issued by an administrator or external identity flow.'}</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon" aria-hidden="true"><FiShield size={18} /></span>
                <div>
                  <h4>Permission aware</h4>
                  <p>{selfSignupEnabled ? 'New accounts still go through the same backend checks.' : 'Roles and privileges are assigned before the account reaches this workspace.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="login-form-panel">
          <div className="form-wrapper">
            {selfSignupEnabled ? (
              <>
                <div className="form-header">
                  <h2>Create Account</h2>
                  <p>Enter a username, email, and password.</p>
                </div>
                <div className="form-note-strip">
                  <FiShield size={14} aria-hidden="true" />
                  <span>New accounts start with the default <strong>user</strong> role.</span>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="register-username">Username</label>
                    <div className="input-shell">
                      <span className="input-icon" aria-hidden="true"><FiUser size={16} /></span>
                      <input
                        id="register-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="johndoe"
                        required
                        className="input-field input-with-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="register-email">Email Address</label>
                    <div className="input-shell">
                      <span className="input-icon" aria-hidden="true"><FiMail size={16} /></span>
                      <input
                        id="register-email"
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
                    <label htmlFor="register-password">Password</label>
                    <div className="input-shell">
                      <span className="input-icon" aria-hidden="true"><FiLock size={16} /></span>
                      <input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        required
                        minLength={MIN_PASSWORD_LENGTH}
                        className="input-field input-with-icon"
                      />
                    </div>
                    <small className="form-helper-text">Use at least 8 characters.</small>
                  </div>

                  {error && (
                    <div className="error-message" role="alert">
                      <FiAlertTriangle size={14} aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="success-message" role="status" aria-live="polite">
                      <FiCheckCircle size={14} aria-hidden="true" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="login-btn">
                    <span className="login-btn-content">
                      <FiUserPlus size={16} aria-hidden="true" />
                      <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <section className="request-access-panel" aria-label="Provisioned access information">
                <div className="form-header">
                  <h2>Access is provisioned by an administrator</h2>
                  <p>This workspace does not accept open self-signup.</p>
                </div>
                <div className="form-note-strip">
                  <FiShield size={14} aria-hidden="true" />
                  <span>Ask your administrator to create or invite your account before signing in.</span>
                </div>
                <div className="request-access-list">
                  <div className="request-access-item">
                    <strong>Who can help?</strong>
                    <span>The workspace owner, HR administrator, or identity administrator.</span>
                  </div>
                  <div className="request-access-item">
                    <strong>What happens next?</strong>
                    <span>Your role is assigned before you enter the dashboard, so permissions are correct on first sign-in.</span>
                  </div>
                </div>
              </section>
            )}

            <div className="login-footer">
              <p>{selfSignupEnabled ? 'Already have an account?' : 'Ready to continue?'}</p>
              <div className="login-footer-actions">
                <Link to="/login" className="login-link-btn login-link-btn--cta">
                  <FiLogIn size={14} aria-hidden="true" />
                  <span>{selfSignupEnabled ? 'Go to sign in' : 'Back to sign in'}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
