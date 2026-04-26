import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthContext from '../contexts/AuthContext';
import IntegrationPage from './IntegrationPage';

vi.mock('../components/IntegrationEventsPanel', () => ({
  default: () => <div data-testid="integration-panel-mock">integration-panel</div>,
}));

describe('IntegrationPage', () => {
  it('shows a permission message to non-operators instead of silently redirecting', () => {
    render(
      <AuthContext.Provider
        value={{
          currentUser: { roles: ['user'] },
          permissions: {
            canAccessIntegrationQueue: false,
            canManageEmployees: false,
            canManageAlerts: false,
            canManageUsers: false,
          },
          effectiveRole: 'user',
          handleLogout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/dashboard/integration']}>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard landing</div>} />
            <Route path="/dashboard/integration" element={<IntegrationPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/Integration queue access is restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/current role is/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('renders the integration panel for privileged users', () => {
    const { container } = render(
      <AuthContext.Provider
        value={{
          currentUser: { roles: ['admin'] },
          permissions: {
            canAccessIntegrationQueue: true,
            canManageEmployees: false,
            canManageAlerts: true,
            canManageUsers: false,
          },
          effectiveRole: 'admin',
          handleLogout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/dashboard/integration']}>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard landing</div>} />
            <Route path="/dashboard/integration" element={<IntegrationPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId('integration-panel-mock')).toBeInTheDocument();
    expect(container.querySelector('.dashboard-page-stack--workspace')).toBeInTheDocument();
  });
});
