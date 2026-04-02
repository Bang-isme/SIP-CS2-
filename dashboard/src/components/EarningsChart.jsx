import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  FiActivity,
  FiArrowDownRight,
  FiArrowUpRight,
  FiBriefcase,
  FiFilter,
  FiGlobe,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import './EarningsChart.css';

function EarningsChart({ data, onDrilldown }) {
  // Transform data for bar chart
  const chartData = Object.entries(data.byDepartment).map(([name, values]) => ({
    name,
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
  const topDepartmentMax = topDepartments[0]?.current || 0;

  const movers = useMemo(() => {
    const gains = [...deltas].filter((item) => item.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5);
    const drops = [...deltas].filter((item) => item.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5);
    const smallestGrowth = [...deltas]
      .filter((item) => item.diff >= 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);
    return { gains, drops, smallestGrowth };
  }, [deltas]);

  const categorySignals = useMemo(() => {
    const toSeries = (source) =>
      Object.entries(source || {}).map(([name, values]) => ({
        name,
        value: Number(values?.current || 0),
      }));

    const buildSignal = (series) => {
      if (!series || series.length === 0) return null;
      const sorted = [...series].sort((a, b) => b.value - a.value);
      const lead = sorted[0];
      const second = sorted[1];
      const total = sorted.reduce((sum, item) => sum + item.value, 0);
      if (!lead) return null;
      if (!second) {
        return {
          lead,
          second: null,
          gap: lead.value,
          gapPct: total > 0 ? (lead.value / total) * 100 : 0,
        };
      }
      const gap = lead.value - second.value;
      return {
        lead,
        second,
        gap,
        gapPct: total > 0 ? (gap / total) * 100 : 0,
      };
    };

    return {
      gender: buildSignal(toSeries(data.byGender)),
      ethnicity: buildSignal(toSeries(data.byEthnicity)),
      employment: buildSignal(toSeries(data.byEmploymentType)),
    };
  }, [data]);

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
      onDrilldown({ department: data.fullName || data.name });
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-stats">
        <div className="stat">
          <span className="stat-label">Shareholders</span>
          <span className="stat-value">{formatCurrency(data.byShareholder.shareholder.current)}</span>
          <span className="stat-subvalue">
            PY {formatCurrency(data.byShareholder.shareholder.previous)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Non-Shareholders</span>
          <span className="stat-value">{formatCurrency(data.byShareholder.nonShareholder.current)}</span>
          <span className="stat-subvalue">
            PY {formatCurrency(data.byShareholder.nonShareholder.previous)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} onClick={(e) => e && handleClick(e.activePayload?.[0]?.payload)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
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
            labelFormatter={(label) => label}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }} />
          <Bar dataKey="current" name="Current Year" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} cursor="pointer" />
          <Bar dataKey="previous" name="Previous Year" fill="#c7ccfe" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>

      <div className="insights-panel">
        <div className="insight-card">
          <div className="insight-head">
            <span className="insight-icon pos" aria-hidden="true"><FiTrendingUp size={14} /></span>
            <span className="insight-label">Top Growth Dept</span>
          </div>
          <span className="insight-value">{insights.topGrowth?.name || 'N/A'}</span>
          <span className={`insight-delta ${insights.topGrowth?.diff >= 0 ? 'pos' : 'neg'}`}>
            <span className="delta-label">
              {insights.topGrowth?.diff >= 0 ? 'Increase:' : 'Decline:'}
            </span>{' '}
            {insights.topGrowth
              ? `${insights.topGrowth.diff >= 0 ? '+' : ''}${formatCurrency(Math.abs(insights.topGrowth.diff))}`
              : '--'}
            {insights.topGrowth?.percent !== null && insights.topGrowth?.percent !== undefined
              ? ` (${insights.topGrowth.percent >= 0 ? '+' : ''}${insights.topGrowth.percent.toFixed(1)}%)`
              : ''}
          </span>
        </div>
        <div className="insight-card">
          <div className="insight-head">
            <span className="insight-icon neg" aria-hidden="true"><FiTrendingDown size={14} /></span>
            <span className="insight-label">Biggest Decline Dept</span>
          </div>
          <span className="insight-value">{insights.biggestDecline?.name || 'N/A'}</span>
          <span className={`insight-delta ${insights.biggestDecline?.diff >= 0 ? 'pos' : 'neg'}`}>
            <span className="delta-label">
              {insights.biggestDecline?.diff >= 0 ? 'Increase:' : 'Decline:'}
            </span>{' '}
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
        <div className="dept-summary data-surface">
          <h3 className="dept-title">
            <FiActivity size={13} aria-hidden="true" />
            <span>Top Departments (Current)</span>
          </h3>
          <div className="dept-table">
            {topDepartments.map((dept, index) => {
              const fillPct = topDepartmentMax > 0 ? Math.max(10, (dept.current / topDepartmentMax) * 100) : 10;
              return (
                <button
                  type="button"
                  key={dept.name}
                  className="dept-row"
                  onClick={() => handleClick({ fullName: dept.name })}
                  aria-label={`Open drilldown for ${dept.name}`}
                  style={{ '--dept-fill': `${fillPct}%` }}
                >
                  <span className="dept-name-wrap">
                    <span className="dept-rank">#{index + 1}</span>
                    <span className="dept-name">{dept.name}</span>
                  </span>
                  <span className="dept-value">{formatCurrency(dept.current)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="movers-panel data-surface">
          <div className="movers-header">
            <h3 className="movers-title">
              <FiActivity size={13} aria-hidden="true" />
              <span>YoY Movers</span>
            </h3>
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
              <h4 className="movers-subtitle">
                <FiArrowUpRight size={13} aria-hidden="true" />
                <span>Top Increases</span>
              </h4>
              {movers.gains.length === 0 ? (
                <div className="movers-empty">No increases</div>
              ) : (
                movers.gains.map((dept) => (
                  <button
                    type="button"
                    key={dept.name}
                    className="mover-row"
                    onClick={() => handleClick({ fullName: dept.name })}
                    aria-label={`Open drilldown for ${dept.name}`}
                  >
                    <span className="mover-name-wrap">
                      <span className="mover-dot pos" aria-hidden="true"></span>
                      <span className="mover-name">{dept.name}</span>
                    </span>
                    <span className="mover-value pos">
                      <span className="mover-prefix">+</span>{formatCurrency(Math.abs(dept.diff))}
                      {dept.percent !== null && dept.percent !== undefined ? ` (${dept.percent.toFixed(1)}%)` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="movers-col">
              <h4 className="movers-subtitle">
                {moversMode === 'declines' ? <FiArrowDownRight size={13} aria-hidden="true" /> : <FiArrowUpRight size={13} aria-hidden="true" />}
                <span>{moversMode === 'declines' ? 'Top Declines' : 'Smallest Growth'}</span>
              </h4>
              {moversMode === 'declines' ? (
                movers.drops.length === 0 ? (
                  <div className="movers-empty">No declines in current period</div>
                ) : (
                  movers.drops.map((dept) => (
                    <button
                      type="button"
                      key={dept.name}
                      className="mover-row"
                      onClick={() => handleClick({ fullName: dept.name })}
                      aria-label={`Open drilldown for ${dept.name}`}
                    >
                      <span className="mover-name-wrap">
                        <span className="mover-dot neg" aria-hidden="true"></span>
                        <span className="mover-name">{dept.name}</span>
                      </span>
                      <span className="mover-value neg">
                        <span className="mover-prefix">-</span>{formatCurrency(Math.abs(dept.diff))}
                        {dept.percent !== null && dept.percent !== undefined ? ` (${dept.percent.toFixed(1)}%)` : ''}
                      </span>
                    </button>
                  ))
                )
              ) : movers.smallestGrowth.length === 0 ? (
                <div className="movers-empty">No data</div>
              ) : (
                movers.smallestGrowth.map((dept) => (
                  <button
                    type="button"
                    key={dept.name}
                    className="mover-row"
                    onClick={() => handleClick({ fullName: dept.name })}
                    aria-label={`Open drilldown for ${dept.name}`}
                  >
                    <span className="mover-name-wrap">
                      <span className="mover-dot pos" aria-hidden="true"></span>
                      <span className="mover-name">{dept.name}</span>
                    </span>
                    <span className="mover-value pos">
                      <span className="mover-prefix">+</span>{formatCurrency(Math.abs(dept.diff))}
                      {dept.percent !== null && dept.percent !== undefined ? ` (${dept.percent.toFixed(1)}%)` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="chart-breakdown data-surface">
          <h4 className="breakdown-title">
            <FiFilter size={13} aria-hidden="true" />
            <span>By Demographics (Click to Filter)</span>
          </h4>
          <div className="breakdown-groups">
            <div className="breakdown-group">
              <h4 className="group-title">
                <FiUsers size={12} aria-hidden="true" />
                <span>Gender</span>
              </h4>
              <div className="group-list">
                {Object.entries(data.byGender).map(([gender, values]) => (
                  <button
                    type="button"
                    key={gender}
                    className="breakdown-row"
                    onClick={() => onDrilldown?.({ gender })}
                    aria-label={`Filter by gender ${gender}`}
                  >
                    <span className="breakdown-label">{gender}</span>
                    <span className="breakdown-values">
                      <span className="breakdown-value">{formatCurrency(values.current)}</span>
                      <span className="breakdown-subvalue">PY {formatCurrency(values.previous)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {categorySignals.gender && (
                <div className="group-foot">
                  <span className="group-foot-label">Lead gap</span>
                  <span className="group-foot-value">
                    {categorySignals.gender.gapPct < 0.1 ? '<0.1' : categorySignals.gender.gapPct.toFixed(1)}%
                    {categorySignals.gender.second ? ` (${categorySignals.gender.second.name})` : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="breakdown-group">
              <h4 className="group-title">
                <FiGlobe size={12} aria-hidden="true" />
                <span>Ethnicity</span>
              </h4>
              <div className="group-list">
                {Object.entries(data.byEthnicity).map(([ethnicity, values]) => (
                  <button
                    type="button"
                    key={ethnicity}
                    className="breakdown-row"
                    onClick={() => onDrilldown?.({ ethnicity })}
                    aria-label={`Filter by ethnicity ${ethnicity}`}
                  >
                    <span className="breakdown-label">{ethnicity}</span>
                    <span className="breakdown-values">
                      <span className="breakdown-value">{formatCurrency(values.current)}</span>
                      <span className="breakdown-subvalue">PY {formatCurrency(values.previous)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {categorySignals.ethnicity && (
                <div className="group-foot">
                  <span className="group-foot-label">Top segment</span>
                  <span className="group-foot-value">{categorySignals.ethnicity.lead.name}</span>
                </div>
              )}
            </div>
            <div className="breakdown-group">
              <h4 className="group-title">
                <FiBriefcase size={12} aria-hidden="true" />
                <span>Employment Type</span>
              </h4>
              <div className="group-list">
                {Object.entries(data.byEmploymentType).map(([type, values]) => (
                  <button
                    type="button"
                    key={type}
                    className="breakdown-row"
                    onClick={() => onDrilldown?.({ employmentType: type })}
                    aria-label={`Filter by employment type ${type}`}
                  >
                    <span className="breakdown-label">{type}</span>
                    <span className="breakdown-values">
                      <span className="breakdown-value">{formatCurrency(values.current)}</span>
                      <span className="breakdown-subvalue">PY {formatCurrency(values.previous)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {categorySignals.employment && (
                <div className="group-foot">
                  <span className="group-foot-label">Lead gap</span>
                  <span className="group-foot-value">
                    {categorySignals.employment.gapPct < 0.1 ? '<0.1' : categorySignals.employment.gapPct.toFixed(1)}%
                    {categorySignals.employment.second ? ` (${categorySignals.employment.second.name})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EarningsChart;

