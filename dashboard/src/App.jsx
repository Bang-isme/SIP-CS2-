import { useEffect, useState } from 'react';
import { getMe, isAuthenticated, logout, setUnauthorizedHandler } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [isRegistering, setIsRegistering] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
      setProfileLoading(false);
      setIsRegistering(false);
      setAuthenticated(false);
      setAuthNotice('Session expired. Please sign in again.');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setCurrentUser(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const response = await getMe();
        if (active) {
          setCurrentUser(response?.data || null);
        }
      } catch {
        if (active) {
          void logout({ revoke: false });
          setCurrentUser(null);
          setAuthenticated(false);
          setAuthNotice('Session expired. Please sign in again.');
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [authenticated]);

  const handleLogin = () => {
    setAuthNotice('');
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setCurrentUser(null);
      setAuthenticated(false);
    }
  };

  if (!authenticated) {
    if (isRegistering) {
      return <Register onSwitchToLogin={() => setIsRegistering(false)} />;
    }
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => {
          setAuthNotice('');
          setIsRegistering(true);
        }}
        sessionNotice={authNotice}
      />
    );
  }

  if (profileLoading) {
    return (
      <div className="app-loading-shell">
        <div className="app-loading-card">
          <span className="app-loading-spinner"></span>
          <span>Loading secure session...</span>
        </div>
      </div>
    );
  }

  return <Dashboard onLogout={handleLogout} currentUser={currentUser} />;
}

export default App;
