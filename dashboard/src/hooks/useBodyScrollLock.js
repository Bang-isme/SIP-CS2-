import { useEffect } from 'react';

export default function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;

    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
}
