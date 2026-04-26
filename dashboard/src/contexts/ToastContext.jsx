/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/ToastViewport';

const noop = () => {};

const ToastContext = createContext({
  pushToast: noop,
  dismissToast: noop,
  notifySuccess: noop,
  notifyError: noop,
  notifyWarning: noop,
  notifyInfo: noop,
});

const DEFAULT_DURATION = 4200;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(0);

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback(({
    tone = 'info',
    title,
    message = '',
    duration = DEFAULT_DURATION,
  }) => {
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) return;

    nextToastId.current += 1;
    const toast = {
      id: `toast-${nextToastId.current}`,
      tone,
      title: normalizedTitle,
      message: message?.trim() || '',
      duration,
    };

    setToasts((current) => [...current.slice(-3), toast]);
  }, []);

  const value = useMemo(() => ({
    pushToast,
    dismissToast,
    notifySuccess: (title, message, duration) => pushToast({ tone: 'success', title, message, duration }),
    notifyError: (title, message, duration) => pushToast({ tone: 'error', title, message, duration }),
    notifyWarning: (title, message, duration) => pushToast({ tone: 'warning', title, message, duration }),
    notifyInfo: (title, message, duration) => pushToast({ tone: 'info', title, message, duration }),
  }), [dismissToast, pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export default ToastContext;
