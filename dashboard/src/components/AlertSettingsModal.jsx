import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiGift,
  FiRefreshCw,
  FiSave,
  FiSliders,
  FiX,
} from 'react-icons/fi';
import { createAlertConfig, getAlerts, updateAlertConfig } from '../services/api';
import { getErrorMessage, formatTimestamp } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import './AlertSettingsModal.css';

const ALERT_TYPE_META = {
  anniversary: {
    label: 'Hiring Anniversary',
    defaultName: 'Hiring Anniversary Window',
    defaultThreshold: 30,
    thresholdLabel: 'Days Before Anniversary',
    helper: 'Notify leadership when an employee is within N days of their next hiring anniversary.',
    defaultDescription: 'Alert leadership when employees approach their next hiring anniversary.',
    icon: FiCalendar,
    accent: 'anniversary',
    supportsThreshold: true,
  },
  vacation: {
    label: 'High Vacation Balance',
    defaultName: 'High Vacation Balance',
    defaultThreshold: 20,
    thresholdLabel: 'Vacation Days Threshold',
    helper: 'Flag employees whose accumulated vacation balance is above the chosen threshold.',
    defaultDescription: 'Alert leadership when employees exceed the approved vacation balance threshold.',
    icon: FiAlertTriangle,
    accent: 'vacation',
    supportsThreshold: true,
  },
  benefits_change: {
    label: 'Benefits Change Impact',
    defaultName: 'Benefits Change Impact',
    defaultThreshold: 7,
    thresholdLabel: 'Lookback Window (Days)',
    helper: 'Capture recent benefits-plan changes that can impact payroll processing.',
    defaultDescription: 'Alert leadership when a recent benefits-plan update can affect payroll.',
    icon: FiClipboard,
    accent: 'benefits',
    supportsThreshold: true,
  },
  birthday: {
    label: 'Birthdays This Month',
    defaultName: 'Birthdays This Month',
    defaultThreshold: 0,
    helper: 'This rule is month-based. It highlights all employees whose birthday falls in the current month.',
    defaultDescription: 'Alert leadership about employees with birthdays in the current month.',
    icon: FiGift,
    accent: 'birthday',
    supportsThreshold: false,
  },
};

const ALERT_TYPES = Object.keys(ALERT_TYPE_META);

const normalizeDraftThreshold = (value, fallback) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed);
};

const formatCreatedBy = (createdBy) => {
  if (!createdBy) return 'System';
  if (typeof createdBy === 'string') return createdBy;
  return createdBy.username || createdBy.email || 'System';
};

const pickPrimaryAlert = (alerts = []) => {
  if (!Array.isArray(alerts) || alerts.length === 0) return null;
  return [...alerts].sort((left, right) => {
    if (Boolean(left.isActive) !== Boolean(right.isActive)) {
      return left.isActive ? -1 : 1;
    }
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  })[0];
};

const buildDrafts = (alerts = []) => {
  const grouped = alerts.reduce((acc, alert) => {
    if (!acc[alert.type]) acc[alert.type] = [];
    acc[alert.type].push(alert);
    return acc;
  }, {});

  return ALERT_TYPES.reduce((acc, type) => {
    const meta = ALERT_TYPE_META[type];
    const candidates = grouped[type] || [];
    const primary = pickPrimaryAlert(candidates);
    acc[type] = {
      id: primary?._id || '',
      type,
      name: primary?.name || meta.defaultName,
      threshold: primary?.threshold ?? meta.defaultThreshold,
      description: primary?.description || meta.defaultDescription,
      isActive: primary?.isActive ?? true,
      updatedAt: primary?.updatedAt || '',
      createdByLabel: formatCreatedBy(primary?.createdBy),
      duplicateCount: candidates.length,
      exists: Boolean(primary),
    };
    return acc;
  }, {});
};

