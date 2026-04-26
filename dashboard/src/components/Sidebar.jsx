import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiBell,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiLogOut,
  FiTool,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { getEffectiveRole } from '../utils/roles';
import './Sidebar.css';

const navClassName = (variant = 'primary') => ({ isActive }) =>
  `sidebar-nav-link${variant === 'secondary' ? ' sidebar-nav-link--secondary' : ''}${isActive ? ' sidebar-nav-link--active' : ''}`;
const prefetchAnalytics = () => { void import('../pages/AnalyticsPage'); };
const prefetchAlerts = () => { void import('../pages/AlertsPage'); };
const prefetchIntegration = () => { void import('../pages/IntegrationPage'); };

function Sidebar({
  mobileOpen = false,
  onClose,
  currentUser,
  permissions,
  onLogout,
  collapsed = false,
  onCollapsedChange,
}) {
  const effectiveRole = getEffectiveRole(currentUser?.roles);
  const userLabel = currentUser?.username || currentUser?.email || 'Signed in user';
  const userInitial = (userLabel || '?').trim().charAt(0).toUpperCase() || '?';

  const handleNavigate = () => {
    if (typeof onClose === 'function') onClose();
  };

  const handleLogout = async () => {
    await onLogout?.();
    if (typeof onClose === 'function') onClose();
  };

  const handleCollapseToggle = () => {
    onCollapsedChange?.(!collapsed);
  };

  return (
    <>
      <aside
        className={`dashboard-sidebar ${mobileOpen ? 'dashboard-sidebar--open' : ''}${collapsed ? ' dashboard-sidebar--collapsed' : ''}`}
        aria-label="Dashboard navigation"
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">SIP</div>
          <div className="sidebar-brand-copy">
            <span className="sidebar-brand-title">People Ops Workspace</span>
            <span className="sidebar-brand-subtitle">Operations console</span>
          </div>
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <FiX size={16} />
          </button>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={handleCollapseToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronRight size={15} /> : <FiChevronLeft size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <section className="sidebar-nav-section" aria-labelledby="sidebar-section-review">
            <p className="sidebar-section-label" id="sidebar-section-review">Review</p>
            <div className="sidebar-nav-stack">
              <NavLink end to="/dashboard" className={navClassName()} onClick={handleNavigate} title="Overview">
                <FiHome size={15} />
                <span>Overview</span>
              </NavLink>
              <NavLink
                to="/dashboard/analytics"
                className={navClassName()}
                onClick={handleNavigate}
                onMouseEnter={prefetchAnalytics}
                onFocus={prefetchAnalytics}
                title="Analytics"
              >
                <FiBarChart2 size={15} />
                <span>Analytics</span>
              </NavLink>
              <NavLink
                to="/dashboard/alerts"
                className={navClassName()}
                onClick={handleNavigate}
                onMouseEnter={prefetchAlerts}
                onFocus={prefetchAlerts}
                title="Alerts"
              >
                <FiBell size={15} />
                <span>Alerts</span>
              </NavLink>
            </div>
          </section>

          {permissions?.canAccessIntegrationQueue && (
            <>
              <div className="sidebar-divider" />
              <section className="sidebar-nav-section" aria-labelledby="sidebar-section-operations">
                <p className="sidebar-section-label" id="sidebar-section-operations">Operations</p>
                <div className="sidebar-nav-stack">
                  <NavLink
                    to="/dashboard/integration"
                    className={navClassName()}
                    onClick={handleNavigate}
                    onMouseEnter={prefetchIntegration}
                    onFocus={prefetchIntegration}
                    title="Operations"
                  >
                    <FiTool size={15} />
                    <span>Operations</span>
                  </NavLink>
                </div>
              </section>
            </>
          )}

          {(permissions?.canManageEmployees || permissions?.canManageUsers) && (
            <>
              <div className="sidebar-divider" />
              <section className="sidebar-nav-section" aria-labelledby="sidebar-section-administration">
                <p className="sidebar-section-label" id="sidebar-section-administration">Administration</p>
                <div className="sidebar-nav-stack sidebar-nav-stack--secondary">
                  {permissions.canManageEmployees && (
                    <NavLink
                      to="/dashboard/admin/employees"
                      className={navClassName('secondary')}
                      onClick={handleNavigate}
                      title="Manage Employees"
                    >
                      <FiUserPlus size={15} />
                      <span>Manage Employees</span>
                    </NavLink>
                  )}
                  {permissions.canManageUsers && (
                    <NavLink
                      to="/dashboard/admin/users"
                      className={navClassName('secondary')}
                      onClick={handleNavigate}
                      title="Manage Users"
                    >
                      <FiUsers size={15} />
                      <span>Manage Users</span>
                    </NavLink>
                  )}
                </div>
              </section>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="sidebar-user-copy">
              <strong title={userLabel}>{userLabel}</strong>
              <span className="sidebar-user-role">
                <FiUser size={12} />
                {effectiveRole}
              </span>
            </div>
          </div>

          <button type="button" className="sidebar-logout-btn" onClick={handleLogout} title="Sign Out">
            <FiLogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="Close dashboard navigation" onClick={onClose} />}
    </>
  );
}

export default Sidebar;
