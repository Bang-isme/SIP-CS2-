import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const restoreSessionMock = vi.fn();
const setUnauthorizedHandlerMock = vi.fn();
const logoutMock = vi.fn();
const notifyWarningMock = vi.fn();

vi.mock('../services/api', () => ({
  restoreSession: (...args) => restoreSessionMock(...args),
  setUnauthorizedHandler: (...args) => setUnauthorizedHandlerMock(...args),
  logout: (...args) => logoutMock(...args),
}));

vi.mock('./ToastContext', () => ({
  useToast: () => ({
    notifyWarning: notifyWarningMock,
  }),
}));

function AuthProbe() {
  const { authNotice, sessionStatus, authenticated } = useAuth();

  return (
    <div>
      <span data-testid="auth-notice">{authNotice || 'none'}</span>
      <span data-testid="session-label">{sessionStatus.label}</span>
      <span data-testid="session-tooltip">{sessionStatus.tooltip}</span>
      <span data-testid="auth-flag">{authenticated ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('AuthProvider session restore semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats 404 refresh responses as signed-out state without an unavailable warning', async () => {
    restoreSessionMock.mockRejectedValue({
      response: { status: 404 },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-label')).toHaveTextContent('Signed out');
    });

    expect(screen.getByTestId('auth-notice')).toHaveTextContent('none');
    expect(screen.getByTestId('session-tooltip')).toHaveTextContent('No active workspace session is loaded.');
    expect(screen.getByTestId('auth-flag')).toHaveTextContent('no');
    expect(notifyWarningMock).not.toHaveBeenCalled();
  });

  it('keeps the unavailable warning for temporary restore failures', async () => {
    restoreSessionMock.mockRejectedValue({
      response: { status: 503 },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-label')).toHaveTextContent('Manual sign-in required');
    });

    expect(screen.getByTestId('auth-notice')).toHaveTextContent('Session restore is unavailable right now. Please sign in manually.');
    expect(notifyWarningMock).toHaveBeenCalledWith(
      'Session restore unavailable',
      'Sign in manually to continue.',
    );
  });
});
