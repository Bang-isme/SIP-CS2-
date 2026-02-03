import { useState, useEffect, useMemo, useRef } from 'react';
import { getDrilldown, getDepartments, exportDrilldownCsv } from '../services/api';

function DrilldownModal({ filters: initialFilters, onClose }) {
 const [data, setData] = useState(null);
 const [loading, setLoading] = useState(true);
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [localSearch, setLocalSearch] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [departments, setDepartments] = useState([]);
 const requestIdRef = useRef(0);
 const abortRef = useRef(null);

 // Fetch departments on mount
 useEffect(() => {
  const fetchDepts = async () => {
   try {
    const depts = await getDepartments();
    setDepartments(depts);
   } catch (err) {
    console.error("Failed to load departments", err);
   }
  };
  fetchDepts();
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
 const [minEarnings, setMinEarnings] = useState(''); // CEO Query: "Employees earning over $X"

 // Combine all filters
 const activeFilters = useMemo(() => ({
  ...initialFilters,
  department: deptFilter || undefined,
  employmentType: typeFilter || undefined,
  gender: genderFilter || undefined,
  ethnicity: ethnicityFilter || undefined,
  isShareholder: shareholderFilter || undefined,
  minEarnings: minEarnings || undefined
 }), [initialFilters, deptFilter, typeFilter, genderFilter, ethnicityFilter, shareholderFilter, minEarnings]);

 useEffect(() => {
  loadData();
 }, [activeFilters, page, pageSize, debouncedSearch]);

 const loadData = async () => {
  const requestId = ++requestIdRef.current;
  if (abortRef.current) {
   abortRef.current.abort();
  }
  const controller = new AbortController();
  abortRef.current = controller;
  setLoading(true);
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
  } catch (err) {
   if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
   console.error(err);
  } finally {
   if (requestId === requestIdRef.current) {
    setLoading(false);
   }
  }
 };

 const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

 const summaryPartial = data?.summary?.partial;
 const renderCurrency = (value) => summaryPartial ? '--' : formatCurrency(value);
 const renderVacation = (value) => summaryPartial ? '--' : `${(value || 0).toLocaleString()} days`;


 // Data to display (already filtered by backend)
 const displayData = data?.data || [];

 const totalPages = data?.meta?.pages || 1;
 const totalRecords = data?.meta?.total || 0;

 // Handle Export CSV
 const [exporting, setExporting] = useState(false);

 const handleExport = async () => {
  setExporting(true);
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
   console.error("Export failed", err);
   alert("Failed to export data");
  } finally {
   setExporting(false);
  }
 };

 return (
  <div className="modal-overlay" onClick={onClose}>
   <div className="modal-content" onClick={(e) => e.stopPropagation()}>
    {/* Header */}
    <div className="modal-header">
     <div>
      <h2>Employee Details</h2>
      <p className="subtitle">View and filter employee records</p>
     </div>
     <div style={{ display: 'flex', gap: '10px' }}>
      <button
       className="export-btn"
       onClick={handleExport}
       disabled={exporting}
       style={{
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: exporting ? 'wait' : 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
       }}
      >
       {exporting ? 'Exporting...' : (
        <>
         <span>EXPORT</span> Export CSV
        </>
       )}
      </button>
      <button className="close-btn" onClick={onClose}>X</button>
     </div>
    </div>

    {/* Filter Bar */}
    <div className="filter-bar">
     <div className="search-group">
      <span className="search-icon">S</span>
      <input
       type="text"
       placeholder="Search ID or Name..."
       value={localSearch}
       onChange={(e) => setLocalSearch(e.target.value)}
       className="search-input"
      />
     </div>

     <div className="filter-group-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      <div className="filter-group">
       <select
        value={deptFilter}
        onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
        className={`filter-select ${deptFilter ? 'active' : ''}`}
       >
        <option value="">All Departments</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
       </select>

       <select
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
       <select
        value={genderFilter}
        onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
        className={`filter-select ${genderFilter ? 'active' : ''}`}
       >
        <option value="">All Genders</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
       </select>

       <select
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

       <select
        value={shareholderFilter}
        onChange={(e) => { setShareholderFilter(e.target.value); setPage(1); }}
        className={`filter-select ${shareholderFilter ? 'active' : ''}`}
        style={{ border: shareholderFilter === 'true' ? '1px solid #10b981' : '' }}
       >
        <option value="">Shareholder Status</option>
        <option value="true">Shareholders Only</option>
        <option value="false">Non-Shareholders</option>
       </select>
      </div>
     </div>

     {/* CEO Query Filter: Employees earning over $X */}
     <div className="earnings-filter-group">
      <span className="filter-label">Min Earnings $</span>
      <input
       type="number"
       placeholder="e.g. 50000"
       className="earnings-input"
       value={minEarnings}
       onChange={(e) => { setMinEarnings(e.target.value); setPage(1); }}
      />
     </div>
    </div>

    {/* Financial Summary Header (New) */}
    {data?.summary && (
     <div className="financial-summary-header" style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
     display: 'flex',
     gap: '24px',
     alignItems: 'center'
    }}>
      <h4 style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>SELECTION TOTALS:</h4>
      {summaryPartial && (
       <span style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '999px' }}>
        FAST MODE
       </span>
      )}

      {/* Earnings - show for earnings context or no context */}
      {(activeFilters.context === 'earnings' || !activeFilters.context) && (
       <div className="summary-metric" style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Total Earnings</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>{renderCurrency(data.summary.totalEarnings)}</span>
       </div>
      )}

      {/* Benefits - show for benefits context or no context */}
      {(activeFilters.context === 'benefits' || !activeFilters.context) && (
       <div className="summary-metric" style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Total Benefits Cost</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>{renderCurrency(data.summary.totalBenefits)}</span>
       </div>
      )}

      {/* Vacation - show for vacation context or no context */}
      {(activeFilters.context === 'vacation' || !activeFilters.context) && (
       <div className="summary-metric" style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Total Vacation Days</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#7c3aed' }}>
         {renderVacation(data.summary.totalVacation)}
        </span>
       </div>
      )}

      <div className="summary-metric" style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
       <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Count</span>
       <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.summary.count?.toLocaleString() || 0}</span>
      </div>
     </div>
    )}

    {/* Data Area */}
    <div className="table-container">
     {loading ? (
      <div className="loading-state">
       <div className="spinner"></div>
       <p>Loading records...</p>
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
    </div>

    {/* Footer / Pagination */}
    <div className="modal-footer">
     <div className="page-size">
      <span>Show</span>
      <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
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
       <input
        type="number"
        min="1"
        max={totalPages}
        value={page}
        onChange={(e) => {
         const val = Number(e.target.value);
         if (val >= 1 && val <= totalPages) setPage(val);
        }}
        className="page-input-field"
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

   <style>{`
    .modal-overlay {
     position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
     display: flex; align-items: center; justify-content: center; z-index: 1000;
     animation: fadeIn 0.2s ease-out;
    }
    /* Earnings Filter (CEO Query) */
    .earnings-filter-group {
     display: flex;
     align-items: center;
     gap: 8px;
     background: var(--bg-subtle);
     padding: 6px 12px;
     border-radius: var(--radius);
     border: 1px solid var(--border);
    }
    .filter-label {
     font-size: 0.75rem;
     font-weight: 600;
     color: var(--text-secondary);
     white-space: nowrap;
    }
    .earnings-input {
     width: 100px;
     padding: 6px 10px;
     border: 1px solid var(--border);
     border-radius: var(--radius);
     outline: none;
     font-size: 0.85rem;
     background: var(--bg-card);
    }
    .earnings-input:focus {
     border-color: var(--primary);
     box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }
    .modal-content {
     background: var(--bg-card); border-radius: var(--radius-xl); width: 95%; max-width: 1100px;
     height: 85vh; display: flex; flex-direction: column; overflow: hidden;
     box-shadow: var(--shadow-lg); border: 1px solid var(--border);
     animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    /* Header */
    .modal-header {
     padding: 1.5rem; display: flex; justify-content: space-between; align-items: center;
     border-bottom: 1px solid var(--border); background: #ffffff;
    }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px; }
    .subtitle { font-size: 0.875rem; color: var(--text-secondary); }
    .close-btn { 
     width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); 
     background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.2s;
     display: grid; place-items: center; font-size: 1.2rem; line-height: 1;
    }
    .close-btn:hover { background: var(--bg-hover); color: var(--danger); border-color: var(--danger); }

    /* Filter Bar */
    .filter-bar {
     padding: 1rem 1.5rem; background: var(--bg-app); border-bottom: 1px solid var(--border);
     display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;
    }
    .search-group {
     position: relative; flex: 1; min-width: 250px;
    }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); }
    .search-input {
     width: 100%; padding: 10px 12px 10px 36px; border: 1px solid var(--border); 
     border-radius: var(--radius); outline: none; transition: all 0.2s; font-size: 0.9rem;
    }
    .search-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--primary-subtle); }

    .filter-group { display: flex; gap: 1rem; align-items: center; }
    .filter-select {
     padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius);
     background: white; color: var(--text-secondary); font-size: 0.9rem; outline: none; cursor: pointer;
    }
    .filter-select.active { border-color: var(--primary); color: var(--primary); background: var(--primary-subtle); }

    .toggle-group {
     display: flex; background: white; border: 1px solid var(--border);
     border-radius: var(--radius); padding: 2px;
    }
    .toggle-btn {
     padding: 6px 12px; font-size: 0.85rem; border: none; background: transparent;
     color: var(--text-secondary); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s;
    }
    .toggle-btn:hover { color: var(--text-main); }
    .toggle-btn.active { background: var(--primary-subtle); color: var(--primary); font-weight: 500; }

    /* Table */
    .table-container { flex: 1; overflow: auto; position: relative; }
    .drilldown-table { width: 100%; border-collapse: collapse; }
    .drilldown-table th {
     position: sticky; top: 0; background: var(--bg-app); color: var(--text-secondary);
     font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
     padding: 12px 1.5rem; text-align: left; border-bottom: 1px solid var(--border);
    }
    .drilldown-table td {
     padding: 12px 1.5rem; border-bottom: 1px solid var(--border); color: var(--text-main); font-size: 0.9rem;
     vertical-align: middle;
    }
    .drilldown-table tr:hover td { background: var(--bg-hover); }

    /* Cell Styles */
    .emp-cell { display: flex; align-items: center; gap: 12px; }
    .emp-avatar {
     width: 36px; height: 36px; background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%);
     color: var(--primary); border-radius: 50%; display: grid; place-items: center;
     font-weight: 600; font-size: 0.8rem;
    }
    .emp-name { font-weight: 500; }
    .emp-id { font-size: 0.75rem; color: var(--text-tertiary); font-family: monospace; }
    
    .dept-tag { 
     padding: 4px 8px; border-radius: 20px; background: #F3F4F6; 
     color: var(--text-secondary); font-size: 0.8rem; font-weight: 500;
    }
    
    .meta-cell { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.85rem; }
    .dot { font-size: 0.6rem; color: var(--border); }

    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .status-badge.success { background: var(--success-bg); color: var(--success); }
    .status-badge.warning { background: var(--warning-bg); color: var(--warning); }
    
    .shareholder-tag { 
     margin-left: 8px; font-size: 0.75rem; 
     color: var(--primary); background: var(--primary-subtle); 
     padding: 2px 6px; border-radius: 4px; border: 1px solid var(--primary-subtle);
     font-weight: 500;
    }

    .text-right { text-align: right; }
    .font-mono { font-family: 'SF Mono', 'Roboto Mono', monospace; font-weight: 500; }
    .earnings-val { color: var(--success); }
    .vacation-days { color: var(--primary); }

    /* Footer */
    .modal-footer {
     padding: 1rem 1.5rem; border-top: 1px solid var(--border);
     display: flex; justify-content: space-between; align-items: center;
     background: #ffffff;
    }
    .page-size { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); }
    .page-size select { border: 1px solid var(--border); border-radius: 4px; padding: 4px; }
    
    .pagination-controls { display: flex; align-items: center; gap: 16px; }
    .page-info { font-size: 0.85rem; color: var(--text-main); }
    .btn-group { display: flex; gap: 8px; }
    .btn-group button {
     padding: 6px 12px; border: 1px solid var(--border); background: white;
     border-radius: var(--radius); cursor: pointer; font-size: 0.85rem; transition: all 0.15s;
    }
    .btn-group button:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .page-input-field {
     width: 50px; padding: 2px 4px; border: 1px solid var(--border); border-radius: 4px;
     text-align: center; margin: 0 6px; font-size: 0.85rem; font-family: inherit;
    }

    /* States */
    .loading-state, .empty-state {
     display: flex; flex-direction: column; align-items: center; justify-content: center;
     height: 300px; color: var(--text-secondary); gap: 1rem;
    }
    .spinner {
     width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary);
     border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
   `}</style>
  </div >
 );
}

export default DrilldownModal;
