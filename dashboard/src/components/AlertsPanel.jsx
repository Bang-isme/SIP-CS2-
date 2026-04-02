import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  FiAlertTriangle,
  FiBell,
  FiCalendar,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiGift,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { createPortal } from 'react-dom';
import api, { acknowledgeAlert as acknowledgeAlertRequest } from '../services/api';
import {
  formatBenefitsImpactChip,
  formatBenefitsImpactReason,
} from '../utils/benefitsImpact';
import './AlertsPanel.css';

const ALERT_CONFIG = {
  anniversary: {
    icon: FiCalendar,
    color: '#f59e0b',
    bg: '#fffbeb',
    label: 'Anniversaries',
    severity: 'Low',
    severityRank: 1,
    priorityIcon: FiBell,
    priorityColor: '#64748b',
  },
  vacation: {
    icon: FiAlertTriangle,
    color: '#ef4444',
    bg: '#fef2f2',
    label: 'High Vacation Balance',
    severity: 'High',
    severityRank: 3,
    priorityIcon: FiAlertTriangle,
    priorityColor: '#ef4444',
  },
  benefits_change: {
    icon: FiClipboard,
    color: '#10b981',
    bg: '#ecfdf5',
    label: 'Benefits Payroll Impact',
    severity: 'Medium',
    severityRank: 2,
    priorityIcon: FiAlertTriangle,
    priorityColor: '#f59e0b',
  },
  birthday: {
    icon: FiGift,
    color: '#ec4899',
    bg: '#fdf2f8',
    label: 'Birthday Alert',
    severity: 'Low',
    severityRank: 1,
    priorityIcon: FiBell,
    priorityColor: '#64748b',
  },
};

const extractAlertEmployeesPayload = (payload = {}) => {
  const canonicalMeta = payload?.data?.meta || payload?.meta || {};
  const canonicalEmployees = Array.isArray(payload?.data?.employees)
    ? payload.data.employees
    : Array.isArray(payload?.employees)
      ? payload.employees
      : [];

  return {
    employees: canonicalEmployees,
    total: Number.isFinite(Number(canonicalMeta.total))
      ? Number(canonicalMeta.total)
      : Number(payload?.total || 0),
    totalPages: Number.isFinite(Number(canonicalMeta.totalPages))
      ? Number(canonicalMeta.totalPages)
      : Number(payload?.totalPages || 0),
    message: payload?.message || null,
  };
};

