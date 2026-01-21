import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function EarningsChart({ data, onDrilldown }) {
    // Transform data for bar chart
    const chartData = Object.entries(data.byDepartment).map(([name, values]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        current: Math.round(values.current),
        previous: Math.round(values.previous),
    }));

    const formatCurrency = (value) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
        return `$${value}`;
    };

    const handleClick = (data) => {
        if (data && onDrilldown) {
            // Drill down by department
            onDrilldown({ department: data.fullName });
        }
    };

    return (
        <div className="chart-container">
            <div className="chart-stats">
                <div className="stat">
                    <span className="stat-label">Total Current Year</span>
                    <span className="stat-value">{formatCurrency(data.totals.current)}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Total Previous Year</span>
                    <span className="stat-value">{formatCurrency(data.totals.previous)}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Shareholders</span>
                    <span className="stat-value">{formatCurrency(data.byShareholder.shareholder.current)}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Non-Shareholders</span>
                    <span className="stat-value">{formatCurrency(data.byShareholder.nonShareholder.current)}</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} onClick={(e) => e && handleClick(e.activePayload?.[0]?.payload)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                    <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                    />
                    <Legend />
                    <Bar dataKey="current" name="Current Year" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previous" name="Previous Year" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>

            <div className="chart-breakdown">
                <h4>By Demographics</h4>
                <div className="breakdown-grid">
                    {Object.entries(data.byGender).map(([gender, values]) => (
                        <div key={gender} className="breakdown-item" onClick={() => onDrilldown?.({ gender })}>
                            <span className="breakdown-label">{gender}</span>
                            <span className="breakdown-value">{formatCurrency(values.current)}</span>
                        </div>
                    ))}
                    {Object.entries(data.byEmploymentType).map(([type, values]) => (
                        <div key={type} className="breakdown-item" onClick={() => onDrilldown?.({ employmentType: type })}>
                            <span className="breakdown-label">{type}</span>
                            <span className="breakdown-value">{formatCurrency(values.current)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .chart-container { margin-top: 1rem; }
        .chart-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .stat {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .chart-breakdown { margin-top: 1rem; }
        .chart-breakdown h4 {
          font-size: 0.85rem;
          color: #666;
          margin: 0 0 0.5rem;
        }
        .breakdown-grid {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .breakdown-item {
          background: #f8f9fa;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          transition: background 0.2s;
        }
        .breakdown-item:hover {
          background: #e9ecef;
        }
        .breakdown-label {
          font-size: 0.8rem;
          color: #666;
        }
        .breakdown-value {
          font-weight: 600;
          color: #1a1a2e;
        }
      `}</style>
        </div>
    );
}

export default EarningsChart;
