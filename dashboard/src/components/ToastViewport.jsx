import { useEffect } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';
import './ToastViewport.css';

const TOAST_ICONS = {
  success: FiCheckCircle,
  error: FiAlertTriangle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);

    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.duration, toast.id]);

  const Icon = TOAST_ICONS[toast.tone] || FiInfo;

  return (
    <div
      className={`toast-card toast-card--${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast-card__icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      <div className="toast-card__body">
        <strong>{toast.title}</strong>
        {toast.message && <p>{toast.message}</p>}
      </div>
      <button
        type="button"
        className="toast-card__dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <FiX size={14} />
      </button>
    </div>
  );
}

export default function ToastViewport({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
