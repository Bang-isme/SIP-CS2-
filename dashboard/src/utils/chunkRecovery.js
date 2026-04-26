export const CHUNK_RECOVERY_KEY = 'dashboard:chunk-recovery-at';
const RECOVERY_COOLDOWN_MS = 60_000;

const RECOVERABLE_ERROR_PATTERNS = [
  /Unable to preload CSS/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to load module script/i,
  /ChunkLoadError/i,
];

const safeNow = (nowFn) => {
  try {
    return nowFn();
  } catch {
    return Date.now();
  }
};

const readLastRecoveryAttempt = (storage) => {
  try {
    const rawValue = storage?.getItem?.(CHUNK_RECOVERY_KEY);
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeRecoveryAttempt = (storage, value) => {
  try {
    storage?.setItem?.(CHUNK_RECOVERY_KEY, String(value));
  } catch {
    // Ignore storage failures and still allow reload.
  }
};

export function isRecoverableChunkError(error) {
  const message = [
    typeof error === 'string' ? error : '',
    error?.message,
    error?.reason?.message,
    error?.stack,
  ]
    .filter(Boolean)
    .join(' ');

  return RECOVERABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function installChunkRecovery({
  addEventListener = globalThis?.window?.addEventListener?.bind(globalThis.window),
  removeEventListener = globalThis?.window?.removeEventListener?.bind(globalThis.window),
  storage = globalThis?.window?.sessionStorage,
  reload = () => globalThis?.window?.location?.reload?.(),
  now = () => Date.now(),
} = {}) {
  if (!addEventListener) return () => {};

  const handler = (event) => {
    const error = event?.payload ?? event?.reason ?? event?.error ?? event;
    if (!isRecoverableChunkError(error)) return;

    event?.preventDefault?.();

    const attemptedAt = readLastRecoveryAttempt(storage);
    const currentTime = safeNow(now);
    if (attemptedAt && currentTime - attemptedAt < RECOVERY_COOLDOWN_MS) {
      return;
    }

    writeRecoveryAttempt(storage, currentTime);
    reload();
  };

  addEventListener('vite:preloadError', handler);

  return () => {
    removeEventListener?.('vite:preloadError', handler);
  };
}

export default installChunkRecovery;
