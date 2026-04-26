import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { formatCurrencyCompact } from '../utils/formatters';
import { getChartTheme } from '../utils/chartTheme';
import './EarningsChart.css';

const MOVERS_TAB_CONFIG = [
  { key: 'declines', label: 'Declines' },
  { key: 'smallest', label: 'Smallest Growth' },
];

const buildSeriesRows = (source = {}) => {
  return Object.entries(source || {}).map(([name, values]) => ({
    name,
    current: Number(values?.current || 0),
    previous: Number(values?.previous || 0),
  }));
};

function EarningsChart({ data, departmentScope = '', onDrilldown }) {
  const departmentRows = useMemo(() => buildSeriesRows(data.byDepartment), [data.byDepartment]);
  const employmentRows = useMemo(() => buildSeriesRows(data.byEmploymentType), [data.byEmploymentType]);
  const genderRows = useMemo(() => buildSeriesRows(data.byGender), [data.byGender]);

  const primaryBreakdown = useMemo(() => {
    if (!departmentScope && departmentRows.length > 0) {
      return {
        filterKey: 'department',
        rows: departmentRows,
        sectionTitle: 'Top Departments',
        scopeLabel: 'current payroll',
        emptyDetail: 'No department-level payroll data',
        buildFilters: (name) => ({ department: name }),
      };
    }
    if (employmentRows.length > 0) {
      return {
        filterKey: 'employmentType',
        rows: employmentRows,
        sectionTitle: 'Segments',
        scopeLabel: departmentScope || 'the current scope',
        emptyDetail: 'No scoped payroll mix data',
        buildFilters: (name) => ({ employmentType: name }),
      };
    }
    if (genderRows.length > 0) {
      return {
        filterKey: 'gender',
        rows: genderRows,
        sectionTitle: 'Segments',
        scopeLabel: departmentScope || 'the current scope',
        emptyDetail: 'No scoped payroll mix data',
        buildFilters: (name) => ({ gender: name }),
      };
    }
    return {
      filterKey: 'department',
      rows: [],
      sectionTitle: 'Primary breakdown',
      scopeLabel: departmentScope || 'the current scope',
      emptyDetail: 'No payroll breakdown is available for this scope',
      buildFilters: () => ({}),
    };
  }, [departmentRows, departmentScope, employmentRows, genderRows]);

  const chartData = useMemo(() => {
    return primaryBreakdown.rows.map(({ name, current, previous }) => ({
      name,
      current: Math.round(current),
      previous: Math.round(previous),
    }));
  }, [primaryBreakdown.rows]);

  const deltas = useMemo(() => {
    return primaryBreakdown.rows.map(({ name, current, previous }) => {
      const diff = current - previous;
      const percent = previous > 0 ? (diff / previous) * 100 : null;
      return { name, current, previous, diff, percent };
    });
  }, [primaryBreakdown.rows]);

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
  const totalCurrentPayroll = useMemo(
    () => deltas.reduce((sum, item) => sum + item.current, 0),
    [deltas],
  );

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
          leadSharePct: total > 0 ? (lead.value / total) * 100 : 0,
        };
      }
      const gap = lead.value - second.value;
      return {
        lead,
        second,
        gap,
        gapPct: total > 0 ? (gap / total) * 100 : 0,
        leadSharePct: total > 0 ? (lead.value / total) * 100 : 0,
      };
    };

    return {
      gender: buildSignal(toSeries(data.byGender)),
      ethnicity: buildSignal(toSeries(data.byEthnicity)),
      employment: buildSignal(toSeries(data.byEmploymentType)),
    };
  }, [data]);
  const excludedWorkforceSignal = primaryBreakdown.filterKey === 'employmentType'
    ? 'employment'
    : primaryBreakdown.filterKey === 'gender'
      ? 'gender'
      : primaryBreakdown.filterKey === 'ethnicity'
        ? 'ethnicity'
        : null;
  const workforceSignal = useMemo(() => {
    const entries = [
      categorySignals.gender
        ? {
          key: 'gender',
          label: 'gender mix',
          lead: categorySignals.gender.lead,
          second: categorySignals.gender.second,
          leadSharePct: categorySignals.gender.leadSharePct,
          gapPct: categorySignals.gender.gapPct,
          filters: { gender: categorySignals.gender.lead.name },
        }
        : null,
      categorySignals.ethnicity
        ? {
          key: 'ethnicity',
          label: 'ethnicity mix',
          lead: categorySignals.ethnicity.lead,
          second: categorySignals.ethnicity.second,
          leadSharePct: categorySignals.ethnicity.leadSharePct,
          gapPct: categorySignals.ethnicity.gapPct,
          filters: { ethnicity: categorySignals.ethnicity.lead.name },
        }
        : null,
      categorySignals.employment
        ? {
          key: 'employment',
          label: 'employment mix',
          lead: categorySignals.employment.lead,
          second: categorySignals.employment.second,
          leadSharePct: categorySignals.employment.leadSharePct,
          gapPct: categorySignals.employment.gapPct,
          filters: { employmentType: categorySignals.employment.lead.name },
        }
        : null,
    ].filter(Boolean);

    const filteredEntries = excludedWorkforceSignal
      ? entries.filter((item) => item.key !== excludedWorkforceSignal)
      : entries;

    return (filteredEntries.length > 0 ? filteredEntries : entries)
      .sort((left, right) => right.gapPct - left.gapPct)[0] || null;
  }, [categorySignals, excludedWorkforceSignal]);
  const breakdownGroups = useMemo(() => {
    const groups = [
      {
        key: 'gender',
        title: 'Gender',
        icon: FiUsers,
        rows: Object.entries(data.byGender).map(([name, values]) => ({
          key: name,
          label: name,
          current: values.current,
          previous: values.previous,
          filters: { gender: name },
        })),
        footerLabel: 'Lead',
        footerValue: categorySignals.gender
          ? `${categorySignals.gender.lead.name} · ${categorySignals.gender.leadSharePct.toFixed(1)}% share`
          : '',
      },
      {
        key: 'ethnicity',
        title: 'Ethnicity',
        icon: FiGlobe,
        rows: Object.entries(data.byEthnicity).map(([name, values]) => ({
          key: name,
          label: name,
          current: values.current,
          previous: values.previous,
          filters: { ethnicity: name },
        })),
        footerLabel: 'Lead',
        footerValue: categorySignals.ethnicity
          ? `${categorySignals.ethnicity.lead.name} · ${categorySignals.ethnicity.leadSharePct.toFixed(1)}% share`
          : '',
      },
      {
        key: 'employmentType',
        title: 'Employment Type',
        icon: FiBriefcase,
        rows: Object.entries(data.byEmploymentType).map(([name, values]) => ({
          key: name,
          label: name,
          current: values.current,
          previous: values.previous,
          filters: { employmentType: name },
        })),
        footerLabel: 'Lead',
        footerValue: categorySignals.employment
          ? `${categorySignals.employment.lead.name} · ${categorySignals.employment.leadSharePct.toFixed(1)}% share`
          : '',
      },
    ];

    return groups.filter((group) => group.key !== primaryBreakdown.filterKey && group.rows.length > 0);
  }, [categorySignals.employment, categorySignals.ethnicity, categorySignals.gender, data.byEmploymentType, data.byEthnicity, data.byGender, primaryBreakdown.filterKey]);
  const topPayrollLead = topDepartments[0] || null;
  const topPayrollShare = topPayrollLead && totalCurrentPayroll > 0
    ? (topPayrollLead.current / totalCurrentPayroll) * 100
    : 0;
  const strongestMovement = useMemo(() => {
    const candidates = [insights.topGrowth, insights.biggestDecline].filter(Boolean);
    return candidates.sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff))[0] || null;
  }, [insights.biggestDecline, insights.topGrowth]);
  const showPrimaryBreakdownPanel = !departmentScope && topDepartments.length > 0;

  const hasDeclines = movers.drops.length > 0;
  const [moversMode, setMoversMode] = useState(hasDeclines ? 'declines' : 'smallest');
  const moversTabRefs = useRef([]);
  const pendingMoverFocusRef = useRef(false);


  const theme = useMemo(() => getChartTheme(), []);
  const formatCurrency = formatCurrencyCompact;

  const handleClick = (row) => {
    if (row && onDrilldown) {
      onDrilldown(primaryBreakdown.buildFilters(row.fullName || row.name));
    }
  };

  const handleMoversTabKeyDown = (event, currentIndex) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % MOVERS_TAB_CONFIG.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + MOVERS_TAB_CONFIG.length) % MOVERS_TAB_CONFIG.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = MOVERS_TAB_CONFIG.length - 1;
    }

    pendingMoverFocusRef.current = true;
    setMoversMode(MOVERS_TAB_CONFIG[nextIndex].key);
  };

  useEffect(() => {
    if (!pendingMoverFocusRef.current) return;
    const activeIndex = MOVERS_TAB_CONFIG.findIndex((tab) => tab.key === moversMode);
    if (activeIndex >= 0) {
      moversTabRefs.current[activeIndex]?.focus();
    }
    pendingMoverFocusRef.current = false;
  }, [moversMode]);

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

      <ResponsiveContainer width="100%" height={216}>
        <BarChart data={chartData} onClick={(e) => e && handleClick(e.activePayload?.[0]?.payload)}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
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
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
          <Bar dataKey="current" name="Current Year" fill={theme.earnings} radius={[6, 6, 0, 0]} maxBarSize={48} cursor="pointer" />
          <Bar dataKey="previous" name="Previous Year" fill={theme.earningsLight} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>

      <div className="insights-panel" aria-label="Earnings narrative">
        <article className="insight-card insight-card--actionable">
          <div className="insight-head">
            <span className="insight-icon focus" aria-hidden="true"><FiActivity size={14} /></span>
            <span className="insight-label">Payroll lead</span>
          </div>
          <span className="insight-value">
            {topPayrollLead ? topPayrollLead.name : 'No payroll leader yet'}
          </span>
          <span className="insight-detail">
            {topPayrollLead
              ? `${topPayrollShare.toFixed(1)}% of payroll`
              : primaryBreakdown.emptyDetail}
          </span>
          <span className="insight-note">
            {topPayrollLead ? formatCurrency(topPayrollLead.current) : 'No current payroll total'}
          </span>
          <button
            type="button"
            className="insight-action"
            aria-label="Open payroll lead drilldown"
            onClick={() => topPayrollLead && onDrilldown?.(primaryBreakdown.buildFilters(topPayrollLead.name))}
            disabled={!topPayrollLead}
          >
            Open lead
          </button>
        </article>
        <article className="insight-card insight-card--actionable">
          <div className="insight-head">
            <span
              className={`insight-icon ${strongestMovement?.diff >= 0 ? 'pos' : 'neg'}`}
              aria-hidden="true"
            >
              {strongestMovement?.diff >= 0 ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
            </span>
            <span className="insight-label">Strongest movement</span>
          </div>
          <span className="insight-value">
            {strongestMovement ? strongestMovement.name : 'No year-over-year movement yet'}
          </span>
          <span className={`insight-delta ${strongestMovement?.diff >= 0 ? 'pos' : 'neg'}`}>
            <span className="delta-label">{strongestMovement?.diff >= 0 ? 'Change:' : 'Headwind:'}</span>{' '}
            {strongestMovement
              ? `${strongestMovement.diff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(strongestMovement.diff))}`
              : '--'}
            {strongestMovement?.percent !== null && strongestMovement?.percent !== undefined
              ? ` (${strongestMovement.percent >= 0 ? '+' : ''}${strongestMovement.percent.toFixed(1)}%)`
              : ''}
          </span>
          <span className="insight-note">
            {strongestMovement
              ? strongestMovement.diff >= 0
                ? 'Largest increase vs PY'
                : 'Largest decline vs PY'
              : 'No comparison available'}
          </span>
          <button
            type="button"
            className="insight-action"
            aria-label="Open movement drilldown"
            onClick={() => strongestMovement && onDrilldown?.(primaryBreakdown.buildFilters(strongestMovement.name))}
            disabled={!strongestMovement}
          >
            Open movement
          </button>
        </article>
        <article className="insight-card insight-card--actionable">
          <div className="insight-head">
            <span className="insight-icon neutral" aria-hidden="true"><FiUsers size={14} /></span>
            <span className="insight-label">Workforce concentration</span>
          </div>
          <span className="insight-value">
            {workforceSignal ? workforceSignal.lead.name : 'No workforce concentration signal yet'}
          </span>
          <span className="insight-detail">
            {workforceSignal
              ? `${workforceSignal.leadSharePct.toFixed(1)}% share`
              : 'No comparison available'}
          </span>
          <span className="insight-note">
            {workforceSignal
              ? `Lead in ${workforceSignal.label}${workforceSignal.second ? ` over ${workforceSignal.second.name}` : ''}`
              : 'No concentration signal'}
          </span>
          <button
            type="button"
            className="insight-action"
            aria-label="Open workforce mix drilldown"
            onClick={() => workforceSignal && onDrilldown?.(workforceSignal.filters)}
            disabled={!workforceSignal}
          >
            Open mix
          </button>
        </article>
      </div>

      <div className="earnings-advanced-panel">
        {showPrimaryBreakdownPanel ? (
        <div className="dept-summary data-surface">
          <h3 className="dept-title">
            <FiActivity size={13} aria-hidden="true" />
            <span>{primaryBreakdown.sectionTitle}</span>
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
        ) : null}

        <div className={`movers-panel data-surface${showPrimaryBreakdownPanel ? '' : ' movers-panel--wide'}`}>
          <div className="movers-header">
            <h3 className="movers-title">
              <FiActivity size={13} aria-hidden="true" />
              <span>YoY Movers</span>
            </h3>
            <div className="movers-tabs" role="tablist" aria-label="YoY mover view">
              {MOVERS_TAB_CONFIG.map((tab, index) => (
                <button
                  key={tab.key}
                  ref={(node) => {
                    moversTabRefs.current[index] = node;
                  }}
                  role="tab"
                  id={`earnings-movers-tab-${tab.key}`}
                  aria-controls={`earnings-movers-panel-${tab.key}`}
                  aria-selected={moversMode === tab.key}
                  tabIndex={moversMode === tab.key ? 0 : -1}
                  className={`movers-tab ${moversMode === tab.key ? 'active' : ''}`}
                  onClick={() => setMoversMode(tab.key)}
                  onKeyDown={(event) => handleMoversTabKeyDown(event, index)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div
            className="movers-grid"
            role="tabpanel"
            id={`earnings-movers-panel-${moversMode}`}
            aria-labelledby={`earnings-movers-tab-${moversMode}`}
          >
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
            <span>Segments</span>
          </h4>
          <div className="breakdown-groups">
            {breakdownGroups.map((group) => {
              const GroupIcon = group.icon;

              return (
                <div key={group.key} className="breakdown-group">
                  <h4 className="group-title">
                    <GroupIcon size={12} aria-hidden="true" />
                    <span>{group.title}</span>
                  </h4>
                  <div className="group-list">
                    {group.rows.map((row) => (
                      <button
                        type="button"
                        key={row.key}
                        className="breakdown-row"
                        onClick={() => onDrilldown?.(row.filters)}
                        aria-label={`Filter by ${group.title.toLowerCase()} ${row.label}`}
                      >
                        <span className="breakdown-label">{row.label}</span>
                        <span className="breakdown-values">
                          <span className="breakdown-value">{formatCurrency(row.current)}</span>
                          <span className="breakdown-subvalue">PY {formatCurrency(row.previous)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {group.footerValue ? (
                    <div className="group-foot">
                      <span className="group-foot-label">{group.footerLabel}</span>
                      <span className="group-foot-value">{group.footerValue}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(EarningsChart);
