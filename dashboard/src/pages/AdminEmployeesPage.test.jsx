import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthContext from '../contexts/AuthContext';
import DashboardDataContext from '../contexts/DashboardDataContext';
import AdminEmployeesPage from './AdminEmployeesPage';

vi.mock('../components/AdminEmployeesModal', () => ({
  default: ({ variant, allowMutations, onMutationComplete }) => (
    <div data-testid="employee-admin-workspace">
      <span>workspace:{variant}:{allowMutations ? 'mutable' : 'readonly'}</span>
      <button type="button" onClick={() => onMutationComplete?.()}>
        Trigger mutation complete
      </button>
    </div>
  ),
}));

const dashboardDataValue = {
  loadAllData: vi.fn().mockResolvedValue(undefined),
  fetchExecutiveSnapshot: vi.fn().mockResolvedValue(undefined),
  fetchAlerts: vi.fn().mockResolvedValue(undefined),
  fetchEarnings: vi.fn().mockResolvedValue(undefined),
  fetchVacation: vi.fn().mockResolvedValue(undefined),
  fetchBenefits: vi.fn().mockResolvedValue(undefined),
  fetchOperationalReadiness: vi.fn().mockResolvedValue(undefined),
};

describe('AdminEmployeesPage', () => {
  it('shows a permission message when the user cannot manage employees', () => {
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
        }}
      >
        <DashboardDataContext.Provider value={dashboardDataValue}>
          <MemoryRouter initialEntries={['/dashboard/admin/employees']}>
            <Routes>
              <Route path="/dashboard" element={<div>Dashboard landing</div>} />
              <Route path="/dashboard/admin/employees" element={<AdminEmployeesPage />} />
            </Routes>
          </MemoryRouter>
        </DashboardDataContext.Provider>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/Employee administration is restricted/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('renders the embedded employee administration workspace for privileged users', () => {
    render(
      <AuthContext.Provider
        value={{
          currentUser: { roles: ['super_admin'] },
          permissions: {
            canAccessIntegrationQueue: true,
            canManageEmployees: true,
            canManageAlerts: true,
            canManageUsers: true,
          },
          effectiveRole: 'super_admin',
        }}
      >
        <DashboardDataContext.Provider value={dashboardDataValue}>
          <MemoryRouter initialEntries={['/dashboard/admin/employees']}>
            <Routes>
              <Route path="/dashboard/admin/employees" element={<AdminEmployeesPage />} />
            </Routes>
          </MemoryRouter>
        </DashboardDataContext.Provider>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId('employee-admin-workspace')).toHaveTextContent('workspace:page:mutable');
    expect(screen.getByTestId('employee-admin-workspace').parentElement).toHaveClass(
      'dashboard-page-stack--workspace',
    );
  });

  it('refreshes the dashboard context with readiness semantics after a source mutation completes', async () => {
    const loadAllData = vi.fn().mockResolvedValue(undefined);

    render(
      <AuthContext.Provider
        value={{
          currentUser: { roles: ['super_admin'] },
          permissions: {
            canAccessIntegrationQueue: true,
            canManageEmployees: true,
            canManageAlerts: true,
            canManageUsers: true,
          },
          effectiveRole: 'super_admin',
        }}
      >
        <DashboardDataContext.Provider
          value={{
            ...dashboardDataValue,
            loadAllData,
          }}
        >
          <MemoryRouter initialEntries={['/dashboard/admin/employees']}>
            <Routes>
              <Route path="/dashboard/admin/employees" element={<AdminEmployeesPage />} />
            </Routes>
          </MemoryRouter>
        </DashboardDataContext.Provider>
      </AuthContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Trigger mutation complete/i }));

    await waitFor(() => {
      expect(loadAllData).toHaveBeenCalledWith({ forceOperationalReadiness: true });
    });
  });
});
