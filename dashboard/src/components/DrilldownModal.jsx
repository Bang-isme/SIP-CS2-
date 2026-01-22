import { useState, useEffect, useMemo } from 'react';
import { getDrilldown } from '../services/api';

function DrilldownModal({ filters, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [filters, page, pageSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getDrilldown({ ...filters, page, limit: pageSize });
      setData(response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

  // Client-side search filter (for already loaded data)
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!localSearch.trim()) return data.data;

    const term = localSearch.toLowerCase();
    return data.data.filter(emp =>
      emp.employeeId?.toLowerCase().includes(term) ||
      emp.firstName?.toLowerCase().includes(term) ||
      emp.lastName?.toLowerCase().includes(term) ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term)
    );
  }, [data, localSearch]);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const totalPages = data?.meta?.pages || 1;
  const totalRecords = data?.meta?.total || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Employee Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="filter-info">
          <strong>Filters:</strong>
          {Object.entries(filters).filter(([k]) => k !== 'context').map(([key, value]) => (
            <span key={key} className="filter-tag">{key}: {value}</span>
          ))}
        </div>

        {/* Search and Page Size Controls */}
        <div className="controls-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search loaded results..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button className="clear-search" onClick={() => setLocalSearch('')}>×</button>
            )}
          </div>
          <div className="page-size-control">
            <label>Show:</label>
            <select value={pageSize} onChange={handlePageSizeChange}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading employees...</p>
          </div>
        ) : (
          <>
            <div className="data-info">
              Showing {filteredData.length} of {data?.data?.length || 0} loaded
              {localSearch && ` (searching in page ${page})`}
              {' '}• Total in database: <strong>{totalRecords.toLocaleString()}</strong> employees
            </div>

            <div className="table-container">
              <table className="drilldown-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Gender</th>
                    <th>Ethnicity</th>
                    <th>Type</th>
                    <th>Shareholder</th>
                    <th>{filters.context === 'vacation' ? 'Vacation Days' : 'Total Earnings'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-results">
                        {localSearch ? `No employees found matching "${localSearch}"` : 'No employees found'}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((emp, idx) => (
                      <tr key={emp._id}>
                        <td>{(page - 1) * pageSize + idx + 1}</td>
                        <td><code>{emp.employeeId}</code></td>
                        <td>{emp.firstName} {emp.lastName}</td>
                        <td>{emp.department}</td>
                        <td>{emp.gender || '-'}</td>
                        <td>{emp.ethnicity || '-'}</td>
                        <td><span className={`type-badge ${emp.employmentType?.toLowerCase().replace('-', '')}`}>{emp.employmentType}</span></td>
                        <td>{emp.isShareholder ? '✓ Yes' : '-'}</td>
                        <td className={filters.context === 'vacation' ? 'text-blue' : 'text-green'}>
                          {filters.context === 'vacation'
                            ? `${emp.vacationDays || 0} days`
                            : formatCurrency(emp.totalEarnings)
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination">
              <div className="pagination-info">
                Page {page} of {totalPages} • {totalRecords.toLocaleString()} total records
              </div>
              <div className="pagination-buttons">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  ⟪
                </button>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  title="Previous"
                >
                  ← Prev
                </button>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={page}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= totalPages) setPage(val);
                  }}
                  className="page-input"
                />
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  title="Next"
                >
                  Next →
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last Page"
                >
                  ⟫
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          width: 95%;
          max-width: 1200px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h2 { margin: 0; font-size: 1.25rem; }
        .close-btn {
          border: none;
          background: #f1f5f9;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .close-btn:hover { background: #fee2e2; color: #dc2626; }

        .filter-info {
          background: #f8f9fa;
          padding: 0.75rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .filter-tag {
          background: #e0e7ff;
          color: #4f46e5;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          margin-left: 0.5rem;
        }

        /* Controls Bar */
        .controls-bar {
          padding: 1rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          background: #fafafa;
        }
        .search-box {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          font-size: 0.9rem;
        }
        .search-box input {
          width: 100%;
          padding: 10px 36px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-box input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .clear-search {
          position: absolute;
          right: 10px;
          background: #e2e8f0;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .clear-search:hover { background: #cbd5e1; }

        .page-size-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .page-size-control label {
          font-size: 0.85rem;
          color: #64748b;
        }
        .page-size-control select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .data-info {
          color: #666;
          font-size: 0.85rem;
          padding: 0.75rem 1.5rem;
          background: #f8fafc;
        }

        .table-container {
          overflow-x: auto;
          flex: 1;
          min-height: 200px;
        }
        .drilldown-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .drilldown-table th, .drilldown-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .drilldown-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .drilldown-table tr:hover td {
          background: #f8fafc;
        }
        .drilldown-table code {
          background: #e0e7ff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          color: #4f46e5;
        }
        .type-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .type-badge.fulltime { background: #dcfce7; color: #16a34a; }
        .type-badge.parttime { background: #fef3c7; color: #d97706; }
        .no-results {
          text-align: center;
          padding: 2rem !important;
          color: #94a3b8;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          background: #f8fafc;
        }
        .pagination-info {
          font-size: 0.85rem;
          color: #64748b;
        }
        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pagination-buttons button {
          padding: 6px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.15s;
        }
        .pagination-buttons button:hover:not(:disabled) {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }
        .pagination-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .page-input {
          width: 60px;
          padding: 6px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          text-align: center;
          font-size: 0.85rem;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .text-green { color: #16a34a; font-weight: 600; }
        .text-blue { color: #2563eb; font-weight: 600; }
      `}</style>
    </div>
  );
}

export default DrilldownModal;
