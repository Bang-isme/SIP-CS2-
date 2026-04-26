import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders grouped administration links for route-level workflows', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar
          currentUser={{ username: 'admin', roles: ['super_admin'] }}
          permissions={{
            canAccessIntegrationQueue: true,
            canManageEmployees: true,
            canManageAlerts: true,
            canManageUsers: true,
          }}
          onLogout={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Administration/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage Employees/i })).toHaveAttribute('href', '/dashboard/admin/employees');
    expect(screen.getByRole('link', { name: /Manage Employees/i })).toHaveClass('sidebar-nav-link--secondary');
    expect(screen.getByRole('link', { name: /Manage Users/i })).toHaveAttribute('href', '/dashboard/admin/users');
    expect(screen.getByRole('link', { name: /Manage Users/i })).toHaveClass('sidebar-nav-link--secondary');
    expect(container.querySelectorAll('.sidebar-nav-section')).toHaveLength(3);
    expect(container.querySelector('.sidebar-nav-stack--secondary')).toBeTruthy();
  });
});
