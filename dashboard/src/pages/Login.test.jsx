import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AuthContext from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import Login from './Login';
import { login as loginApi } from '../services/api';

vi.mock('../services/api', () => ({
  login: vi.fn(),
}));

const renderLogin = ({
  authNotice = 'Session expired. Please sign in again.',
  locationState = null,
  pathname = '/login',
  search = '',
} = {}) => {
  const authValue = {
    authenticated: false,
    profileLoading: false,
    currentUser: null,
    authNotice,
    permissions: {
      canAccessIntegrationQueue: false,
      canManageEmployees: false,
      canManageAlerts: false,
      canManageUsers: false,
    },
    effectiveRole: 'user',
    handleLogin: vi.fn(),
    handleLogout: vi.fn(),
    clearNotice: vi.fn(),
  };

  render(
    <ToastProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[{ pathname, search, state: locationState }]}>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    </ToastProvider>,
  );

  return authValue;
};

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('submits manually entered credentials, clears the notice, and triggers auth login', async () => {
    const user = userEvent.setup();
    const authValue = renderLogin();
    loginApi.mockResolvedValue({
      success: true,
      data: {
        _id: 'user-1',
        email: 'admin@localhost',
        roles: ['admin'],
      },
      token: 'jwt-token',
    });

    expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create one/i })).toHaveAttribute('href', '/register');
    expect(screen.queryByText(/Local review account/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/Password/i)).toHaveAttribute('autocomplete', 'current-password');

    await user.type(screen.getByLabelText(/Email Address/i), 'admin@localhost');
    await user.type(screen.getByLabelText(/Password/i), 'admin_dev');

    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledTimes(1);
      expect(authValue.clearNotice).toHaveBeenCalledTimes(1);
      expect(authValue.handleLogin).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: 'jwt-token',
      }));
    });
  });

  it('shows the same failure message inline and in toast form when sign-in fails', async () => {
    const user = userEvent.setup();
    renderLogin({ authNotice: '' });
    loginApi.mockRejectedValue({
      response: {
        data: {
          message: 'Too many sign-in attempts. Try again later.',
        },
      },
    });

    await user.type(screen.getByLabelText(/Email Address/i), 'admin@localhost');
    await user.type(screen.getByLabelText(/Password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Too many sign-in attempts/i)).toHaveLength(2);
    });
  });

  it('auto-submits demo credentials only when demo shortcuts are enabled', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_SHORTCUTS', '1');
    vi.stubEnv('VITE_ENABLE_SELF_SIGNUP', '1');
    loginApi.mockResolvedValue({
      success: true,
      data: {
        _id: 'user-1',
        email: 'admin@localhost',
        roles: ['admin'],
      },
      token: 'jwt-token',
    });
    const authValue = renderLogin({
      authNotice: '',
      pathname: '/login',
      search: '?demoLogin=1',
    });

    expect(screen.getByRole('link', { name: /Create one/i })).toHaveAttribute('href', '/register');
    expect(screen.getByText(/Local review account/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledTimes(1);
      expect(authValue.handleLogin).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: 'jwt-token',
      }));
    });
  });
});
