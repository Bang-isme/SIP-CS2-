import { useState, useEffect, useMemo, useRef } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import { getDrilldown, getDepartments, exportDrilldownCsv } from '../services/api';
import { FiSearch } from 'react-icons/fi';
import './DrilldownModal.css';

function DrilldownModal({ filters: initialFilters, onClose }) {
 const [data, setData] = useState(null);
 const [summaryState, setSummaryState] = useState({ data: null, loading: false, key: '' });
 const [loading, setLoading] = useState(true);
 const [loadError, setLoadError] = useState('');
 const [departmentsError, setDepartmentsError] = useState('');
 const [exportError, setExportError] = useState('');
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [localSearch, setLocalSearch] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [departments, setDepartments] = useState([]);
 const requestIdRef = useRef(0);
 const abortRef = useRef(null);
 const summaryRequestIdRef = useRef(0);
 const summaryAbortRef = useRef(null);
 const containerRef = useRef(null);
 const modalRef = useRef(null);
 const closeButtonRef = useRef(null);
 const lastFocusedElementRef = useRef(null);
 const [containerHeight, setContainerHeight] = useState(420);

 const loadDepartments = async () => {
  setDepartmentsError('');
  try {
   const depts = await getDepartments();
   setDepartments(depts);
  } catch (err) {
   setDepartments([]);
   setDepartmentsError(err?.response?.data?.message || 'Unable to load department filters');
  }
 };

 // Fetch departments on mount
 useEffect(() => {
  void loadDepartments();
 }, []);

 useEffect(() => {
  lastFocusedElementRef.current = document.activeElement;
  closeButtonRef.current?.focus();

  return () => {
   if (lastFocusedElementRef.current && typeof lastFocusedElementRef.current.focus === 'function') {
    lastFocusedElementRef.current.focus();
   }
  };
 }, []);

 // Debounce search input
 useEffect(() => {
  const timer = setTimeout(() => {
   setDebouncedSearch(localSearch);
   setPage(1); // Reset to page 1 on new search
  }, 500);
  return () => clearTimeout(timer);
 }, [localSearch]);

 // Advanced Filters State - Initialize from props to preserve chart clicks
 const [deptFilter, setDeptFilter] = useState(initialFilters?.department || '');
 const [typeFilter, setTypeFilter] = useState(initialFilters?.employmentType || '');
 const [genderFilter, setGenderFilter] = useState(initialFilters?.gender || '');
 const [ethnicityFilter, setEthnicityFilter] = useState(initialFilters?.ethnicity || '');
 const [shareholderFilter, setShareholderFilter] = useState(initialFilters?.isShareholder !== undefined ? String(initialFilters.isShareholder) : '');
 const [benefitPlanFilter, setBenefitPlanFilter] = useState(initialFilters?.benefitPlan || '');
 const [minEarnings, setMinEarnings] = useState(''); // CEO Query: "Employees earning over $X"

 useEffect(() => {
  setDeptFilter(initialFilters?.department || '');
  setTypeFilter(initialFilters?.employmentType || '');
  setGenderFilter(initialFilters?.gender || '');
  setEthnicityFilter(initialFilters?.ethnicity || '');
  setShareholderFilter(initialFilters?.isShareholder !== undefined ? String(initialFilters.isShareholder) : '');
  setBenefitPlanFilter(initialFilters?.benefitPlan || '');
  setPage(1);
 }, [initialFilters]);

 // Combine all filters
 const activeFilters = useMemo(() => ({
  ...initialFilters,
  department: deptFilter || undefined,
  employmentType: typeFilter || undefined,
  gender: genderFilter || undefined,
  ethnicity: ethnicityFilter || undefined,
  isShareholder: shareholderFilter || undefined,
  benefitPlan: benefitPlanFilter || undefined,
  minEarnings: minEarnings || undefined
 }), [initialFilters, deptFilter, typeFilter, genderFilter, ethnicityFilter, shareholderFilter, benefitPlanFilter, minEarnings]);

 const summaryKey = useMemo(() => JSON.stringify({
  ...activeFilters,
  search: debouncedSearch
 }), [activeFilters, debouncedSearch]);

 useEffect(() => {
  loadData();
  // loadData depends on evolving filters/pagination and is intentionally invoked from this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeFilters, page, pageSize, debouncedSearch]);

 useEffect(() => {
  if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver((entries) => {
   const entry = entries[0];
   if (!entry) return;
   const nextHeight = Math.max(entry.contentRect.height, 200);
   setContainerHeight(nextHeight);
  });
  observer.observe(containerRef.current);
  return () => observer.disconnect();
 }, []);

 const loadData = async () => {
  const requestId = ++requestIdRef.current;
  if (abortRef.current) {
   abortRef.current.abort();
  }
  const controller = new AbortController();
  abortRef.current = controller;
  setLoading(true);
  setLoadError('');
  try {
   const isBulk = pageSize >= 1000;
   const response = await getDrilldown({
    ...activeFilters,
    page,
    limit: pageSize,
    search: debouncedSearch,
    bulk: isBulk ? 1 : undefined,
    summary: isBulk ? 'fast' : undefined
   }, { signal: controller.signal });
   if (requestId !== requestIdRef.current) return;
   setData(response);

    // Initialize summary state from fast response
    const incomingSummary = response?.summary || null;
    const shouldLoadBackground = Boolean(incomingSummary?.partial) && (response?.meta?.total || 0) <= 10000;
    const isSameKeyFull = summaryState.key === summaryKey && summaryState.data?.partial === false;
    setSummaryState({
     data: incomingSummary,
     loading: shouldLoadBackground,
     key: summaryKey
    });

    // Background full summary (Hybrid) - only if fast mode and count small
    if (shouldLoadBackground && !isSameKeyFull) {
     const summaryRequestId = ++summaryRequestIdRef.current;
     if (summaryAbortRef.current) summaryAbortRef.current.abort();
     const summaryController = new AbortController();
     summaryAbortRef.current = summaryController;
     try {
      const fullResponse = await getDrilldown({
       ...activeFilters,
       page: 1,
       limit: 1,
       search: debouncedSearch,
       bulk: 1,
       summary: 'full'
      }, { signal: summaryController.signal });
      if (summaryRequestId !== summaryRequestIdRef.current) return;
     setSummaryState({
       data: fullResponse?.summary || incomingSummary,
       loading: false,
       key: summaryKey
      });
     } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      setSummaryState(prev => ({ ...prev, loading: false }));
     }
    }
  } catch (err) {
   if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
   setLoadError(err?.response?.data?.message || 'Unable to load drilldown data');
  } finally {
   if (requestId === requestIdRef.current) {
    setLoading(false);
   }
  }
 };

 const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

 const summaryData = summaryState.data || data?.summary;
 const summaryPartial = summaryData?.partial;
 const summaryLoading = summaryState.loading;
 const renderCurrency = (value) => (summaryLoading || summaryPartial) ? '--' : formatCurrency(value);
 const renderVacation = (value) => (summaryLoading || summaryPartial) ? '--' : `${(value || 0).toLocaleString()} days`;
 const isVirtual = pageSize >= 1000;
 const virtualHeaderHeight = 44;
 const rowHeight = 56;
 const listHeight = Math.max(containerHeight - virtualHeaderHeight, 200);

 const activeFilterChips = useMemo(() => {
  const chips = [];
  if (deptFilter) chips.push({ key: 'dept', label: `Department: ${deptFilter}`, onClear: () => setDeptFilter('') });
  if (typeFilter) chips.push({ key: 'type', label: `Type: ${typeFilter}`, onClear: () => setTypeFilter('') });
  if (genderFilter) chips.push({ key: 'gender', label: `Gender: ${genderFilter}`, onClear: () => setGenderFilter('') });
  if (ethnicityFilter) chips.push({ key: 'ethnicity', label: `Ethnicity: ${ethnicityFilter}`, onClear: () => setEthnicityFilter('') });
  if (shareholderFilter) {
   const label = shareholderFilter === 'true' ? 'Shareholder' : 'Non-shareholder';
   chips.push({ key: 'shareholder', label: `Status: ${label}`, onClear: () => setShareholderFilter('') });
  }
  if (benefitPlanFilter) chips.push({ key: 'benefitPlan', label: `Plan: ${benefitPlanFilter}`, onClear: () => setBenefitPlanFilter('') });
  if (minEarnings) chips.push({ key: 'minEarnings', label: `Min Earnings: $${Number(minEarnings).toLocaleString()}`, onClear: () => setMinEarnings('') });
  if (debouncedSearch) chips.push({ key: 'search', label: `Search: ${debouncedSearch}`, onClear: () => setLocalSearch('') });
  return chips;
 }, [deptFilter, typeFilter, genderFilter, ethnicityFilter, shareholderFilter, benefitPlanFilter, minEarnings, debouncedSearch]);

 const handleModalKeyDown = (event) => {
  if (event.key === 'Escape') {
   event.preventDefault();
   onClose();
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

 const VirtualRow = ({ index, style }) => {
  const emp = displayData[index];
  if (!emp) return null;
  return (
   <div className={`virtual-row ${index % 2 === 0 ? 'even' : 'odd'}`} style={style}>
    <div className="virtual-cell index">{(page - 1) * pageSize + index + 1}</div>
    <div className="virtual-cell employee">
     <div className="emp-cell">
      <div className="emp-avatar">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
      <div>
       <div className="emp-name">{emp.firstName} {emp.lastName}</div>
       <div className="emp-id">{emp.employeeId}</div>
      </div>
     </div>
    </div>
    <div className="virtual-cell department">
     <span className="dept-tag">{emp.department || 'Unassigned'}</span>
    </div>
    <div className="virtual-cell role">
     <div className="meta-cell">
      <span>{emp.gender || 'Unknown'}</span>
      <span className="dot">-</span>
      <span>{emp.ethnicity || 'Unknown'}</span>
     </div>
    </div>
    <div className="virtual-cell status">
     <span className={`status-badge ${emp.employmentType === 'Full-time' ? 'success' : 'warning'}`}>
      {emp.employmentType}
     </span>
     {emp.isShareholder && <span className="shareholder-tag">Shareholder</span>}
    </div>
    <div className="virtual-cell earnings text-right">
     {activeFilters.context === 'vacation' ? (
      <span className="vacation-days">{emp.vacationDays || 0} d</span>
     ) : (
      <span className="earnings-val">{formatCurrency(emp.totalEarnings)}</span>
     )}
    </div>
   </div>
  );
 };


 // Data to display (already filtered by backend)
 const displayData = data?.data || [];

 const totalPages = data?.meta?.pages || 1;
 const totalRecords = data?.meta?.total || 0;

 // Handle Export CSV
 const [exporting, setExporting] = useState(false);

 const handleExport = async () => {
  setExporting(true);
  setExportError('');
  try {
   const csvBlob = await exportDrilldownCsv({
    ...activeFilters,
    search: debouncedSearch
   });
   const url = URL.createObjectURL(csvBlob);
   const exportContext = activeFilters.context || 'all';
   const link = document.createElement("a");
   link.setAttribute("href", url);
   link.setAttribute("download", `ajax_export_${exportContext}_${new Date().toISOString().slice(0, 10)}.csv`);
   link.style.visibility = 'hidden';
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);

  } catch (err) {
   setExportError(err?.response?.data?.message || 'Failed to export data');
  } finally {
   setExporting(false);
  }
 };

 return (
  <div className="modal-overlay">
   <div
    className="modal-content"
    role="dialog"
    aria-modal="true"
    aria-labelledby="drilldown-modal-title"
    ref={modalRef}
    onKeyDown={handleModalKeyDown}
   >
    {/* Header */}
    <div className="modal-header">
     <div>
      <h2 id="drilldown-modal-title">Employee Details</h2>
      <p className="subtitle">View and filter employee records</p>
     </div>
     <div className="modal-actions">
      <button
        type="button"
        className="export-btn"
        onClick={handleExport}
        disabled={exporting}
        aria-label="Export current filtered records to CSV"
      >
       {exporting ? 'Exporting...' : 'Export CSV'}
      </button>
      <button type="button" className="close-btn" onClick={onClose} aria-label="Close drilldown" ref={closeButtonRef}>X</button>
     </div>
    </div>

    {/* Filter Bar */}
    <div className="filter-bar">
     <div className="filter-row filter-row-primary">
     <div className="search-group">
       <label className="sr-only" htmlFor="drilldown-search">Search employees</label>
       <span className="search-icon" aria-hidden="true"><FiSearch size={14} /></span>
       <input
        id="drilldown-search"
        type="text"
        placeholder="Search ID or Name..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="search-input"
        aria-label="Search employees by id or name"
       />
      </div>

      <div className="filter-group-wrap">
       <div className="filter-group">
        <label className="sr-only" htmlFor="drilldown-department">Department filter</label>
        <select
         id="drilldown-department"
         value={deptFilter}
         onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
         className={`filter-select ${deptFilter ? 'active' : ''}`}
        >
         <option value="">All Departments</option>
         {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <label className="sr-only" htmlFor="drilldown-employment-type">Employment type filter</label>
        <select
         id="drilldown-employment-type"
         value={typeFilter}
         onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
         className={`filter-select ${typeFilter ? 'active' : ''}`}
        >
         <option value="">All Types</option>
         <option value="Full-time">Full-time</option>
         <option value="Part-time">Part-time</option>
        </select>
       </div>

       <div className="filter-group">
        <label className="sr-only" htmlFor="drilldown-gender">Gender filter</label>
        <select
         id="drilldown-gender"
         value={genderFilter}
         onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
         className={`filter-select ${genderFilter ? 'active' : ''}`}
        >
         <option value="">All Genders</option>
         <option value="Male">Male</option>
         <option value="Female">Female</option>
        </select>

        <label className="sr-only" htmlFor="drilldown-ethnicity">Ethnicity filter</label>
        <select
         id="drilldown-ethnicity"
         value={ethnicityFilter}
         onChange={(e) => { setEthnicityFilter(e.target.value); setPage(1); }}
         className={`filter-select ${ethnicityFilter ? 'active' : ''}`}
        >
         <option value="">All Ethnicities</option>
         <option value="Asian">Asian</option>
         <option value="Caucasian">Caucasian</option>
         <option value="Hispanic">Hispanic</option>
         <option value="African American">African American</option>
         <option value="Other">Other</option>
        </select>

        <label className="sr-only" htmlFor="drilldown-shareholder">Shareholder status filter</label>
        <select
         id="drilldown-shareholder"
         value={shareholderFilter}
         onChange={(e) => { setShareholderFilter(e.target.value); setPage(1); }}
         className={`filter-select ${shareholderFilter ? 'active' : ''}`}
        >
         <option value="">Shareholder Status</option>
         <option value="true">Shareholders Only</option>
         <option value="false">Non-Shareholders</option>
        </select>
       </div>
      </div>
     </div>

     {/* CEO Query Filter: Employees earning over $X */}
     <div className="filter-row filter-row-secondary">
      <div className="earnings-filter-group">
       <span className="filter-label">Min Earnings $</span>
       <label className="sr-only" htmlFor="drilldown-min-earnings">Minimum earnings filter</label>
       <input
        id="drilldown-min-earnings"
        type="number"
        placeholder="e.g. 50000"
        className="earnings-input"
        value={minEarnings}
        onChange={(e) => { setMinEarnings(e.target.value); setPage(1); }}
        aria-label="Minimum earnings"
       />
       <div className="quick-filters">
        <button type="button" onClick={() => { setMinEarnings('100000'); setPage(1); }}>Over 100k</button>
        <button type="button" onClick={() => { setMinEarnings('150000'); setPage(1); }}>Over 150k</button>
        <button type="button" onClick={() => { setMinEarnings('200000'); setPage(1); }}>Over 200k</button>
        <button type="button" className="ghost" onClick={() => { setMinEarnings(''); setPage(1); }}>Clear</button>
       </div>
      </div>
     </div>
    </div>

    {(departmentsError || exportError) && (
     <div className="inline-error-banner" role="alert">
      <span>{departmentsError || exportError}</span>
      <button
       type="button"
       className="inline-error-action"
       onClick={() => {
        if (departmentsError) {
         void loadDepartments();
        } else {
         void handleExport();
        }
       }}
       disabled={exporting}
      >
       Retry
      </button>
     </div>
    )}

    {activeFilterChips.length > 0 && (
     <div className="active-filters">
      <span className="active-label">Active Filters:</span>
      <div className="chip-row">
       {activeFilterChips.map((chip) => (
        <button key={chip.key} className="filter-chip" onClick={() => { chip.onClear(); setPage(1); }}>
         <span>{chip.label}</span>
         <span className="chip-close">x</span>
        </button>
       ))}
      </div>
      <button className="clear-all" onClick={() => {
       setDeptFilter('');
       setTypeFilter('');
       setGenderFilter('');
       setEthnicityFilter('');
       setShareholderFilter('');
       setBenefitPlanFilter('');
       setMinEarnings('');
       setLocalSearch('');
       setPage(1);
      }}>
       Clear All
      </button>
     </div>
    )}

    {/* Financial Summary Header (New) */}
    {summaryData && (
     <div className="financial-summary-header">
      <h4 className="summary-title">Selection Totals</h4>
      {(summaryPartial || summaryLoading) && (
       <span className="summary-mode-pill">
        FAST MODE
       </span>
      )}

      {/* Earnings - show for earnings context or no context */}
      {(activeFilters.context === 'earnings' || !activeFilters.context) && (
       <div className="summary-metric">
        <span className="summary-metric-label">Total Earnings</span>
        <span className="summary-metric-value summary-earnings">{renderCurrency(summaryData.totalEarnings)}</span>
       </div>
      )}

      {/* Benefits - show for benefits context or no context */}
      {(activeFilters.context === 'benefits' || !activeFilters.context) && (
       <div className="summary-metric">
        <span className="summary-metric-label">Total Benefits Cost</span>
        <span className="summary-metric-value summary-benefits">{renderCurrency(summaryData.totalBenefits)}</span>
       </div>
      )}

      {/* Vacation - show for vacation context or no context */}
      {(activeFilters.context === 'vacation' || !activeFilters.context) && (
       <div className="summary-metric">
        <span className="summary-metric-label">Total Vacation Days</span>
        <span className="summary-metric-value summary-vacation">
         {renderVacation(summaryData.totalVacation)}
        </span>
       </div>
      )}

      <div className="summary-metric summary-metric-count">
       <span className="summary-metric-label">Count</span>
       <span className="summary-metric-value summary-count">{summaryData.count?.toLocaleString() || 0}</span>
      </div>
     </div>
    )}

    {/* Data Area */}
    <div className="table-container" ref={containerRef}>
     {loadError && !loading && (
      <div className="inline-error-banner inline-error-banner-table" role="alert">
       <span>{loadError}</span>
       <button type="button" className="inline-error-action" onClick={() => { void loadData(); }}>
        Retry
       </button>
      </div>
     )}
     {loading ? (
      <div className="loading-state">
       <div className="spinner"></div>
       <p>Loading records...</p>
      </div>
     ) : (
      <>
       {isVirtual ? (
        <div className="virtual-table">
         <div className="virtual-header">
          <div>#</div>
          <div>Employee</div>
          <div>Department</div>
          <div>Role Info</div>
          <div>Status</div>
          <div className="text-right">{activeFilters.context === 'vacation' ? 'Vacation Used' : 'Earnings'}</div>
         </div>
         {displayData.length === 0 ? (
          <div className="no-results">
           <div className="empty-state">
            <span>EMPTY</span>
            <p>No employees found matching filters</p>
           </div>
          </div>
         ) : (
          <VirtualList
           height={listHeight}
           itemCount={displayData.length}
           itemSize={rowHeight}
           width="100%"
          >
           {VirtualRow}
          </VirtualList>
         )}
        </div>
       ) : (
        <table className="drilldown-table">
         <thead>
          <tr>
           <th>#</th>
           <th>Employee</th>
           <th>Department</th>
           <th>Role Info</th>
           <th>Status</th>
           <th className="text-right">
            {activeFilters.context === 'vacation' ? 'Vacation Used' : 'Earnings'}
           </th>
          </tr>
         </thead>
         <tbody>
          {displayData.length === 0 ? (
           <tr>
            <td colSpan="6" className="no-results">
             <div className="empty-state">
              <span>EMPTY</span>
              <p>No employees found matching filters</p>
             </div>
            </td>
           </tr>
          ) : (
           displayData.map((emp, idx) => (
            <tr key={emp._id}>
             <td className="text-muted">{(page - 1) * pageSize + idx + 1}</td>
             <td>
              <div className="emp-cell">
               <div className="emp-avatar">{emp.firstName[0]}{emp.lastName[0]}</div>
               <div>
                <div className="emp-name">{emp.firstName} {emp.lastName}</div>
                <div className="emp-id">{emp.employeeId}</div>
               </div>
              </div>
             </td>
             <td><span className="dept-tag">{emp.department || 'Unassigned'}</span></td>
             <td>
              <div className="meta-cell">
               <span>{emp.gender || 'Unknown'}</span>
               <span className="dot">-</span>
               <span>{emp.ethnicity || 'Unknown'}</span>
              </div>
             </td>
             <td>
              <span className={`status-badge ${emp.employmentType === 'Full-time' ? 'success' : 'warning'}`}>
               {emp.employmentType}
              </span>
              {emp.isShareholder && <span className="shareholder-tag">Shareholder</span>}
             </td>
             <td className="text-right font-mono">
              {activeFilters.context === 'vacation' ? (
               <span className="vacation-days">{emp.vacationDays || 0} d</span>
              ) : (
               <span className="earnings-val">{formatCurrency(emp.totalEarnings)}</span>
              )}
             </td>
            </tr>
           ))
          )}
         </tbody>
        </table>
       )}
      </>
     )}
    </div>

    {/* Footer / Pagination */}
    <div className="modal-footer">
     <div className="page-size">
     <span>Show</span>
      <label className="sr-only" htmlFor="drilldown-page-size">Rows per page</label>
      <select id="drilldown-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
       <option value={10}>10</option>
       <option value={20}>20</option>
       <option value={50}>50</option>
       <option value={100}>100</option>
       <option value={500}>500</option>
       <option value={1000}>1,000</option>
       <option value={5000}>5,000</option>
       <option value={10000}>10,000</option>
      </select>
     </div>

     <div className="pagination-controls">
      <span className="page-info">
       Page
       <label className="sr-only" htmlFor="drilldown-current-page">Current page</label>
       <input
        id="drilldown-current-page"
        type="number"
        min="1"
        max={totalPages}
        value={page}
        onChange={(e) => {
         const val = Number(e.target.value);
         if (val >= 1 && val <= totalPages) setPage(val);
        }}
        className="page-input-field"
        aria-label="Current page"
       />
       of {totalPages} <span className="text-muted">({totalRecords.toLocaleString()} items)</span>
      </span>
      <div className="btn-group">
       <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
       <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
     </div>
    </div>
   </div>
  </div >
 );
}

export default DrilldownModal;



