import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AdminUsersModal from './AdminUsersModal';
import PageChromeContext from '../contexts/PageChromeContext';
import { getUsers } from '../services/api';

vi.mock('../services/api', () => ({
  getUsers: vi.fn(),
  promoteUserToAdmin: vi.fn(),
  demoteUserFromAdmin: vi.fn(),
}));

describe('AdminUsersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsers.mockResolvedValue({
      data: [
        {
          _id: 'user-1',
          username: 'amy',
          email: 'amy@company.com',
          roles: ['user'],
          updatedAt: '2026-04-18T10:00:00.000Z',
        },
      ],
    });
  });

  it('uses page-level workspace copy when rendered as a route surface', async () => {
    const setPageRefreshConfig = vi.fn();

    render(
      <PageChromeContext.Provider value={{ setPageRefreshConfig }}>
        <AdminUsersModal
          currentUser={{ _id: 'root-1', roles: ['super_admin'], email: 'admin@localhost' }}
          variant="page"
        />
      </PageChromeContext.Provider>,
    );

    expect(await screen.findByText(/Workspace access/i)).toBeInTheDocument();
    expect(screen.getByText(/Review accounts, privileged roles, and promotion access/i)).toBeInTheDocument();
    expect(screen.queryByText(/User Access Management/i)).not.toBeInTheDocument();
    expect(setPageRefreshConfig).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Refresh users',
      refreshing: expect.any(Boolean),
      onRefresh: expect.any(Function),
    }));
  });
});
