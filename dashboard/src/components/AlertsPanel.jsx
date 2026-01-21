function AlertsPanel({ alerts }) {
    const alertIcons = {
        anniversary: '🎂',
        vacation: '🏖️',
        benefits_change: '📋',
        birthday: '🎉',
    };

    const alertColors = {
        anniversary: '#f59e0b',
        vacation: '#3b82f6',
        benefits_change: '#10b981',
        birthday: '#ec4899',
    };

    if (!alerts || alerts.length === 0) {
        return (
            <div className="no-alerts">
                <span className="icon">✅</span>
                <p>No active alerts at this time</p>
            </div>
        );
    }

    return (
        <div className="alerts-container">
            <div className="alerts-grid">
                {alerts.map((alert, index) => (
                    <div
                        key={index}
                        className="alert-card"
                        style={{ borderLeftColor: alertColors[alert.alert.type] }}
                    >
                        <div className="alert-header">
                            <span className="alert-icon">{alertIcons[alert.alert.type]}</span>
                            <span className="alert-name">{alert.alert.name}</span>
                            <span className="alert-count">{alert.count}</span>
                        </div>

                        <div className="alert-employees">
                            {alert.matchingEmployees.slice(0, 5).map((emp, i) => (
                                <div key={i} className="employee-row">
                                    <span className="emp-name">{emp.name}</span>
                                    <span className="emp-id">{emp.employeeId}</span>
                                    {emp.vacationDays && (
                                        <span className="emp-info">{emp.vacationDays} days</span>
                                    )}
                                </div>
                            ))}
                            {alert.matchingEmployees.length > 5 && (
                                <div className="more-employees">
                                    +{alert.matchingEmployees.length - 5} more employees
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        .alerts-container { margin-top: 0.5rem; }
        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        .alert-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1rem;
          border-left: 4px solid #ccc;
        }
        .alert-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .alert-icon { font-size: 1.25rem; }
        .alert-name {
          flex: 1;
          font-weight: 600;
          color: #1a1a2e;
        }
        .alert-count {
          background: #e11d48;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .alert-employees {
          max-height: 150px;
          overflow-y: auto;
        }
        .employee-row {
          display: flex;
          gap: 0.5rem;
          padding: 0.4rem 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.85rem;
        }
        .employee-row:last-child { border-bottom: none; }
        .emp-name { flex: 1; color: #333; }
        .emp-id { color: #888; font-size: 0.75rem; }
        .emp-info {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
        }
        .more-employees {
          text-align: center;
          color: #666;
          font-size: 0.8rem;
          padding: 0.5rem;
          background: #e5e7eb;
          border-radius: 6px;
          margin-top: 0.5rem;
        }
        .no-alerts {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        .no-alerts .icon { font-size: 2rem; }
      `}</style>
        </div>
    );
}

export default AlertsPanel;
