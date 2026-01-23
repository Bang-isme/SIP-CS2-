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
                                <span className="icon">🚀</span>
                                <div>
                                    <h4>Get Started</h4>
                                    <p>Create your account today</p>
                                </div>
                            </div>
                            <div className="feature-item">
                                <span className="icon">🛡️</span>
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
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="johndoe"
                                    required
                                    className="input-field"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="input-field"
                                />
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="input-field"
                                />
                            </div>

                            {error && (
                                <div className="error-message">
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            {success && (
                                <div className="success-message" style={{ color: 'green', marginBottom: '1rem', padding: '10px', background: '#e6fffa', borderRadius: '4px' }}>
                                    <span>✅</span> {success}
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="login-btn">
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>Sign In</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
