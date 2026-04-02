import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FiActivity, FiTarget, FiTrendingUp } from 'react-icons/fi';
import './VacationChart.css';

function VacationChart({ data, onDrilldown }) {
    const [view, setView] = useState('shareholder');

    // 1. Prepare Donut Data (Shareholders)
    const shareholder = [
        {
            name: 'Non-Shareholders',
            value: data.byShareholder.nonShareholder.current,
            previous: data.byShareholder.nonShareholder.previous,
            fill: '#818cf8',
        },
        {
            name: 'Shareholders',
            value: data.byShareholder.shareholder.current,
            previous: data.byShareholder.shareholder.previous,
            fill: '#0d9488',
        },
    ];

    const genderPalette = ['#0d9488', '#f59e0b', '#8b5cf6'];
    const gender = Object.entries(data.byGender).map(([name, values], index) => ({
        name,
        value: values.current,
        previous: values.previous,
        fill: genderPalette[index % genderPalette.length],
    }));

    const employmentPalette = ['#6366f1', '#f472b6'];
    const employment = Object.entries(data.byEmploymentType).map(([name, values], index) => ({
        name,
        value: values.current,
        previous: values.previous,
        fill: employmentPalette[index % employmentPalette.length],
    }));

    const ethnicityPalette = ['#6366f1', '#0d9488', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const ethnicity = Object.entries(data.byEthnicity).map(([name, values], index) => ({
        name,
        value: values.current,
        previous: values.previous,
        fill: ethnicityPalette[index % ethnicityPalette.length],
    }));

    const viewConfig = {
        shareholder: { title: 'BY SHAREHOLDER STATUS', data: shareholder },
        gender: { title: 'BY GENDER', data: gender },
        ethnicity: { title: 'BY ETHNICITY', data: ethnicity },
        type: { title: 'BY EMPLOYMENT TYPE', data: employment },
    };

    const activeView = viewConfig[view];
    const donutData = activeView?.data || [];
    const totalValue = donutData.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const previousTotalValue = donutData.reduce((acc, curr) => acc + (curr.previous || 0), 0);
    const rankedSegments = [...donutData].sort((a, b) => b.value - a.value);
    const topSegment = rankedSegments[0];
    const secondSegment = rankedSegments[1];
    const topPercent = totalValue > 0 && topSegment ? (topSegment.value / totalValue) * 100 : null;
    const totalDelta = totalValue - previousTotalValue;
    const totalDeltaLabel = previousTotalValue > 0
        ? `${totalDelta >= 0 ? '+' : '-'}${Math.abs((totalDelta / previousTotalValue) * 100).toFixed(1)}% vs PY`
        : 'No PY baseline';
    const gapAbsolute =
        topSegment && secondSegment
            ? topSegment.value - secondSegment.value
            : null;

    const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);
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

    return (
        <div className="vacation-container animate-enter">
            <div className="vacation-content">
                {/* Left: Donut Chart */}
                <div className="chart-section">
                    <div className="vacation-tabs">
                        {[
                            { key: 'shareholder', label: 'Shareholder' },
                            { key: 'gender', label: 'Gender' },
                            { key: 'ethnicity', label: 'Ethnicity' },
                            { key: 'type', label: 'Type' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                className={`vacation-tab ${view === tab.key ? 'active' : ''}`}
                                onClick={() => setView(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <h4 className="section-title">{activeView?.title}</h4>
                    <div className="donut-wrapper">
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
                                        border: '1px solid #d5dff3',
                                        background: '#ffffff',
                                        boxShadow: '0 12px 24px -16px rgba(15, 23, 42, 0.45)',
                                    }}
                                    itemStyle={{ color: 'var(--color-text-main)', fontWeight: 700 }}
                                    labelStyle={{ color: '#64748b', fontWeight: 700 }}
                                    formatter={(val) => `${formatNum(val)} days`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="donut-label">
                            <span className="total-days">{formatNum(totalValue)}</span>
                            <span className="unit">days</span>
                            <span className="donut-subtext">PY {formatNum(previousTotalValue)} days</span>
                        </div>
                    </div>
                </div>

                {/* Right: Data Lists */}
                <div className="stats-section">
                    <div className="stat-group">
                        <h4 className="section-title">DETAILS</h4>
                        <div className="stat-list">
                            {donutData.map((item) => (
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
                                        <span className="value-subtext">PY {formatNum(item.previous || 0)} days</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="stats-highlight" aria-label="Quick insights">
                            <div className="highlight-card">
                                <span className="highlight-icon" aria-hidden="true"><FiTarget size={14} /></span>
                                <div className="highlight-content">
                                    <span className="highlight-label">Top Segment</span>
                                    <span className="highlight-value">
                                        {topSegment ? `${topSegment.name} (${topPercent?.toFixed(1)}%)` : '--'}
                                    </span>
                                </div>
                            </div>
                            <div className="highlight-card">
                                <span className="highlight-icon" aria-hidden="true"><FiTrendingUp size={14} /></span>
                                <div className="highlight-content">
                                    <span className="highlight-label">YoY Delta</span>
                                    <span className="highlight-value">{totalDeltaLabel}</span>
                                    <span className="highlight-meta">
                                        {gapAbsolute !== null ? `Gap to #2: ${formatNum(Math.abs(gapAbsolute))} days` : 'Only one segment in this view'}
                                    </span>
                                </div>
                            </div>
                            <div className="stats-tip">
                                <FiActivity size={13} aria-hidden="true" />
                                <span>Click a segment to open filtered drilldown.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VacationChart;
