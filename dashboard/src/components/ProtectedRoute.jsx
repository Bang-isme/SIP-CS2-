import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { authenticated, profileLoading } = useAuth();

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

  if (!authenticated) return <Navigate to="/login" replace />;

  return children;
}
