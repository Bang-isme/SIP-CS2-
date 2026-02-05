import { useState, useMemo, useEffect, useCallback } from 'react';
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
   label: 'Benefits Update',
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
    <div className="empty-state-icon"><FiBell size={24} /></div>
    <p>System Clear. No action items.</p>
   </div>
  );
 }

 const sortedAlerts = useMemo(() => {
  if (!alerts) return [];
  return [...alerts].sort((a, b) => {
   const aConfig = alertConfig[a.alert.type] || {};
   const bConfig = alertConfig[b.alert.type] || {};
   const aRank = aConfig.severityRank || 0;
   const bRank = bConfig.severityRank || 0;
   if (bRank !== aRank) return bRank - aRank;
   return (b.count || 0) - (a.count || 0);
  });
 }, [alerts]);

 const summary = useMemo(() => {
  const totalAffected = sortedAlerts.reduce((sum, item) => sum + (item.count || 0), 0);
  const largestQueue = [...sortedAlerts].sort((a, b) => (b.count || 0) - (a.count || 0))[0] || null;
  const highestPriority = sortedAlerts[0] || null;
  const byCount = [...sortedAlerts]
   .sort((a, b) => (b.count || 0) - (a.count || 0))
   .slice(0, 3)
   .map((item) => {
    const label = alertConfig[item.alert.type]?.label || item.alert.name;
    const count = item.count || 0;
    const share = totalAffected > 0 ? (count / totalAffected) * 100 : 0;
    return { label, count, share };
   });

  return { totalAffected, largestQueue, highestPriority, byCount };
 }, [sortedAlerts]);

 const hasOddCount = sortedAlerts.length % 2 === 1;
 const highestPriorityLabel = summary.highestPriority
  ? (alertConfig[summary.highestPriority.alert.type]?.label || summary.highestPriority.alert.name)
  : 'N/A';
 const highestPrioritySeverity = summary.highestPriority
  ? (alertConfig[summary.highestPriority.alert.type]?.severity || 'Low')
  : null;
 const largestQueueLabel = summary.largestQueue
  ? (alertConfig[summary.largestQueue.alert.type]?.label || summary.largestQueue.alert.name)
  : 'N/A';
 const largestQueueCount = summary.largestQueue?.count || 0;

  return (
   <div className="alerts-container">
   <div className="alerts-grid">
   {sortedAlerts.map((alert, index) => {
     const config = alertConfig[alert.alert.type] || { icon: FiBell, color: '#64748b', bg: '#f8fafc', severity: 'Low', severityRank: 0, priorityIcon: FiBell, priorityColor: '#64748b' };
     const Icon = config.icon || FiBell;
     const PriorityIcon = config.priorityIcon || FiBell;
     const spanFull = hasOddCount && index === sortedAlerts.length - 1;

     return (
      <div
       key={index}
       className={`alert-card${spanFull ? ' span-full' : ''}`}
       style={{ '--accent-color': config.color }}
      >
       <div className="alert-header">
        <div className="alert-title-wrap">
         <span className="alert-icon" style={{ color: config.color }}>
          <Icon size={16} />
         </span>
         <span className="alert-name">{config.label || alert.alert.name}</span>
         <span className="priority-badge" title={`Severity: ${config.severity}`} style={{ color: config.priorityColor }}>
          <PriorityIcon size={12} />
          <span className="priority-text">{config.severity}</span>
         </span>
        </div>
        <span className="alert-badge">{alert.count}</span>
       </div>

       <div className="alert-body">
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
           <span className="emp-tag benefits">{emp.extraData}</span>
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
   {selectedAlert && (
    <div className="alert-modal-overlay" onClick={closeModal}>
     <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
       <div className="modal-title">
        <span className="alert-icon">
         {(() => {
          const ModalIcon = alertConfig[selectedAlert.alert.type]?.icon || FiBell;
          return <ModalIcon size={16} />;
         })()}
        </span>
        <h3>{alertConfig[selectedAlert.alert.type]?.label || selectedAlert.alert.name}</h3>
       </div>
       <span className="modal-count">
        {apiTotal} records
       </span>
       <button className="modal-close" onClick={closeModal}><FiX /></button>
      </div>

      {/* Controls */}
      <div className="modal-controls">
       <div className="search-box">
        <span className="search-icon"><FiSearch size={14} /></span>
        <input
         type="text"
         placeholder="ID or Name..."
         value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
         <button className="clear-search" onClick={() => setSearchTerm('')}><FiX size={12} /></button>
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

             {(selectedAlert.alert.type === 'anniversary') && (
              <td><span className="emp-tag date">{formatDayLabel(emp.daysUntil)}</span></td>
             )}
             {(selectedAlert.alert.type === 'birthday') && (
              <td><span className="emp-tag date">{formatBirthdayLabel(emp)}</span></td>
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
         <FiChevronsLeft />
        </button>
        <button
         disabled={currentPage === 1 || isLoading}
         onClick={() => setCurrentPage(p => p - 1)}
         className="page-btn"
        >
         <FiChevronLeft />
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
         <FiChevronRight />
        </button>
        <button
         disabled={currentPage >= apiTotalPages || isLoading}
         onClick={() => setCurrentPage(apiTotalPages)}
         className="page-btn"
        >
         <FiChevronsRight />
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
