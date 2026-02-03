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
          <span className="stat-label">Shareholders</span>
          <span className="stat-value">{formatCurrency(data.byShareholder.shareholder.current)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Non-Shareholders</span>
          <span className="stat-value">{formatCurrency(data.byShareholder.nonShareholder.current)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} onClick={(e) => e && handleClick(e.activePayload?.[0]?.payload)}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-bg-subtle)' }}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-lg)'
            }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }} />
          <Bar dataKey="current" name="Current Year" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} maxBarSize={50} cursor="pointer" />
          <Bar dataKey="previous" name="Previous Year" fill="var(--color-text-tertiary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-breakdown">
        <h4>By Demographics (Click to Filter)</h4>
        <div className="breakdown-grid">
          {Object.entries(data.byGender).map(([gender, values]) => (
            <div key={gender} className="breakdown-item" onClick={() => onDrilldown?.({ gender })}>
              <span className="breakdown-tag">Gender</span>
              <span className="breakdown-label">{gender}</span>
              <span className="breakdown-value">{formatCurrency(values.current)}</span>
            </div>
          ))}
          {/* Ethnicity - Phase 1 Compliance */}
          {Object.entries(data.byEthnicity).map(([ethnicity, values]) => (
            <div key={ethnicity} className="breakdown-item" onClick={() => onDrilldown?.({ ethnicity })}>
              <span className="breakdown-tag">Ethnicity</span>
              <span className="breakdown-label">{ethnicity}</span>
              <span className="breakdown-value">{formatCurrency(values.current)}</span>
            </div>
          ))}
          {Object.entries(data.byEmploymentType).map(([type, values]) => (
            <div key={type} className="breakdown-item" onClick={() => onDrilldown?.({ employmentType: type })}>
              <span className="breakdown-tag">Type</span>
              <span className="breakdown-label">{type}</span>
              <span className="breakdown-value">{formatCurrency(values.current)}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .chart-container { margin-top: 0; }
        .chart-stats {
          display: flex;
          gap: var(--space-6);
          margin-bottom: var(--space-4);
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--color-border);
        }
        .stat {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .stat-value {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--color-primary-800);
        }
        .chart-breakdown { margin-top: var(--space-4); }
        .chart-breakdown h4 {
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--space-2);
          font-weight: 700;
        }
        .breakdown-grid {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        .breakdown-item {
          background: var(--color-bg-subtle);
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          gap: var(--space-2);
          align-items: center;
          transition: all 0.2s;
          border: 1px solid var(--color-border);
        }
        .breakdown-item:hover {
          background: var(--color-bg-card);
          border-color: var(--color-border-hover);
          color: var(--color-primary-700);
        }
        .breakdown-label {
          font-size: var(--font-size-xs);
          color: inherit;
        }
        .breakdown-value {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: inherit;
        }
        .breakdown-tag {
            font-size: 0.6rem;
            text-transform: uppercase;
            color: var(--color-text-tertiary);
            background: var(--color-bg-panel);
            padding: 2px 6px;
            border-radius: 999px;
            font-weight: 700;
        }
      `}</style>
    </div>
  );
}

export default EarningsChart;
