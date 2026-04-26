import { memo, useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FiTarget, FiTrendingUp } from 'react-icons/fi';
import { formatNumber } from '../utils/formatters';
import { getChartTheme } from '../utils/chartTheme';
import './VacationChart.css';

function VacationChart({ data, departmentScope = '', onDrilldown }) {
    const [view, setView] = useState('shareholder');
    const tabRefs = useRef([]);
    const theme = useMemo(() => getChartTheme(), []);
    const sortSegments = (segments) => [...segments].sort((left, right) => right.value - left.value);

    const shareholder = sortSegments([
        {
            name: 'Non-Shareholders',
            value: data.byShareholder.nonShareholder.current,
            previous: data.byShareholder.nonShareholder.previous,
            fill: theme.earningsMid,
        },
        {
            name: 'Shareholders',
            value: data.byShareholder.shareholder.current,
            previous: data.byShareholder.shareholder.previous,
            fill: theme.vacation,
        },
    ]);

    const gender = useMemo(() => {
        const genderPalette = [theme.vacation, theme.alerts, theme.benefits];
        return sortSegments(Object.entries(data.byGender).map(([name, values], index) => ({
        name,
        value: values.current,
        previous: values.previous,
        fill: genderPalette[index % genderPalette.length],
        })));
    }, [data.byGender, theme.alerts, theme.benefits, theme.vacation]);

    const employment = useMemo(() => {
        const employmentPalette = [theme.earnings, theme.pink];
        return sortSegments(Object.entries(data.byEmploymentType).map(([name, values], index) => ({
        name,
        value: values.current,
        previous: values.previous,
        fill: employmentPalette[index % employmentPalette.length],
        })));
    }, [data.byEmploymentType, theme.earnings, theme.pink]);

    const ethnicity = useMemo(() => {
        const ethnicityPalette = [theme.earnings, theme.vacation, theme.alerts, theme.birthday, theme.benefits, theme.cyan];
        return sortSegments(Object.entries(data.byEthnicity).map(([name, values], index) => ({
        name,
        value: values.current,
        previous: values.previous,
        fill: ethnicityPalette[index % ethnicityPalette.length],
        })));
    }, [data.byEthnicity, theme.alerts, theme.benefits, theme.birthday, theme.cyan, theme.earnings, theme.vacation]);

    const viewConfig = {
        shareholder: { title: 'Shareholder', data: shareholder },
        gender: { title: 'Gender', data: gender },
        ethnicity: { title: 'Ethnicity', data: ethnicity },
        type: { title: 'Type', data: employment },
    };

    const activeView = viewConfig[view];
    const donutData = activeView?.data || [];
    const totalValue = donutData.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const previousTotalValue = donutData.reduce((acc, curr) => acc + (curr.previous || 0), 0);
    const rankedSegments = donutData;
    const displayMode = donutData.length <= 5 ? 'composition' : 'ranked';
    const topSegment = rankedSegments[0];
    const secondSegment = rankedSegments[1];
    const detailSegments = displayMode === 'composition'
        ? rankedSegments
        : rankedSegments.slice(0, Math.min(4, rankedSegments.length));
    const maxSegmentValue = rankedSegments[0]?.value || 0;
    const topPercent = totalValue > 0 && topSegment ? (topSegment.value / totalValue) * 100 : null;
    const totalDelta = totalValue - previousTotalValue;
    const hasPreviousBaseline = previousTotalValue > 0;
    const totalDeltaLabel = previousTotalValue > 0
        ? `${totalDelta >= 0 ? '+' : '-'}${Math.abs((totalDelta / previousTotalValue) * 100).toFixed(1)}% vs PY`
        : 'No PY baseline';
    const gapAbsolute =
        topSegment && secondSegment
            ? topSegment.value - secondSegment.value
            : null;

    const formatNum = formatNumber;
    const handleDrilldown = (name) => {
        if (!onDrilldown) return;
        if (view === 'shareholder') {
            onDrilldown({ isShareholder: name === 'Shareholders' ? 'true' : 'false' });
            return;
        }
        if (view === 'gender') {
            onDrilldown({ gender: name });
            return;
        }
        if (view === 'ethnicity') {
            onDrilldown({ ethnicity: name });
            return;
        }
        if (view === 'type') {
            onDrilldown({ employmentType: name });
        }
    };

    const tabConfig = [
        { key: 'shareholder', label: 'Shareholder' },
        { key: 'gender', label: 'Gender' },
        { key: 'ethnicity', label: 'Ethnicity' },
        { key: 'type', label: 'Type' },
    ];

    const handleTabKeyDown = (event, currentIndex) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();

        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % tabConfig.length;
        } else if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + tabConfig.length) % tabConfig.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = tabConfig.length - 1;
        }

        tabRefs.current[nextIndex]?.focus();
        setView(tabConfig[nextIndex].key);
    };

    return (
        <div className="vacation-container animate-enter">
            <div className="vacation-content">
                {/* Left: Donut Chart */}
                <div className="chart-section">
                    <div className="vacation-tabs" role="tablist" aria-label="Time-off demographic view">
                        {tabConfig.map((tab, index) => (
                            <button
                                key={tab.key}
                                ref={(node) => {
                                    tabRefs.current[index] = node;
                                }}
                                role="tab"
                                id={`vacation-tab-${tab.key}`}
                                aria-controls={`vacation-panel-${tab.key}`}
                                aria-selected={view === tab.key}
                                tabIndex={view === tab.key ? 0 : -1}
                                className={`vacation-tab ${view === tab.key ? 'active' : ''}`}
                                onClick={() => setView(tab.key)}
                                onKeyDown={(event) => handleTabKeyDown(event, index)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <h4 className="section-title">{activeView?.title}</h4>
                    <div className="vacation-view-mode" aria-live="polite">
                        <span className="vacation-meta-pill vacation-meta-pill--mode">
                            {displayMode === 'composition' ? 'Composition' : 'Ranked'}
                        </span>
                        {departmentScope ? (
                            <span className="vacation-meta-pill vacation-meta-pill--scope">{departmentScope} scope</span>
                        ) : null}
                    </div>
                    <div
                        className="donut-wrapper"
                        role="tabpanel"
                        id={`vacation-panel-${view}`}
                        aria-labelledby={`vacation-tab-${view}`}
                    >
                        {displayMode === 'composition' ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                            paddingAngle={2}
                                            cornerRadius={4}
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.fill}
                                                    stroke="none"
                                                    style={{ outline: 'none', cursor: 'pointer' }}
                                                    onClick={() => handleDrilldown(entry.name)}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            position={{ x: 12, y: 8 }}
                                            wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
                                            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                                            contentStyle={{
                                                borderRadius: '10px',
                                                border: '1px solid var(--color-border)',
                                                background: 'var(--color-bg-card)',
                                                boxShadow: 'var(--shadow-lg)',
                                            }}
                                            itemStyle={{ color: 'var(--color-text-main)', fontWeight: 700 }}
                                            labelStyle={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}
                                            formatter={(val) => `${formatNum(val)} days`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="donut-label">
                                    <span className="total-days">{formatNum(totalValue)}</span>
                                    <span className="unit">days</span>
                                    <span className="donut-subtext">PY {formatNum(previousTotalValue)} days</span>
                                </div>
                            </>
                        ) : (
                            <div className="ranked-bars" role="list" aria-label={`${activeView?.title} ranked comparison`}>
                                {rankedSegments.map((item) => {
                                    const width = maxSegmentValue > 0 ? `${Math.max(10, (item.value / maxSegmentValue) * 100)}%` : '10%';
                                    const share = totalValue > 0 ? `${((item.value / totalValue) * 100).toFixed(1)}%` : '0.0%';

                                    return (
                                        <button
                                            key={item.name}
                                            type="button"
                                            className="ranked-bar-row"
                                            onClick={() => handleDrilldown(item.name)}
                                            aria-label={`Open drilldown for ${item.name}`}
                                        >
                                            <div className="ranked-bar-row__meta">
                                                <span className="dot" style={{ background: item.fill }}></span>
                                                <span className="label">{item.name}</span>
                                                <span className="ranked-bar-row__share">{share}</span>
                                            </div>
                                            <div className="ranked-bar-track">
                                                <span className="ranked-bar-fill" style={{ width, background: item.fill }}></span>
                                            </div>
                                            <span className="ranked-bar-row__value">{formatNum(item.value)} days</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Data Lists */}
                <div className="stats-section">
                        <div className="stat-group">
                            <h4 className="section-title">Segments</h4>
                            <div className="stat-list">
                            {detailSegments.map((item) => {
                                const share = totalValue > 0 ? `${((item.value / totalValue) * 100).toFixed(1)}%` : '0.0%';
                                return (
                                <button
                                    type="button"
                                    key={item.name}
                                    className="stat-row"
                                    onClick={() => handleDrilldown(item.name)}
                                    aria-label={`Open drilldown for ${item.name}`}
                                >
                                    <div className="stat-info">
                                        <span className="dot" style={{ background: item.fill }}></span>
                                        <span className="label">{item.name}</span>
                                    </div>
                                    <span className="value-stack">
                                        <span className="value">{formatNum(item.value)} days</span>
                                        <span className="value-subtext">{share} | PY {formatNum(item.previous || 0)} days</span>
                                    </span>
                                </button>
                                );
                            })}
                            </div>
                        <div className="stats-highlight" aria-label="Quick insights">
                            <button
                                type="button"
                                className="highlight-card"
                                onClick={() => topSegment && handleDrilldown(topSegment.name)}
                                aria-label="Open top segment drilldown"
                                disabled={!topSegment}
                            >
                                <span className="highlight-icon" aria-hidden="true"><FiTarget size={14} /></span>
                                <div className="highlight-content">
                                    <span className="highlight-label">Leader</span>
                                    <span className="highlight-value">
                                        {topSegment ? `${topSegment.name} · ${topPercent?.toFixed(1)}%` : '--'}
                                    </span>
                                </div>
                            </button>
                            <div className="highlight-card">
                                <span className="highlight-icon" aria-hidden="true"><FiTrendingUp size={14} /></span>
                                <div className="highlight-content">
                                    <span className="highlight-label">{hasPreviousBaseline ? 'Change' : 'Baseline'}</span>
                                    <span className="highlight-value">{totalDeltaLabel}</span>
                                    <span className="highlight-meta">
                                        {gapAbsolute !== null
                                            ? `${hasPreviousBaseline ? 'Gap #2' : 'Lead margin'}: ${formatNum(Math.abs(gapAbsolute))} days`
                                            : 'Single segment view'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(VacationChart);
