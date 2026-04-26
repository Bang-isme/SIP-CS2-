import { describe, expect, it, vi } from 'vitest';
import {
  CHUNK_RECOVERY_KEY,
  installChunkRecovery,
  isRecoverableChunkError,
} from './chunkRecovery';

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((key, nextValue) => {
      if (key === CHUNK_RECOVERY_KEY) value = nextValue;
    }),
    removeItem: vi.fn((key) => {
      if (key === CHUNK_RECOVERY_KEY) value = null;
    }),
  };
}

describe('chunkRecovery', () => {
  it('recognizes stale lazy-load errors that should trigger recovery', () => {
    expect(isRecoverableChunkError(new Error('Unable to preload CSS for /assets/AdminEmployeesPage-old.css'))).toBe(true);
    expect(isRecoverableChunkError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isRecoverableChunkError(new Error('Plain validation error'))).toBe(false);
  });

  it('reloads once when Vite preload emits a stale chunk error', () => {
    const listeners = new Map();
    const addEventListener = vi.fn((type, handler) => {
      listeners.set(type, handler);
    });
    const reload = vi.fn();
    const storage = createStorage();
    const now = vi.fn(() => 1000);

    installChunkRecovery({
      addEventListener,
      reload,
      storage,
      now,
    });

    const preventDefault = vi.fn();
    listeners.get('vite:preloadError')({
      payload: new Error('Unable to preload CSS for /assets/AnalyticsDrilldownPage-old.css'),
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith(CHUNK_RECOVERY_KEY, '1000');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not loop reloads when recovery already happened recently', () => {
    const listeners = new Map();
    const addEventListener = vi.fn((type, handler) => {
      listeners.set(type, handler);
    });
    const reload = vi.fn();
    const storage = createStorage('1000');
    const now = vi.fn(() => 1500);

    installChunkRecovery({
      addEventListener,
      reload,
      storage,
      now,
    });

    const preventDefault = vi.fn();
    listeners.get('vite:preloadError')({
      payload: new Error('Failed to fetch dynamically imported module'),
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
