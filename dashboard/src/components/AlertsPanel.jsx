function AlertsPanel({ alerts }) {
  const alertConfig = {
    anniversary: { icon: '🎂', color: '#f59e0b', bg: '#fffbeb', label: 'Hiring Anniversary' },
    vacation: { icon: '🏖️', color: '#3b82f6', bg: '#eff6ff', label: 'High Vacation Balance' },
    benefits_change: { icon: '📋', color: '#10b981', bg: '#ecfdf5', label: 'Benefits Update' },
    birthday: { icon: '🎉', color: '#ec4899', bg: '#fdf2f8', label: 'Birthday Alert' },
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="no-alerts fade-in">
        <div className="empty-state-icon">✅</div>
        <p>All caught up! No active alerts.</p>
      </div>
    );
  }

  return (
    <div className="alerts-container animate-enter">
      <div className="alerts-grid">
        {alerts.map((alert, index) => {
          const config = alertConfig[alert.alert.type] || { icon: '🔔', color: '#64748b', bg: '#f8fafc' };
          // Determine animation stagger
          const staggerClass = index === 0 ? 'stagger-1' : index === 1 ? 'stagger-2' : 'stagger-3';

          return (
            <div
              key={index}
              className={`alert-card fade-in ${staggerClass}`}
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
                {alert.matchingEmployees.slice(0, 10).map((emp, i) => (
                  <div key={i} className="employee-row">
                    <div className="emp-details">
                      <span className="emp-name">{emp.name}</span>
                      <span className="emp-id">{emp.employeeId}</span>
                    </div>
                    {emp.vacationDays !== undefined && (
                      <span className="emp-tag vacation">{emp.vacationDays} days</span>
                    )}
                    {/* Calculate days until if needed or show generic info */}
                    {(alert.alert.type === 'anniversary' || alert.alert.type === 'birthday') && (
                      <span className="emp-tag date">Upcoming</span>
                    )}
                  </div>
                ))}
              </div>

              {alert.matchingEmployees.length > 10 && (
                <div className="alert-footer">
                  <button className="view-more-btn">
                    +{alert.matchingEmployees.length - 10} more employees
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .alerts-container { margin-top: 0; }
        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: var(--space-6);
        }
        
        .alert-card {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .alert-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--accent-color);
        }
        .alert-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .alert-header {
            padding: var(--space-4);
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--color-bg-subtle);
        }
        .alert-title-wrap {
            display: flex;
            align-items: center;
            gap: var(--space-3);
        }
        .alert-icon { font-size: 1.25rem; }
        .alert-name {
            font-weight: 700;
            color: var(--color-primary-900);
            font-size: 0.95rem;
        }
        .alert-badge {
            background: var(--accent-color);
            color: white;
            padding: 2px 10px;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .alert-body {
            padding: 0 var(--space-2);
            max-height: 250px;
            overflow-y: auto;
            flex: 1;
        }
        
        .employee-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-3) var(--space-2);
            border-bottom: 1px solid var(--color-border);
            transition: background 0.1s;
        }
        .employee-row:hover { background: var(--color-bg-subtle); }
        .employee-row:last-child { border-bottom: none; }

        .emp-details {
            display: flex;
            flex-direction: column;
        }
        .emp-name {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--color-text-main);
        }
        .emp-id {
            font-size: 0.75rem;
            color: var(--color-text-tertiary);
        }

        .emp-tag {
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 500;
        }
        .emp-tag.vacation { background: #eff6ff; color: #3b82f6; }
        .emp-tag.date { background: #fff7ed; color: #c2410c; }
        
        .alert-footer {
            padding: var(--space-2);
            border-top: 1px solid var(--color-border);
            text-align: center;
            background: var(--color-bg-subtle);
        }
        .view-more-btn {
            background: #e2e8f0;
            border: none;
            color: #475569;
            font-size: 0.8rem;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
        }
        .view-more-btn:hover { background: #cbd5e1; color: #1e293b; }

        .no-alerts {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-8);
            color: var(--color-text-tertiary);
            background: var(--color-bg-subtle);
            border-radius: var(--radius-lg);
            border: 2px dashed var(--color-border);
        }
        .empty-state-icon { font-size: 3rem; margin-bottom: var(--space-4); opacity: 0.5; }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}</style>
    </div>
  );
}

export default AlertsPanel;
