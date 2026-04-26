import { Link } from 'react-router-dom';
import AdminEmployeesModal from '../components/AdminEmployeesModal';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardContext } from '../contexts/DashboardDataContext';

export default function AdminEmployeesPage() {
  const { effectiveRole, permissions } = useAuth();
  const dashboardData = useDashboardContext();

  if (!permissions.canManageEmployees) {
    return (
      <div className="dashboard-page-stack">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Employee administration is restricted</h2>
              <span className="card-subtitle">This workspace only exposes source-record mutation to authorized administrators.</span>
            </div>
          </div>
          <div className="panel-state panel-state-empty">
            <p>Your current role is <strong>{effectiveRole}</strong>, so employee source editing stays unavailable.</p>
            <span className="panel-state-caption">
              Use the review pages for reporting access, or sign in with a super-admin account to manage source records.
            </span>
            <Link to="/dashboard" className="panel-action">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const handleMutationComplete = async () => {
    if (dashboardData.loadAllData) {
      await dashboardData.loadAllData({ forceOperationalReadiness: true });
      return;
    }

    await Promise.allSettled([
      dashboardData.fetchExecutiveSnapshot?.(),
      dashboardData.fetchAlerts?.(),
      dashboardData.fetchEarnings?.(),
      dashboardData.fetchVacation?.(),
      dashboardData.fetchBenefits?.(),
      dashboardData.fetchOperationalReadiness?.(undefined, { forceRefresh: true }),
    ]);
  };

  return (
    <div className="dashboard-page-stack dashboard-page-stack--workspace">
      <AdminEmployeesModal
        variant="page"
        allowMutations={permissions.canManageEmployees}
        onMutationComplete={handleMutationComplete}
      />
    </div>
  );
}
