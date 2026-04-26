import { describe, expect, it, vi } from 'vitest';
import { createSessionRestorer } from './sessionRestore';

describe('createSessionRestorer', () => {
  it('returns a signed-out payload without calling refresh when no restorable session exists', async () => {
    const probeRefreshAvailability = vi.fn(async () => false);
    const restoreWithRefresh = vi.fn(async () => ({ success: true, data: { id: 'user-1' } }));
    const clearSessionToken = vi.fn();

    const restoreSession = createSessionRestorer({
      probeRefreshAvailability,
      restoreWithRefresh,
      clearSessionToken,
    });

    await expect(restoreSession()).resolves.toEqual({
      success: true,
      data: null,
      meta: {
        refreshAvailable: false,
        sessionMode: 'signed_out',
      },
    });
    expect(probeRefreshAvailability).toHaveBeenCalledTimes(1);
    expect(restoreWithRefresh).not.toHaveBeenCalled();
    expect(clearSessionToken).toHaveBeenCalledTimes(1);
  });

  it('uses refresh token rotation when a restorable session exists', async () => {
    const probeRefreshAvailability = vi.fn(async () => true);
    const restoreWithRefresh = vi.fn(async () => ({ success: true, data: { id: 'user-1' } }));
    const clearSessionToken = vi.fn();

    const restoreSession = createSessionRestorer({
      probeRefreshAvailability,
      restoreWithRefresh,
      clearSessionToken,
    });

    await expect(restoreSession()).resolves.toEqual({
      success: true,
      data: { id: 'user-1' },
    });
    expect(probeRefreshAvailability).toHaveBeenCalledTimes(1);
    expect(restoreWithRefresh).toHaveBeenCalledTimes(1);
    expect(clearSessionToken).not.toHaveBeenCalled();
  });
});
