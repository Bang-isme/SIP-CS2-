/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logout as apiLogout, restoreSession, setUnauthorizedHandler } from '../services/api';
import { getPermissions, getEffectiveRole } from '../utils/roles';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

const shouldWarnOnRestoreFailure = (status) => {
  if (!status) return true;
  return status >= 500;
};

export function AuthProvider({ children }) {
  const { notifyWarning } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [sessionMode, setSessionMode] = useState('restoring');

  const resetAuthState = useCallback((notice = '') => {
    setCurrentUser(null);
    setAuthenticated(false);
    setProfileLoading(false);
    setAuthNotice(notice);
    setSessionMode('signed_out');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetAuthState('Session expired. Please sign in again.');
      notifyWarning('Session expired', 'Please sign in again to continue.');
    });
    return () => setUnauthorizedHandler(null);
  }, [notifyWarning, resetAuthState]);

  useEffect(() => {
    let active = true;
    const bootstrapSession = async () => {
      setProfileLoading(true);
      try {
        const response = await restoreSession();
        if (active) {
          setCurrentUser(response?.data || null);
          setAuthenticated(Boolean(response?.data));
          setAuthNotice('');
          setSessionMode(response?.data ? 'restored' : 'signed_out');
        }
      } catch (error) {
        if (active) {
          const status = error?.response?.status;
          if (shouldWarnOnRestoreFailure(status)) {
            setAuthNotice('Session restore is unavailable right now. Please sign in manually.');
            notifyWarning('Session restore unavailable', 'Sign in manually to continue.');
            setSessionMode('manual-required');
          } else {
            setAuthNotice('');
            setSessionMode('signed_out');
          }
          setCurrentUser(null);
          setAuthenticated(false);
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void bootstrapSession();
    return () => { active = false; };
  }, [notifyWarning]);

  const handleLogin = useCallback((payload = null) => {
    setAuthNotice('');
    setCurrentUser(payload?.data || null);
    setProfileLoading(false);
    setAuthenticated(true);
    setSessionMode('manual');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      resetAuthState('');
    }
  }, [resetAuthState]);

  const clearNotice = useCallback(() => {
    setAuthNotice('');
  }, []);

  const permissions = useMemo(() => getPermissions(currentUser?.roles), [currentUser]);
  const effectiveRole = useMemo(() => getEffectiveRole(currentUser?.roles), [currentUser]);
  const sessionStatus = useMemo(() => {
    if (profileLoading) {
      return {
        label: 'Restoring session',
        css: 'pending',
        tooltip: 'The dashboard is restoring your authenticated session.',
      };
    }

    if (!authenticated) {
      return {
        label: sessionMode === 'manual-required' ? 'Manual sign-in required' : 'Signed out',
        css: sessionMode === 'manual-required' ? 'warning' : 'neutral',
        tooltip: sessionMode === 'manual-required'
          ? 'Session restore is unavailable. Sign in again to continue.'
          : 'No active workspace session is loaded.',
      };
    }

    if (sessionMode === 'restored') {
      return {
        label: 'Session restored',
        css: 'stable',
        tooltip: 'Your workspace session was restored successfully.',
      };
    }

    return {
      label: 'Session active',
      css: 'stable',
      tooltip: 'You are signed in and operating with an active workspace session.',
    };
  }, [authenticated, profileLoading, sessionMode]);

  const value = useMemo(() => ({
    authenticated,
    profileLoading,
    currentUser,
    authNotice,
    permissions,
    effectiveRole,
    sessionStatus,
    handleLogin,
    handleLogout,
    clearNotice,
  }), [
    authenticated,
    profileLoading,
    currentUser,
    authNotice,
    permissions,
    effectiveRole,
    sessionStatus,
    handleLogin,
    handleLogout,
    clearNotice,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
