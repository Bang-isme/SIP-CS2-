import { Link } from 'react-router-dom';
import IntegrationEventsPanel from '../components/IntegrationEventsPanel';
import { useAuth } from '../contexts/AuthContext';

export default function IntegrationPage() {
  const { effectiveRole, permissions } = useAuth();

  if (!permissions.canAccessIntegrationQueue) {
    return (
      <div className="dashboard-page-stack">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Integration queue access is restricted</h2>
              <span className="card-subtitle">This operational panel is limited to admin roles.</span>
            </div>
          </div>
          <div className="panel-state panel-state-empty">
            <p>Your current role is <strong>{effectiveRole}</strong>, so retry, replay, and recovery controls stay hidden.</p>
            <span className="panel-state-caption">
              Use the overview and alerts pages for read-only reporting, or sign in with an admin account for queue operations.
            </span>
            <Link to="/dashboard" className="panel-action">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page-stack dashboard-page-stack--workspace">
      <IntegrationEventsPanel />
    </div>
  );
}
