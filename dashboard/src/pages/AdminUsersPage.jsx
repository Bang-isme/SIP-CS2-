import { Link } from 'react-router-dom';
import AdminUsersModal from '../components/AdminUsersModal';
import { useAuth } from '../contexts/AuthContext';

export default function AdminUsersPage() {
  const { currentUser, effectiveRole, permissions } = useAuth();

  if (!permissions.canManageUsers) {
    return (
      <div className="dashboard-page-stack">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>User access management is restricted</h2>
              <span className="card-subtitle">Workspace role changes stay behind super-admin authority.</span>
            </div>
          </div>
          <div className="panel-state panel-state-empty">
            <p>Your current role is <strong>{effectiveRole}</strong>, so account promotion and demotion controls stay hidden.</p>
            <span className="panel-state-caption">
              Return to the dashboard for read-only access, or use a super-admin account to manage workspace roles.
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
      <AdminUsersModal
        variant="page"
        currentUser={currentUser}
      />
    </div>
  );
}
