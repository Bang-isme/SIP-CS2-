import { useState } from 'react';
import { login } from '../services/api';
import './Login.css';

function Login({ onLogin }) {
    const [email, setEmail] = useState('admin@localhost');
    const [password, setPassword] = useState('admin');
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
                                <span className="icon">🚀</span>
                                <div>
                                    <h4>Real-time Insights</h4>
                                    <p>Monitor KPIs instantly</p>
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

                {/* Right Side - Login Form */}
                <div className="login-form-panel">
                    <div className="form-wrapper">
                        <div className="form-header">
                            <h2>Welcome Back</h2>
                            <p>Please enter your details to sign in.</p>
                        </div>

                        <form onSubmit={handleSubmit}>
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

                            <div className="form-actions">
                                <label className="remember-me">
                                    <input type="checkbox" /> Remember me
                                </label>
                                <a href="#" className="forgot-password">Forgot password?</a>
                            </div>

                            {error && (
                                <div className="error-message">
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="login-btn">
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p>Don't have an account? <a href="#">Contact Admin</a></p>
                            <div className="demo-credentials">
                                Demo: <code>admin@localhost</code> / <code>admin</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}

export default Login;