function AlertSettingsModal({ onClose, onSaveSuccess }) {
  const { notifyError, notifySuccess } = useToast();
  useBodyScrollLock(true);
  const [drafts, setDrafts] = useState(() => buildDrafts());
  const [selectedType, setSelectedType] = useState('anniversary');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingType, setSavingType] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const loadAlerts = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await getAlerts();
      const nextDrafts = buildDrafts(response?.data || []);
      setDrafts(nextDrafts);
      setSelectedType((prev) => (ALERT_TYPES.includes(prev) ? prev : ALERT_TYPES[0]));
    } catch (fetchError) {
      const message = getErrorMessage(fetchError, 'Unable to load alert settings');
      setError(message);
      notifyError('Alert settings unavailable', message);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [notifyError]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    lastFocusedElementRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    return () => {
      if (
        lastFocusedElementRef.current
        && typeof lastFocusedElementRef.current.focus === 'function'
      ) {
        lastFocusedElementRef.current.focus();
      }
    };
  }, []);

  const selectedDraft = drafts[selectedType] || buildDrafts()[selectedType];
  const selectedMeta = ALERT_TYPE_META[selectedType];

  const configuredCount = useMemo(
    () => Object.values(drafts).filter((item) => item.exists).length,
    [drafts],
  );
  const activeCount = useMemo(
    () => Object.values(drafts).filter((item) => item.isActive).length,
    [drafts],
  );

  const handleFieldChange = (type, field, value) => {
    setDrafts((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const draft = drafts[selectedType];
    const meta = ALERT_TYPE_META[selectedType];
    const payload = {
      name: draft.name.trim() || meta.defaultName,
      type: selectedType,
      description: draft.description.trim() || meta.defaultDescription,
      isActive: Boolean(draft.isActive),
      threshold: meta.supportsThreshold
        ? normalizeDraftThreshold(draft.threshold, meta.defaultThreshold)
        : meta.defaultThreshold,
    };

    setSavingType(selectedType);
    setError('');
    setSuccessMessage('');

    try {
      if (draft.id) {
        await updateAlertConfig(draft.id, payload);
      } else {
        await createAlertConfig(payload);
      }
      const message = `${meta.label} saved. Dashboard alert summaries were refreshed.`;
      setSuccessMessage(message);
      notifySuccess('Alert settings saved', message);
      await loadAlerts({ silent: true });
      if (typeof onSaveSuccess === 'function') {
        await onSaveSuccess();
      }
    } catch (saveError) {
      const message = getErrorMessage(saveError, 'Unable to save alert rule');
      setError(message);
      notifyError('Alert settings update failed', message);
    } finally {
      setSavingType('');
    }
  };

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="alert-settings-overlay" onMouseDown={handleOverlayMouseDown}>
      <div
        className="alert-settings-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-settings-title"
        ref={modalRef}
        onKeyDown={handleModalKeyDown}
      >
        <div className="alert-settings-header">
          <div>
            <h2 id="alert-settings-title">Alert Settings</h2>
            <p>Configure executive alert rules. Saving refreshes triggered alert summaries immediately for the current dashboard session.</p>
          </div>
          <div className="alert-settings-header-actions">
            <button
              type="button"
              className="alert-settings-refresh-btn"
              onClick={() => {
                void loadAlerts({ silent: true });
              }}
              disabled={refreshing || loading}
            >
              <FiRefreshCw size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              className="alert-settings-close-btn"
              onClick={onClose}
              aria-label="Close alert settings"
              ref={closeButtonRef}
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="alert-settings-summary">
          <span>
            <FiSliders size={14} />
            Configured rules: <strong>{configuredCount}</strong>
          </span>
          <span>
            <FiBell size={14} />
            Active rules: <strong>{activeCount}</strong>
          </span>
          <span>
            <FiRefreshCw size={14} />
            Saving refreshes alert summaries automatically
          </span>
        </div>

        {(error || successMessage) && (
          <div className={`alert-settings-inline-message ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>
            <span>{error || successMessage}</span>
          </div>
        )}

        <div className="alert-settings-layout">
          <aside className="alert-settings-nav">
            {ALERT_TYPES.map((type) => {
              const draft = drafts[type];
              const meta = ALERT_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  type="button"
                  key={type}
                  className={`alert-settings-nav-item ${selectedType === type ? 'active' : ''} ${meta.accent}`}
                  onClick={() => setSelectedType(type)}
                >
                  <span className="alert-settings-nav-icon">
                    <Icon size={15} />
                  </span>
                  <span className="alert-settings-nav-body">
                    <span className="alert-settings-nav-title">{meta.label}</span>
                    <span className="alert-settings-nav-meta">
                      {draft.exists ? (draft.isActive ? 'Active' : 'Inactive') : 'Not configured'}
                    </span>
                    {meta.supportsThreshold && (
                      <span className="alert-settings-nav-submeta">
                        Threshold: {Number(draft.threshold) || meta.defaultThreshold}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="alert-settings-editor">
            {loading ? (
              <div className="alert-settings-state">
                <FiRefreshCw size={14} className="spin" />
                <span>Loading alert configuration...</span>
              </div>
            ) : (
              <>
                <div className={`alert-settings-editor-head ${selectedMeta.accent}`}>
                  <div>
                    <h3>{selectedMeta.label}</h3>
                    <p>{selectedMeta.helper}</p>
                  </div>
                  <div className="alert-settings-status-block">
                    <span className={`alert-settings-status-pill ${selectedDraft.isActive ? 'active' : 'inactive'}`}>
                      {selectedDraft.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="alert-settings-status-note">
                      Updated: {formatTimestamp(selectedDraft.updatedAt, { fallback: 'Never synced' })}
                    </span>
                    <span className="alert-settings-status-note">
                      Owner: {selectedDraft.createdByLabel}
                    </span>
                    {selectedDraft.duplicateCount > 1 && (
                      <span className="alert-settings-status-note warning">
                        Legacy duplicates detected: {selectedDraft.duplicateCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="alert-settings-form-grid">
                  <label className="alert-settings-field">
                    <span className="alert-settings-field-label" id={`alert-settings-name-label-${selectedType}`}>Display Name</span>
                    <input
                      id={`alert-settings-name-${selectedType}`}
                      aria-labelledby={`alert-settings-name-label-${selectedType}`}
                      type="text"
                      value={selectedDraft.name}
                      onChange={(event) => handleFieldChange(selectedType, 'name', event.target.value)}
                      placeholder={selectedMeta.defaultName}
                    />
                  </label>

                  {selectedMeta.supportsThreshold ? (
                    <label className="alert-settings-field">
                      <span className="alert-settings-field-label" id={`alert-settings-threshold-label-${selectedType}`}>{selectedMeta.thresholdLabel}</span>
                      <input
                        id={`alert-settings-threshold-${selectedType}`}
                        aria-labelledby={`alert-settings-threshold-label-${selectedType}`}
                        type="number"
                        min="0"
                        value={selectedDraft.threshold}
                        onChange={(event) => handleFieldChange(selectedType, 'threshold', event.target.value)}
                      />
                    </label>
                  ) : (
                    <div className="alert-settings-field alert-settings-field-readonly">
                      <span className="alert-settings-field-label">Evaluation Window</span>
                      <div className="alert-settings-readonly-note">Current month only</div>
                    </div>
                  )}

                  <label className="alert-settings-field alert-settings-field-wide">
                    <span className="alert-settings-field-label" id={`alert-settings-description-label-${selectedType}`}>Manager Note</span>
                    <textarea
                      id={`alert-settings-description-${selectedType}`}
                      aria-labelledby={`alert-settings-description-label-${selectedType}`}
                      rows="4"
                      value={selectedDraft.description}
                      onChange={(event) => handleFieldChange(selectedType, 'description', event.target.value)}
                      placeholder={selectedMeta.defaultDescription}
                    />
                  </label>
                </div>

                <div className="alert-settings-toggle-row">
                  <label className="alert-settings-toggle">
                    <input
                      type="checkbox"
                      checked={selectedDraft.isActive}
                      onChange={(event) => handleFieldChange(selectedType, 'isActive', event.target.checked)}
                    />
                    <span>Rule is active and will be included in the next dashboard aggregation run.</span>
                  </label>
                </div>

                <div className="alert-settings-footer">
                  <div className="alert-settings-footnote">
                    Save updates here to refresh executive alert summaries without leaving the dashboard.
                  </div>
                  <button
                    type="button"
                    className="alert-settings-save-btn"
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={Boolean(savingType)}
                  >
                    <FiSave size={14} />
                    {savingType === selectedType
                      ? 'Saving...'
                      : selectedDraft.exists ? 'Save Changes' : 'Create Rule'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default AlertSettingsModal;
