import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthContext from '../contexts/AuthContext';
import AdminUsersPage from './AdminUsersPage';

vi.mock('../components/AdminUsersModal', () => ({
  default: ({ variant }) => (
    <div data-testid="user-admin-workspace">workspace:{variant}</div>
  ),
}));

describe('AdminUsersPage', () => {
  it('shows a permission message when the user cannot manage workspace access', () => {
    render(
      <AuthContext.Provider
        value={{
          currentUser: { roles: ['admin'] },
          permissions: {
            canAccessIntegrationQueue: false,
            canManageEmployees: false,
            canManageAlerts: false,
            canManageUsers: false,
          },
          effectiveRole: 'admin',
          handleLogout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/dashboard/admin/users']}>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard landing</div>} />
            <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/User access management is restricted/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('renders the embedded user administration workspace for privileged users', () => {
    const { container } = render(
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
          handleLogout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/dashboard/admin/users']}>
          <Routes>
            <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId('user-admin-workspace')).toHaveTextContent('workspace:page');
    expect(container.querySelector('.dashboard-page-stack--workspace')).toBeInTheDocument();
  });
});
