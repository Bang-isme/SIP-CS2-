import { useState } from 'react';
import { isAuthenticated } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthenticated(false);
  };

  if (!authenticated) {
    if (isRegistering) {
      return <Register onSwitchToLogin={() => setIsRegistering(false)} />;
    }
    return <Login onLogin={handleLogin} onSwitchToRegister={() => setIsRegistering(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
