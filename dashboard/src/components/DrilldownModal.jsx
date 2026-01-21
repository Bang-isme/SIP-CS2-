import { useState, useEffect } from 'react';
import { getDrilldown } from '../services/api';

function DrilldownModal({ filters, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [filters, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getDrilldown({ ...filters, page, limit: 10 });
      setData(response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Employee Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="filter-info">
          <strong>Filters:</strong>
          {Object.entries(filters).map(([key, value]) => (
            <span key={key} className="filter-tag">{key}: {value}</span>
          ))}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="data-info">
              Showing {data?.data?.length || 0} of {data?.meta?.total || 0} employees
            </div>

            <table className="drilldown-table">
              <thead>
                <tr>
                  <th>ID</th>
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
                {data?.data?.map((emp) => (
                  <tr key={emp._id}>
                    <td>{emp.employeeId}</td>
                    <td>{emp.firstName} {emp.lastName}</td>
                    <td>{emp.department}</td>
                    <td>{emp.gender || '-'}</td>
                    <td>{emp.ethnicity || '-'}</td>
                    <td>{emp.employmentType}</td>
                    <td>{emp.isShareholder ? '✓' : '-'}</td>
                    <td className={filters.context === 'vacation' ? 'text-blue' : 'text-green'}>
                      {filters.context === 'vacation'
                        ? `${emp.vacationDays || 0} days`
                        : formatCurrency(emp.totalEarnings)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.meta?.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {data.meta.pages}</span>
                <button
                  disabled={page >= data.meta.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
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
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 1000px;
          max-height: 85vh;
          overflow: auto;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .modal-header h2 { margin: 0; }
        .close-btn {
          border: none;
          background: #f1f5f9;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .filter-info {
          background: #f8f9fa;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .filter-tag {
          background: #e0e7ff;
          color: #4f46e5;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          margin-left: 0.5rem;
        }
        .data-info {
          color: #666;
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
        }
        .drilldown-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .drilldown-table th, .drilldown-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .drilldown-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #555;
        }
        .drilldown-table tr:hover {
          background: #f8f9fa;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }
        .pagination button {
          padding: 0.5rem 1rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .pagination button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        .text-green { color: var(--color-success-600); font-weight: 600; }
        .text-blue { color: var(--color-primary-600); font-weight: 600; }
      `}</style>
    </div>
  );
}

export default DrilldownModal;
