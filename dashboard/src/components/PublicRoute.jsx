import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PublicRoute({ children }) {
  const { authenticated, profileLoading } = useAuth();

  if (profileLoading) {
    return (
      <div className="app-loading-shell">
        <div className="app-loading-card">
          <span className="app-loading-spinner"></span>
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  if (authenticated && !profileLoading) return <Navigate to="/dashboard" replace />;

  return children;
}