function AlertsPanel({
  alerts,
  canManageAlerts = false,
  onAlertAcknowledged,
  requestedAlertOpen,
  onRequestedAlertHandled,
}) {
  const PREVIEW_LIMIT = 5;
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(50); // Default to 50 for list view
  const [currentPage, setCurrentPage] = useState(1);

  // API-based pagination state
  const [apiEmployees, setApiEmployees] = useState([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [ackNote, setAckNote] = useState('');
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [ackError, setAckError] = useState('');
  const [ackFeedback, setAckFeedback] = useState('');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const modalRef = useRef(null);
  const modalCloseRef = useRef(null);
  const modalTriggerRef = useRef(null);
  const selectedAlertRef = useRef(null);

  const formatDayLabel = (daysUntil) => {
    const value = Number(daysUntil);
    if (!Number.isFinite(value)) return 'Upcoming';
    if (value === 0) return 'Today';
    if (value < 0) return 'Upcoming';
    return `${value} day${value === 1 ? '' : 's'}`;
  };

  const formatBirthdayLabel = (emp) => {
    if (emp?.extraData) {
      const date = new Date(emp.extraData);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    const value = Number(emp?.daysUntil);
    if (!Number.isFinite(value)) return 'This month';
    if (value === 0) return 'Today';
    if (value < 0) return 'This month';
    return `${value} day${value === 1 ? '' : 's'}`;
  };

  const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '--';
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  };

  const formatAckTimestamp = (value) => {
    if (!value) return 'Not acknowledged';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not acknowledged';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAcknowledgedByLabel = (acknowledgement) => {
    const username = acknowledgement?.acknowledgedBy?.username;
    const email = acknowledgement?.acknowledgedBy?.email;
    return username || email || 'Assigned';
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch employees from API when modal is open
  const fetchEmployees = useCallback(async () => {
    if (!selectedAlert) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        ...(debouncedSearch && { search: debouncedSearch })
      };

      // Ensure endpoint exists for all types
      const response = await api.get(`/alerts/${selectedAlert.alert.type}/employees`, { params });
      const data = response.data;

      if (data.success) {
        const normalizedPayload = extractAlertEmployeesPayload(data);
        setApiEmployees(normalizedPayload.employees);
        setApiTotal(normalizedPayload.total);
        setApiTotalPages(normalizedPayload.totalPages);

        if (normalizedPayload.message) {
          // Optional: Handle advisory messages
          // setApiError(data.message); 
        }
      } else {
        setApiError(data.message || 'Failed to fetch employees');
      }
    } catch (error) {
      // Fallback for types that might not have endpoints (safety net)
      setApiError(error.response?.data?.message || "Could not retrieve full list from server.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAlert, currentPage, pageSize, debouncedSearch]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    selectedAlertRef.current = selectedAlert;
  }, [selectedAlert]);

  useEffect(() => {
    if (!selectedAlert?.alert?._id) return;
    const latest = alerts?.find((item) => item?.alert?._id === selectedAlert.alert._id);
    if (latest && latest !== selectedAlertRef.current) {
      setSelectedAlert(latest);
    }
  }, [alerts, selectedAlert?.alert?._id]);

  const openAlertDetail = useCallback((alert, triggerElement = null) => {
    modalTriggerRef.current = triggerElement || document.activeElement;
    setSelectedAlert(alert);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
    setApiEmployees([]);
    setApiTotal(0);
    setApiError(null);
    setAckError('');
    setAckFeedback('');
  }, []);

  const handleViewMore = (alert, triggerElement) => {
    openAlertDetail(alert, triggerElement);
  };

  const closeModal = () => {
    setSelectedAlert(null);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
    setApiEmployees([]);
    setApiTotal(0);
    setApiError(null);
    setAckError('');
    setAckFeedback('');
  };

  useEffect(() => {
    if (selectedAlert) {
      modalCloseRef.current?.focus();
      return;
    }

    if (modalTriggerRef.current && typeof modalTriggerRef.current.focus === 'function') {
      modalTriggerRef.current.focus();
    }
  }, [selectedAlert]);

  useEffect(() => {
    setAckNote(selectedAlertRef.current?.alert?.acknowledgement?.note || '');
    setAckError('');
    setAckFeedback('');
  }, [selectedAlert?.alert?._id]);

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleAcknowledge = async () => {
    if (!selectedAlert?.alert?._id) return;

    setAckSubmitting(true);
    setAckError('');
    setAckFeedback('');

    try {
      const response = await acknowledgeAlertRequest(selectedAlert.alert._id, {
        note: ackNote,
      });
      const acknowledgement = response?.data?.acknowledgement || null;

      if (!acknowledgement) {
        throw new Error('Missing acknowledgement metadata');
      }

      setSelectedAlert((current) => current ? ({
        ...current,
        alert: {
          ...current.alert,
          acknowledgement,
        },
      }) : current);
      setAckFeedback(acknowledgement.needsReview
        ? 'Alert ownership saved, but the queue has changed and needs re-review.'
        : 'Alert ownership saved.');
      if (typeof onAlertAcknowledged === 'function') {
        onAlertAcknowledged(selectedAlert.alert._id, acknowledgement);
      }
    } catch (error) {
      setAckError(error?.response?.data?.message || error?.message || 'Unable to save acknowledgement.');
    } finally {
      setAckSubmitting(false);
    }
  };

  const sortedAlerts = useMemo(() => {
    if (!alerts) return [];
    return [...alerts].sort((a, b) => {
      const aConfig = ALERT_CONFIG[a.alert.type] || {};
      const bConfig = ALERT_CONFIG[b.alert.type] || {};
      const aRank = aConfig.severityRank || 0;
      const bRank = bConfig.severityRank || 0;
      if (bRank !== aRank) return bRank - aRank;
      return (b.count || 0) - (a.count || 0);
    });
  }, [alerts]);

  useEffect(() => {
    if (!requestedAlertOpen?.alertId) return;

    const targetAlert = sortedAlerts.find((item) => item?.alert?._id === requestedAlertOpen.alertId);

    if (targetAlert) {
      openAlertDetail(targetAlert);
    }

    if (typeof onRequestedAlertHandled === 'function') {
      onRequestedAlertHandled(requestedAlertOpen.alertId, Boolean(targetAlert));
    }
  }, [onRequestedAlertHandled, openAlertDetail, requestedAlertOpen, sortedAlerts]);

  const summary = useMemo(() => {
    const totalAffected = sortedAlerts.reduce((sum, item) => sum + (item.count || 0), 0);
    const largestQueue = [...sortedAlerts].sort((a, b) => (b.count || 0) - (a.count || 0))[0] || null;
    const highestPriority = sortedAlerts[0] || null;
    const byCount = [...sortedAlerts]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 3)
      .map((item) => {
        const label = ALERT_CONFIG[item.alert.type]?.label || item.alert.name;
        const count = item.count || 0;
        const share = totalAffected > 0 ? (count / totalAffected) * 100 : 0;
        return { label, count, share };
      });

    return { totalAffected, largestQueue, highestPriority, byCount };
  }, [sortedAlerts]);

  const alertDetailColumnCount = useMemo(() => {
    if (!selectedAlert) return 3;
    if (selectedAlert.alert.type === 'vacation') return 4;
    if (selectedAlert.alert.type === 'anniversary') return 4;
    if (selectedAlert.alert.type === 'birthday') return 4;
    if (selectedAlert.alert.type === 'benefits_change') return 4;
    return 3;
  }, [selectedAlert]);

  const hasOddCount = sortedAlerts.length % 2 === 1;
  const highestPriorityLabel = summary.highestPriority
    ? (ALERT_CONFIG[summary.highestPriority.alert.type]?.label || summary.highestPriority.alert.name)
    : 'N/A';
  const highestPrioritySeverity = summary.highestPriority
    ? (ALERT_CONFIG[summary.highestPriority.alert.type]?.severity || 'Low')
    : null;
  const largestQueueLabel = summary.largestQueue
    ? (ALERT_CONFIG[summary.largestQueue.alert.type]?.label || summary.largestQueue.alert.name)
    : 'N/A';
  const largestQueueCount = summary.largestQueue?.count || 0;
  const currentAcknowledgement = selectedAlert?.alert?.acknowledgement || null;

  if (sortedAlerts.length === 0) {
    return (
      <div className="no-alerts">
        <div className="empty-state-icon"><FiBell size={24} /></div>
        <p>System Clear. No action items.</p>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      <div className="alerts-grid">
        {sortedAlerts.map((alert, index) => {
          const config = ALERT_CONFIG[alert.alert.type] || { icon: FiBell, color: '#64748b', bg: '#f8fafc', severity: 'Low', severityRank: 0, priorityIcon: FiBell, priorityColor: '#64748b' };
          const Icon = config.icon || FiBell;
          const PriorityIcon = config.priorityIcon || FiBell;
          const spanFull = hasOddCount && index === sortedAlerts.length - 1;
          const share = summary.totalAffected > 0 ? (alert.count / summary.totalAffected) * 100 : 0;
          const acknowledgement = alert.alert.acknowledgement;

          return (
            <div
              key={index}
              className={`alert-card${spanFull ? ' span-full' : ''}`}
              style={{ '--accent-color': config.color, '--alert-share': `${Math.max(7, share)}%` }}
            >
              <div className="alert-card-inner">
                <div className="alert-header">
                  <div className="alert-header-content">
                    <div className="alert-header-main">
                      <span className="alert-icon" style={{ color: config.color }} aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <h3 className="alert-name">{config.label || alert.alert.name}</h3>
                      <span className="priority-badge" title={`Severity: ${config.severity}`} style={{ color: config.priorityColor }}>
                        <PriorityIcon size={12} />
                        <span className="priority-text">{config.severity}</span>
                      </span>
                    </div>
                    <div className="alert-header-meta">
                      <span className="alert-meta-text">{share.toFixed(1)}% impact share</span>
                      <span className="alert-impact-track" aria-hidden="true">
                        <span className="alert-impact-fill"></span>
                      </span>
                    </div>
                  </div>
                  <span className="alert-badge">{alert.count}</span>
                </div>

                {acknowledgement && (
                  <div className={`alert-acknowledgement alert-acknowledgement--${acknowledgement.needsReview ? 'stale' : 'current'}`}>
                    <div className="alert-acknowledgement-header">
                      <span className="alert-ack-status">
                        {acknowledgement.needsReview ? 'Needs Re-review' : 'Owned'}
                      </span>
                      <span className="alert-ack-owner">{getAcknowledgedByLabel(acknowledgement)}</span>
                      <span className="alert-ack-time">{formatAckTimestamp(acknowledgement.acknowledgedAt)}</span>
                    </div>
                    {acknowledgement.note && (
                      <p className="alert-ack-note">{acknowledgement.note}</p>
                    )}
                  </div>
                )}

                <div className="alert-body">
                  {/* Safe array access to prevent crash */}
                  {(Array.isArray(alert.matchingEmployees) ? alert.matchingEmployees : []).slice(0, PREVIEW_LIMIT).map((emp, i) => (
                    <div key={i} className="employee-row">
                      <div className="emp-identity">
                        <span className="emp-avatar" aria-hidden="true">{getInitials(emp.name)}</span>
                        <div className="emp-details">
                          <span className="emp-name">{emp.name}</span>
                          <span className="emp-id">{emp.employeeId}</span>
                        </div>
                      </div>
                      {/* Tags logic */}
                      {emp.vacationDays !== undefined && (
                        <span className="emp-tag vacation">{emp.vacationDays} d</span>
                      )}
                      {/* Standard date countdown for Anniversary */}
                      {emp.daysUntil !== undefined && alert.alert.type === 'anniversary' && (
                        <span className="emp-tag date">{formatDayLabel(emp.daysUntil)}</span>
                      )}
                      {/* Birthday: Always show date, fallback to friendly label */}
                      {alert.alert.type === 'birthday' && (
                        <span className="emp-tag date">{formatBirthdayLabel(emp)}</span>
                      )}
                      {(alert.alert.type === 'anniversary') && emp.daysUntil === undefined && (
                        <span className="emp-tag date">Soon</span>
                      )}
                      {/* Benefits change: show extra_data instead of days */}
                      {alert.alert.type === 'benefits_change' && emp.extraData && (
                        <span
                          className="emp-tag benefits"
                          title={formatBenefitsImpactReason(emp.extraData)}
                        >
                          {formatBenefitsImpactChip(emp.extraData)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {alert.count > PREVIEW_LIMIT && (
                  <div className="alert-footer">
                    <button
                      type="button"
                      className="view-more-btn"
                      onClick={(event) => handleViewMore(alert, event.currentTarget)}
                    >
                      View Record ({alert.count})
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="alerts-summary-dock">
        <div className="summary-kpi summary-kpi-impact">
          <span className="summary-label">Total Impacted</span>
          <span className="summary-value summary-value-number">{summary.totalAffected.toLocaleString()}</span>
        </div>
        <div className="summary-kpi summary-kpi-priority">
          <span className="summary-label">Highest Priority</span>
          <span className="summary-value summary-value-text" title={highestPriorityLabel}>{highestPriorityLabel}</span>
          {highestPrioritySeverity && <span className="summary-meta">Severity: {highestPrioritySeverity}</span>}
        </div>
        <div className="summary-kpi summary-kpi-queue">
          <span className="summary-label">Largest Queue</span>
          <span className="summary-value summary-value-text" title={largestQueueLabel}>{largestQueueLabel}</span>
          {summary.largestQueue && <span className="summary-meta">Records: {largestQueueCount.toLocaleString()}</span>}
        </div>
        <div className="summary-bars">
          {summary.byCount.map((item) => (
            <div key={item.label} className="summary-bar-row">
              <span className="bar-label">{item.label}</span>
              <span className="bar-value">{item.count}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(6, item.share)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal with Forced API Pagination */}
      {selectedAlert && createPortal(
        <div className="alert-modal-overlay">
          <div
            className="alert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-modal-title"
            ref={modalRef}
            onKeyDown={handleModalKeyDown}
          >
            <div className="modal-header">
              <h3 className="modal-title" id="alert-modal-title">
                <span className="alert-icon" aria-hidden="true">
                  {(() => {
                    const ModalIcon = ALERT_CONFIG[selectedAlert.alert.type]?.icon || FiBell;
                    return <ModalIcon size={16} />;
                  })()}
                </span>
                <span>{ALERT_CONFIG[selectedAlert.alert.type]?.label || selectedAlert.alert.name}</span>
              </h3>
              <span className="modal-count">
                {apiTotal} records
              </span>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close alert details" ref={modalCloseRef}><FiX /></button>
            </div>

            <div className="acknowledgement-panel">
              <div className="acknowledgement-summary">
                <div className="acknowledgement-summary-row">
                  <span className={`acknowledgement-status acknowledgement-status--${currentAcknowledgement?.needsReview ? 'stale' : currentAcknowledgement ? 'current' : 'empty'}`}>
                    {currentAcknowledgement
                      ? currentAcknowledgement.needsReview
                        ? 'Needs Re-review'
                        : 'Acknowledged'
                      : 'Unassigned'}
                  </span>
                  {currentAcknowledgement && (
                    <>
                      <span className="acknowledgement-owner">{getAcknowledgedByLabel(currentAcknowledgement)}</span>
                      <span className="acknowledgement-time">{formatAckTimestamp(currentAcknowledgement.acknowledgedAt)}</span>
                    </>
                  )}
                </div>
                <p className="acknowledgement-caption">
                  {currentAcknowledgement?.note
                    ? currentAcknowledgement.note
                    : 'No acknowledgement note has been recorded for this alert yet.'}
                </p>
              </div>

              {canManageAlerts && (
                <div className="acknowledgement-form">
                  <label className="sr-only" htmlFor="alert-acknowledgement-note">Acknowledgement note</label>
                  <textarea
                    id="alert-acknowledgement-note"
                    className="acknowledgement-textarea"
                    value={ackNote}
                    onChange={(event) => setAckNote(event.target.value)}
                    placeholder="Assign owner / next step / payroll follow-up..."
                    maxLength={280}
                  />
                  <div className="acknowledgement-actions">
                    <span className="acknowledgement-hint">Capture owner and next step for demo evidence.</span>
                    <button
                      type="button"
                      className="acknowledgement-button"
                      onClick={() => { void handleAcknowledge(); }}
                      disabled={ackSubmitting}
                    >
                      {ackSubmitting ? 'Saving...' : currentAcknowledgement ? 'Update Acknowledgement' : 'Acknowledge Alert'}
                    </button>
                  </div>
                  {(ackError || ackFeedback) && (
                    <div
                      className={`acknowledgement-feedback acknowledgement-feedback--${ackError ? 'error' : 'success'}`}
                      role={ackError ? 'alert' : 'status'}
                    >
                      {ackError || ackFeedback}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="modal-controls">
              <div className="search-box">
                <label className="sr-only" htmlFor="alerts-modal-search">Search employees</label>
                <span className="search-icon"><FiSearch size={14} /></span>
                <input
                  id="alerts-modal-search"
                  type="text"
                  placeholder="ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search employees by id or name"
                />
                {searchTerm && (
                  <button type="button" className="clear-search" onClick={() => setSearchTerm('')} aria-label="Clear search"><FiX size={12} /></button>
                )}
              </div>
              <div className="page-size-control">
                <label className="sr-only" htmlFor="alerts-modal-page-size">Rows per page</label>
                <select id="alerts-modal-page-size" value={pageSize} onChange={handlePageSizeChange} aria-label="Rows per page">
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            {/* Error Notice */}
            {apiError && !isLoading && (
              <div className="api-notice" role="status" aria-live="polite">
                <span>{apiError}</span>
              </div>
            )}

            <div className="modal-body custom-scrollbar">
              {isLoading ? (
                <div className="modal-loading">
                  <div className="spinner"></div>
                  <p>Retrieving records...</p>
                </div>
              ) : (
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee</th>
                      <th>ID</th>
                      {selectedAlert.alert.type === 'vacation' && <th>Balance</th>}
                      {(selectedAlert.alert.type === 'anniversary') && <th>Days Left</th>}
                      {(selectedAlert.alert.type === 'birthday') && <th>Date</th>}
                      {(selectedAlert.alert.type === 'benefits_change') && <th>Payroll Impact</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {apiEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={alertDetailColumnCount} className="no-results">
                          {searchTerm ? `No matches for "${searchTerm}"` : 'No records found.'}
                        </td>
                      </tr>
                    ) : (
                      apiEmployees.map((emp, i) => (
                        <tr key={i}>
                          <td>{(currentPage - 1) * pageSize + i + 1}</td>
                          <td className="font-medium">{emp.name}</td>
                          <td className="text-mono">{emp.employeeId}</td>

                          {selectedAlert.alert.type === 'vacation' && (
                            <td><span className="emp-tag vacation">{emp.vacationDays} days</span></td>
                          )}

                          {(selectedAlert.alert.type === 'anniversary') && (
                            <td><span className="emp-tag date">{formatDayLabel(emp.daysUntil)}</span></td>
                          )}
                          {(selectedAlert.alert.type === 'birthday') && (
                            <td><span className="emp-tag date">{formatBirthdayLabel(emp)}</span></td>
                          )}
                          {(selectedAlert.alert.type === 'benefits_change') && (
                            <td>
                              <div className="benefits-impact-cell">
                                <span className="benefits-impact-main">{formatBenefitsImpactReason(emp.extraData)}</span>
                                <span className="benefits-impact-meta">{formatBenefitsImpactChip(emp.extraData)}</span>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="modal-pagination">
              <div className="pagination-info">
                {apiTotal > 0 ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, apiTotal)} of ${apiTotal}` : 'No data'}
              </div>
              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(1)}
                  className="page-btn"
                >
                  <FiChevronsLeft />
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="page-btn"
                >
                  <FiChevronLeft />
                </button>

                {/* Jump to Page Input */}
                <div className="page-jump">
                  <span>Page</span>
                  <label className="sr-only" htmlFor="alerts-modal-page-jump">Jump to page</label>
                  <input
                    id="alerts-modal-page-jump"
                    type="number"
                    min="1"
                    max={apiTotalPages || 1}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= apiTotalPages) {
                        setCurrentPage(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= apiTotalPages) {
                          setCurrentPage(val);
                        }
                      }
                    }}
                    className="page-input"
                    disabled={isLoading}
                    aria-label="Jump to page"
                  />
                  <span>/ {apiTotalPages || 1}</span>
                </div>

                <button
                  type="button"
                  disabled={currentPage >= apiTotalPages || isLoading}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="page-btn"
                >
                  <FiChevronRight />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= apiTotalPages || isLoading}
                  onClick={() => setCurrentPage(apiTotalPages)}
                  className="page-btn"
                >
                  <FiChevronsRight />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AlertsPanel;
