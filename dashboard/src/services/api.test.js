import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMockClient = () => {
  const client = vi.fn();
  client.get = vi.fn();
  client.post = vi.fn();
  client.put = vi.fn();
  client.delete = vi.fn();
  client.interceptors = {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  };
  return client;
};

let clients = [];
let bareClient;
let saClient;
let dashboardClient;

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => clients.shift()),
  },
}));

describe('api service no-body post contract', () => {
  beforeEach(() => {
    vi.resetModules();
    bareClient = createMockClient();
    saClient = createMockClient();
    dashboardClient = createMockClient();
    clients = [bareClient, saClient, dashboardClient];
  });

  it('restores session with an object body when refreshing the access token', async () => {
    bareClient.get.mockResolvedValue({
      data: {
        data: {
          refreshAvailable: true,
        },
      },
    });
    bareClient.post.mockResolvedValue({
      data: {
        token: 'token-after-refresh',
        data: { id: 'user-1' },
      },
    });

    const { restoreSession } = await import('./api.js');

    await expect(restoreSession()).resolves.toEqual({
      token: 'token-after-refresh',
      data: { id: 'user-1' },
    });

    expect(bareClient.post).toHaveBeenCalledWith('/auth/refresh', {}, expect.objectContaining({
      __skipUnauthorizedHandler: true,
      __skipAuthRefresh: true,
    }));
  });

  it('uses an object body for logout revocation and summary rebuild actions', async () => {
    saClient.post
      .mockResolvedValueOnce({
        data: {
          token: 'signed-in-token',
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
        },
      });
    dashboardClient.post.mockResolvedValue({
      data: {
        success: true,
      },
    });

    const { login, logout, refreshDashboardSummaries } = await import('./api.js');

    await login('admin@localhost', 'admin_dev');
    await logout();
    await refreshDashboardSummaries(2026);

    expect(saClient.post).toHaveBeenNthCalledWith(2, '/auth/logout', {}, expect.objectContaining({
      __skipUnauthorizedHandler: true,
      __skipAuthRefresh: true,
    }));
    expect(dashboardClient.post).toHaveBeenCalledWith('/dashboard/refresh-summaries', {}, expect.objectContaining({
      params: { year: 2026 },
    }));
  });

  it('requests integration audit history through the SA client with compact paging defaults', async () => {
    saClient.get.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    const { getIntegrationEventAudit } = await import('./api.js');

    await getIntegrationEventAudit(17);

    expect(saClient.get).toHaveBeenCalledWith('/integrations/events/17/audit', expect.objectContaining({
      params: { page: 1, limit: 6 },
    }));
  });
});
