import { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../services/api';
import './AlertsPanel.css';

function AlertsPanel({ alerts }) {
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

  // Always use API pagination to ensure full data access
  const [useApiPagination, setUseApiPagination] = useState(true);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const alertConfig = {
    anniversary: { icon: '🎂', color: '#f59e0b', bg: '#fffbeb', label: 'Hiring Anniversary' },
    vacation: { icon: '🏖️', color: '#3b82f6', bg: '#eff6ff', label: 'High Vacation Balance' },
    benefits_change: { icon: '📋', color: '#10b981', bg: '#ecfdf5', label: 'Benefits Update' },
    birthday: { icon: '🎉', color: '#ec4899', bg: '#fdf2f8', label: 'Birthday Alert' },
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
        setApiEmployees(data.employees || []);
        setApiTotal(data.total || 0);
        setApiTotalPages(data.totalPages || 0);

        if (data.message) {
          // Optional: Handle advisory messages
          // setApiError(data.message); 
        }
      } else {
        setApiError(data.message || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching alert employees:', error);
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

  const handleViewMore = (alert) => {
    setSelectedAlert(alert);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
    setApiEmployees([]);
    setApiTotal(0);
    setApiError(null);
    setUseApiPagination(true); // Force API mode
  };

  const closeModal = () => {
    setSelectedAlert(null);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
    setApiEmployees([]);
    setApiTotal(0);
    setApiError(null);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="no-alerts">
        <div className="empty-state-icon">✅</div>
        <p>System Clear. No action items.</p>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      <div className="alerts-grid">
        {alerts.map((alert, index) => {
          const config = alertConfig[alert.alert.type] || { icon: '🔔', color: '#64748b', bg: '#f8fafc' };

          return (
            <div
              key={index}
              className="alert-card"
              style={{ '--accent-color': config.color }}
            >
              <div className="alert-header">
                <div className="alert-title-wrap">
                  <span className="alert-icon">{config.icon}</span>
                  <span className="alert-name">{config.label || alert.alert.name}</span>
                </div>
                <span className="alert-badge">{alert.count}</span>
              </div>

              <div className="alert-body custom-scrollbar">
                {/* Safe array access to prevent crash */}
                {(Array.isArray(alert.matchingEmployees) ? alert.matchingEmployees : []).slice(0, 5).map((emp, i) => (
                  <div key={i} className="employee-row">
                    <div className="emp-details">
                      <span className="emp-name">{emp.name}</span>
                      <span className="emp-id">{emp.employeeId}</span>
                    </div>
                    {/* Tags logic */}
                    {emp.vacationDays !== undefined && (
                      <span className="emp-tag vacation">{emp.vacationDays} d</span>
                    )}
                    {emp.daysUntil !== undefined && alert.alert.type !== 'vacation' && (
                      <span className="emp-tag date">{emp.daysUntil} d</span>
                    )}
                    {(alert.alert.type === 'anniversary' || alert.alert.type === 'birthday') && emp.daysUntil === undefined && (
                      <span className="emp-tag date">Soon</span>
                    )}
                  </div>
                ))}
              </div>

              {alert.count > 5 && (
                <div className="alert-footer">
                  <button
                    className="view-more-btn"
                    onClick={() => handleViewMore(alert)}
                  >
                    View Record ({alert.count})
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal with Forced API Pagination */}
      {selectedAlert && (
        <div className="alert-modal-overlay" onClick={closeModal}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="alert-icon">
                  {alertConfig[selectedAlert.alert.type]?.icon || '🔔'}
                </span>
                <h3>{alertConfig[selectedAlert.alert.type]?.label || selectedAlert.alert.name}</h3>
              </div>
              <span className="modal-count">
                {apiTotal} records
              </span>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {/* Controls */}
            <div className="modal-controls">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
                )}
              </div>
              <div className="page-size-control">
                <select value={pageSize} onChange={handlePageSizeChange}>
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            {/* Error Notice */}
            {apiError && !isLoading && (
              <div className="api-notice">
                <span>⚠️ {apiError}</span>
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
                      {(selectedAlert.alert.type === 'anniversary' || selectedAlert.alert.type === 'birthday') && <th>Days Left</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {apiEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-results">
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

                          {(selectedAlert.alert.type === 'anniversary' || selectedAlert.alert.type === 'birthday') && (
                            <td><span className="emp-tag date">{emp.daysUntil ?? 'Upcoming'}</span></td>
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
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(1)}
                  className="page-btn"
                >
                  ⟪
                </button>
                <button
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="page-btn"
                >
                  ←
                </button>

                {/* Jump to Page Input */}
                <div className="page-jump">
                  <span>Page</span>
                  <input
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
                  />
                  <span>/ {apiTotalPages || 1}</span>
                </div>

                <button
                  disabled={currentPage >= apiTotalPages || isLoading}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="page-btn"
                >
                  →
                </button>
                <button
                  disabled={currentPage >= apiTotalPages || isLoading}
                  onClick={() => setCurrentPage(apiTotalPages)}
                  className="page-btn"
                >
                  ⟫
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPanel;
