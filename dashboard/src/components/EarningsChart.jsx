import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function EarningsChart({ data, onDrilldown }) {
  // Transform data for bar chart
  const chartData = Object.entries(data.byDepartment).map(([name, values]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    fullName: name,
    current: Math.round(values.current),
    previous: Math.round(values.previous),
  }));

  const deltas = useMemo(() => {
    return Object.entries(data.byDepartment).map(([name, values]) => {
      const current = Number(values.current || 0);
      const previous = Number(values.previous || 0);
      const diff = current - previous;
      const percent = previous > 0 ? (diff / previous) * 100 : null;
      return { name, current, previous, diff, percent };
    });
  }, [data]);

  const insights = useMemo(() => {
    const sortedDesc = [...deltas].sort((a, b) => b.diff - a.diff);
    const sortedAsc = [...deltas].sort((a, b) => a.diff - b.diff);

    const topGrowth = sortedDesc.find((item) => item.diff > 0) || sortedDesc[0];
    const biggestDecline = sortedAsc.find((item) => item.diff < 0) || sortedAsc[0];

    return { topGrowth, biggestDecline };
  }, [deltas]);

  const topDepartments = useMemo(() => {
    return [...deltas]
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);
  }, [deltas]);

  const movers = useMemo(() => {
    const gains = [...deltas].filter((item) => item.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
    const drops = [...deltas].filter((item) => item.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 3);
    const smallestGrowth = [...deltas]
      .filter((item) => item.diff >= 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);
    return { gains, drops, smallestGrowth };
  }, [deltas]);

  const hasDeclines = movers.drops.length > 0;
  const [moversMode, setMoversMode] = useState(hasDeclines ? 'declines' : 'smallest');


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

      <ResponsiveContainer width="100%" height={260}>
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

      <div className="insights-panel">
        <div className="insight-card">
          <span className="insight-label">Top Growth Dept</span>
          <span className="insight-value">{insights.topGrowth?.name || 'N/A'}</span>
          <span className={`insight-delta ${insights.topGrowth?.diff >= 0 ? 'pos' : 'neg'}`}>
            {insights.topGrowth
              ? `${insights.topGrowth.diff >= 0 ? '+' : ''}${formatCurrency(Math.abs(insights.topGrowth.diff))}`
              : '--'}
            {insights.topGrowth?.percent !== null && insights.topGrowth?.percent !== undefined
              ? ` (${insights.topGrowth.percent >= 0 ? '+' : ''}${insights.topGrowth.percent.toFixed(1)}%)`
              : ''}
          </span>
        </div>
        <div className="insight-card">
          <span className="insight-label">Biggest Decline Dept</span>
          <span className="insight-value">{insights.biggestDecline?.name || 'N/A'}</span>
          <span className={`insight-delta ${insights.biggestDecline?.diff >= 0 ? 'pos' : 'neg'}`}>
            {insights.biggestDecline
              ? `${insights.biggestDecline.diff >= 0 ? '+' : ''}${formatCurrency(Math.abs(insights.biggestDecline.diff))}`
              : '--'}
            {insights.biggestDecline?.percent !== null && insights.biggestDecline?.percent !== undefined
              ? ` (${insights.biggestDecline.percent >= 0 ? '+' : ''}${insights.biggestDecline.percent.toFixed(1)}%)`
              : ''}
          </span>
        </div>
      </div>

      <div className="earnings-advanced-panel">
        <div className="dept-summary">
          <div className="dept-title">Top Departments (Current)</div>
          <div className="dept-table">
            {topDepartments.map((dept) => (
              <div key={dept.name} className="dept-row" onClick={() => handleClick({ fullName: dept.name })}>
                <span className="dept-name">{dept.name}</span>
                <span className="dept-value">{formatCurrency(dept.current)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-breakdown">
          <h4>By Demographics (Click to Filter)</h4>
          <div className="breakdown-groups">
            <div className="breakdown-group">
              <div className="group-title">Gender</div>
              {Object.entries(data.byGender).map(([gender, values]) => (
                <div key={gender} className="breakdown-row" onClick={() => onDrilldown?.({ gender })}>
                  <span className="breakdown-label">{gender}</span>
                  <span className="breakdown-value">{formatCurrency(values.current)}</span>
                </div>
              ))}
            </div>
            <div className="breakdown-group">
              <div className="group-title">Ethnicity</div>
              {Object.entries(data.byEthnicity).map(([ethnicity, values]) => (
                <div key={ethnicity} className="breakdown-row" onClick={() => onDrilldown?.({ ethnicity })}>
                  <span className="breakdown-label">{ethnicity}</span>
                  <span className="breakdown-value">{formatCurrency(values.current)}</span>
                </div>
              ))}
            </div>
            <div className="breakdown-group">
              <div className="group-title">Employment Type</div>
              {Object.entries(data.byEmploymentType).map(([type, values]) => (
                <div key={type} className="breakdown-row" onClick={() => onDrilldown?.({ employmentType: type })}>
                  <span className="breakdown-label">{type}</span>
                  <span className="breakdown-value">{formatCurrency(values.current)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="movers-panel">
          <div className="movers-header">
            <div className="movers-title">YoY Movers</div>
            <div className="movers-tabs">
              <button
                className={`movers-tab ${moversMode === 'declines' ? 'active' : ''}`}
                onClick={() => setMoversMode('declines')}
              >
                Declines
              </button>
              <button
                className={`movers-tab ${moversMode === 'smallest' ? 'active' : ''}`}
                onClick={() => setMoversMode('smallest')}
              >
                Smallest Growth
              </button>
            </div>
          </div>
          <div className="movers-grid">
            <div className="movers-col">
              <div className="movers-subtitle">Top Increases</div>
              {movers.gains.length === 0 ? (
                <div className="movers-empty">No increases</div>
              ) : (
                movers.gains.map((dept) => (
                  <div key={dept.name} className="mover-row" onClick={() => handleClick({ fullName: dept.name })}>
                    <span className="mover-name">{dept.name}</span>
                    <span className="mover-value pos">
                      +{formatCurrency(Math.abs(dept.diff))}
                      {dept.percent !== null && dept.percent !== undefined ? ` (${dept.percent.toFixed(1)}%)` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="movers-col">
              <div className="movers-subtitle">
                {moversMode === 'declines' ? 'Top Declines' : 'Smallest Growth'}
              </div>
              {moversMode === 'declines' ? (
                movers.drops.length === 0 ? (
                  <div className="movers-empty">No declines in current period</div>
                ) : (
                  movers.drops.map((dept) => (
                    <div key={dept.name} className="mover-row" onClick={() => handleClick({ fullName: dept.name })}>
                      <span className="mover-name">{dept.name}</span>
                      <span className="mover-value neg">
                        -{formatCurrency(Math.abs(dept.diff))}
                        {dept.percent !== null && dept.percent !== undefined ? ` (${dept.percent.toFixed(1)}%)` : ''}
                      </span>
                    </div>
                  ))
                )
              ) : movers.smallestGrowth.length === 0 ? (
                <div className="movers-empty">No data</div>
              ) : (
                movers.smallestGrowth.map((dept) => (
                  <div key={dept.name} className="mover-row" onClick={() => handleClick({ fullName: dept.name })}>
                    <span className="mover-name">{dept.name}</span>
                    <span className="mover-value pos">
                      +{formatCurrency(Math.abs(dept.diff))}
                      {dept.percent !== null && dept.percent !== undefined ? ` (${dept.percent.toFixed(1)}%)` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .chart-container { margin-top: 0; }
        .chart-stats {
          display: flex;
          gap: var(--space-6);
          margin-bottom: var(--space-3);
          padding-bottom: var(--space-3);
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
        .chart-breakdown { margin-top: var(--space-3); }
        .chart-breakdown h4 {
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--space-2);
          font-weight: 700;
        }
        .breakdown-groups {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-3);
        }
        .breakdown-group {
          background: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .group-title {
          font-size: 0.72rem;
          text-transform: uppercase;
          color: var(--color-text-tertiary);
          letter-spacing: 0.08em;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .breakdown-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px dashed var(--color-border);
          cursor: pointer;
        }
        .breakdown-row:last-child {
          border-bottom: none;
        }
        .breakdown-row:hover {
          color: var(--color-primary-700);
        }
        .breakdown-label {
          font-size: var(--font-size-xs);
          color: inherit;
        }
        .breakdown-value {
          font-size: var(--font-size-xs);
          font-weight: 700;
          font-family: var(--font-family-mono);
          color: inherit;
        }

        .insights-panel {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-3);
          margin-top: var(--space-3);
        }
        .earnings-advanced-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .insight-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-3);
          background: var(--color-bg-subtle);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .insight-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          font-weight: 700;
        }
        .insight-value {
          font-size: var(--font-size-sm);
          font-weight: 700;
          color: var(--color-primary-900);
        }
        .insight-delta {
          font-size: var(--font-size-xs);
          font-family: var(--font-family-mono);
        }
        .insight-delta.pos { color: var(--color-success); }
        .insight-delta.neg { color: var(--color-danger); }

        .dept-summary {
          margin-top: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-3);
          background: var(--color-bg-subtle);
        }
        .dept-title {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        .dept-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dept-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px dashed var(--color-border);
          cursor: pointer;
        }
        .dept-row:last-child {
          border-bottom: none;
        }
        .dept-row:hover {
          color: var(--color-primary-700);
        }
        .dept-name {
          font-size: var(--font-size-xs);
        }
        .dept-value {
          font-size: var(--font-size-xs);
          font-weight: 700;
          font-family: var(--font-family-mono);
        }

        .movers-panel {
          margin-top: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-3);
          background: var(--color-bg-subtle);
        }
        .movers-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
        }
        .movers-title {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          font-weight: 700;
          margin: 0;
        }
        .movers-tabs {
          display: flex;
          gap: var(--space-2);
        }
        .movers-tab {
          border: 1px solid var(--color-border);
          background: var(--color-bg-card);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .movers-tab.active {
          background: var(--color-primary-700);
          color: white;
          border-color: var(--color-primary-700);
        }
        .movers-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .movers-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-3);
        }
        .movers-subtitle {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          font-weight: 700;
          margin-bottom: 4px;
        }
        .mover-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px dashed var(--color-border);
          cursor: pointer;
        }
        .mover-row:last-child {
          border-bottom: none;
        }
        .mover-row:hover {
          color: var(--color-primary-700);
        }
        .mover-name {
          font-size: var(--font-size-xs);
        }
        .mover-value {
          font-size: var(--font-size-xs);
          font-weight: 700;
          font-family: var(--font-family-mono);
        }
        .mover-value.pos { color: var(--color-success); }
        .mover-value.neg { color: var(--color-danger); }
        .movers-empty {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
        }

        @media (max-width: 1200px) {
          .breakdown-groups {
            grid-template-columns: 1fr;
          }
          .insights-panel {
            grid-template-columns: 1fr;
          }
          .movers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default EarningsChart;

