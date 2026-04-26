import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiRefreshCw, FiShield, FiUser, FiX } from 'react-icons/fi';
import { demoteUserFromAdmin, getUsers, promoteUserToAdmin } from '../services/api';
import { getErrorMessage, formatTimestamp } from '../utils/formatters';
import { normalizeRoles, hasAdminRole, hasSuperAdminRole, hasPrivilegedRole } from '../utils/roles';
import { useToast } from '../contexts/ToastContext';
import { useDashboardPageChrome } from '../contexts/PageChromeContext';
import './AdminUsersModal.css';

const ROOT_ADMIN_EMAIL = (import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@localhost').toLowerCase();

function AdminUsersModal({ onClose, currentUser, variant = 'modal' }) {
  const { notifyError, notifySuccess } = useToast();
  const { setPageRefreshConfig } = useDashboardPageChrome();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionUserId, setActionUserId] = useState('');

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const isModal = variant === 'modal';
  const pageModeTitle = isModal ? 'User Access Management' : 'Workspace access';
  const pageModeDescription = isModal
    ? 'Review accounts and adjust admin access for this workspace.'
    : 'Review accounts, privileged roles, and promotion access from one workspace surface.';

  const actorUserId = currentUser?._id || '';
  const canManage = hasSuperAdminRole(currentUser?.roles || []);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await getUsers();
      setUsers(Array.isArray(response?.data) ? response.data : []);
    } catch (fetchError) {
      setUsers([]);
      const message = getErrorMessage(fetchError, 'Unable to load users');
      setError(message);
      notifyError('User list unavailable', message);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [notifyError]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (isModal) {
      return undefined;
    }

    setPageRefreshConfig({
      label: 'Refresh users',
      refreshing: loading || refreshing,
      onRefresh: () => loadUsers({ silent: true }),
    });

    return () => {
      setPageRefreshConfig(null);
    };
  }, [isModal, loadUsers, loading, refreshing, setPageRefreshConfig]);

  useEffect(() => {
    if (!isModal) {
      return undefined;
    }
    lastFocusedElementRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    return () => {
      if (
        lastFocusedElementRef.current
        && typeof lastFocusedElementRef.current.focus === 'function'
      ) {
        lastFocusedElementRef.current.focus();
      }
    };
  }, [isModal]);

  const adminCount = useMemo(
    () => users.filter((user) => hasPrivilegedRole(user.roles)).length,
    [users],
  );

  const applyUpdatedUser = (updatedUser) => {
    setUsers((prevUsers) => prevUsers.map((item) => (
      item._id === updatedUser._id
        ? { ...item, ...updatedUser, roles: updatedUser.roles || item.roles }
        : item
    )));
  };

  const handlePromote = async (user) => {
    const userId = user?._id;
    if (!userId || hasAdminRole(user.roles)) return;

    setActionUserId(userId);
    setError('');
    setSuccessMessage('');

    try {
      const response = await promoteUserToAdmin(userId);
      const updatedUser = response?.data;
      if (!updatedUser?._id) {
        throw new Error('Invalid promote response');
      }

      applyUpdatedUser(updatedUser);
      const message = `Promoted ${updatedUser.username || updatedUser.email} to admin.`;
      setSuccessMessage(message);
      notifySuccess('User promoted', message);
    } catch (promoteError) {
      const message = getErrorMessage(promoteError, 'Unable to promote this user');
      setError(message);
      notifyError('Promotion failed', message);
    } finally {
      setActionUserId('');
    }
  };

  const handleDemote = async (user) => {
    const userId = user?._id;
    if (!userId || !hasAdminRole(user.roles)) return;

    setActionUserId(userId);
    setError('');
    setSuccessMessage('');

    try {
      const response = await demoteUserFromAdmin(userId);
      const updatedUser = response?.data;
      if (!updatedUser?._id) {
        throw new Error('Invalid demote response');
      }

      applyUpdatedUser(updatedUser);
      const message = `Demoted ${updatedUser.username || updatedUser.email} to user.`;
      setSuccessMessage(message);
      notifySuccess('User demoted', message);
    } catch (demoteError) {
      const message = getErrorMessage(demoteError, 'Unable to demote this user');
      setError(message);
      notifyError('Demotion failed', message);
    } finally {
      setActionUserId('');
    }
  };

  const handleOverlayMouseDown = (event) => {
    if (isModal && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleModalKeyDown = (event) => {
    if (!isModal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const content = (
      <div
        className={`admin-modal-card${isModal ? '' : ' admin-modal-card--page'}`}
        role={isModal ? 'dialog' : 'region'}
        aria-modal={isModal ? 'true' : undefined}
        aria-labelledby="admin-users-modal-title"
        ref={modalRef}
        onKeyDown={handleModalKeyDown}
      >
        <div className="admin-modal-header">
          <div>
            <h2 id="admin-users-modal-title">{pageModeTitle}</h2>
            <p>{pageModeDescription}</p>
          </div>
          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => {
                void loadUsers({ silent: true });
              }}
              disabled={refreshing || loading}
            >
              <FiRefreshCw size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {isModal && (
              <button
                type="button"
                className="admin-close-btn"
                onClick={() => onClose?.()}
                aria-label="Close user management modal"
                ref={closeButtonRef}
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="admin-modal-summary">
          <span>
            <FiUser size={14} />
            Total users: <strong>{users.length}</strong>
          </span>
          <span>
            <FiShield size={14} />
            Admin accounts: <strong>{adminCount}</strong>
          </span>
        </div>

        {(error || successMessage) && (
          <div className={`admin-inline-message ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>
            <span>{error || successMessage}</span>
          </div>
        )}

        <div className="admin-users-table-wrap">
          {loading ? (
            <div className="admin-state admin-state-loading">
              <FiRefreshCw size={14} className="spin" />
              <span>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="admin-state admin-state-empty">
              <span>No users found.</span>
            </div>
          ) : (
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userRoles = normalizeRoles(user.roles);
                  const isAdmin = userRoles.includes('admin');
                  const isSuperAdmin = userRoles.includes('super_admin');
                  const isRootAccount = (user.email || '').toLowerCase() === ROOT_ADMIN_EMAIL;
                  const isSelf = Boolean(actorUserId) && actorUserId === user._id;
                  const isActionRunning = actionUserId === user._id;
                  const hasActiveOtherAction = Boolean(actionUserId) && !isActionRunning;

                  let actionLabel = 'Promote to Admin';
                  let actionHandler = () => {
                    void handlePromote(user);
                  };
                  let actionClass = 'admin-promote-btn';
                  let actionDisabled = !canManage;

                  if (isAdmin) {
                    actionLabel = 'Demote to User';
                    actionClass = 'admin-promote-btn danger';
                    actionHandler = () => {
                      void handleDemote(user);
                    };
                  }

                  if (isRootAccount || isSuperAdmin) {
                    actionLabel = 'Protected Root';
                    actionClass = 'admin-promote-btn neutral';
                    actionHandler = undefined;
                    actionDisabled = true;
                  } else if (isSelf) {
                    actionLabel = 'Protected Self';
                    actionClass = 'admin-promote-btn neutral';
                    actionHandler = undefined;
                    actionDisabled = true;
                  }

                  if (isActionRunning) {
                    actionLabel = isAdmin ? 'Demoting...' : 'Promoting...';
                  }

                  return (
                    <tr key={user._id}>
                      <td className="admin-col-username">{user.username || 'N/A'}</td>
                      <td className="admin-col-email">{user.email || 'N/A'}</td>
                      <td>
                        <div className="admin-role-chips">
                          {userRoles.length === 0 ? (
                            <span className="admin-role-chip neutral">none</span>
                          ) : (
                            userRoles.map((roleName) => (
                              <span
                                key={`${user._id}-${roleName}`}
                                className={`admin-role-chip ${roleName === 'super_admin' ? 'super-admin' : roleName === 'admin' ? 'admin' : 'user'}`}
                              >
                                {roleName}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="admin-col-updated">{formatTimestamp(user.updatedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className={actionClass}
                          onClick={actionHandler}
                          disabled={actionDisabled || isActionRunning || hasActiveOtherAction}
                        >
                          {actionLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
  );

  if (!isModal) {
    return <div className="admin-page-shell">{content}</div>;
  }

  return (
    <div className="admin-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      {content}
    </div>
  );
}

export default AdminUsersModal;
