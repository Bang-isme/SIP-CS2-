import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Executive Palette Colors
const COLORS = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']; // Blue shades for donut ring

function VacationChart({ data, onDrilldown }) {
    const [view, setView] = useState('shareholder');

    // 1. Prepare Donut Data (Shareholders)
    const viewConfig = useMemo(() => {
        const shareholder = [
            { name: 'Non-Shareholders', value: data.byShareholder.nonShareholder.current, fill: '#3b82f6' },
            { name: 'Shareholders', value: data.byShareholder.shareholder.current, fill: '#1e293b' },
        ];

        const genderPalette = ['#10b981', '#f59e0b', '#94a3b8'];
        const gender = Object.entries(data.byGender).map(([name, values], index) => ({
            name,
            value: values.current,
            fill: genderPalette[index % genderPalette.length],
        }));

        const employmentPalette = ['#ef4444', '#64748b'];
        const employment = Object.entries(data.byEmploymentType).map(([name, values], index) => ({
            name,
            value: values.current,
            fill: employmentPalette[index % employmentPalette.length],
        }));

        const ethnicityPalette = ['#94a3b8', '#64748b', '#cbd5f5', '#a5b4fc', '#94a3b8', '#64748b'];
        const ethnicity = Object.entries(data.byEthnicity).map(([name, values], index) => ({
            name,
            value: values.current,
            fill: ethnicityPalette[index % ethnicityPalette.length],
        }));

        return {
            shareholder: { title: 'BY SHAREHOLDER STATUS', data: shareholder },
            gender: { title: 'BY GENDER', data: gender },
            ethnicity: { title: 'BY ETHNICITY', data: ethnicity },
            type: { title: 'BY EMPLOYMENT TYPE', data: employment },
        };
    }, [data]);

    const activeView = viewConfig[view];
    const donutData = activeView?.data || [];
    const totalValue = donutData.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const rankedSegments = useMemo(() => [...donutData].sort((a, b) => b.value - a.value), [donutData]);
    const topSegment = rankedSegments[0];
    const secondSegment = rankedSegments[1];
    const topPercent = totalValue > 0 && topSegment ? (topSegment.value / totalValue) * 100 : null;
    const gapPercent =
        totalValue > 0 && topSegment && secondSegment
            ? ((topSegment.value - secondSegment.value) / totalValue) * 100
            : null;
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
                                    contentStyle={{ borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', boxShadow: 'var(--shadow-lg)' }}
                                    formatter={(val) => `${formatNum(val)} days`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="donut-label">
                            <span className="total-days">{formatNum(totalValue)}</span>
                            <span className="unit">days</span>
                        </div>
                    </div>
                </div>

                {/* Right: Data Lists */}
                <div className="stats-section">
                    <div className="stat-group">
                        <h4 className="section-title">DETAILS</h4>
                        <div className="stat-list">
                            {donutData.map((item) => (
                                <div key={item.name} className="stat-row" onClick={() => handleDrilldown(item.name)}>
                                    <div className="stat-info">
                                        <span className="dot" style={{ background: item.fill }}></span>
                                        <span className="label">{item.name}</span>
                                    </div>
                                    <span className="value">{formatNum(item.value)} days</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="vacation-insights">
                <div className="insight-item">
                    <span className="insight-label">Largest Segment</span>
                    <span className="insight-value">
                        {topSegment
                            ? `${topSegment.name} (${topPercent?.toFixed(1)}%)`
                            : '--'}
                    </span>
                </div>
                <div className="insight-item">
                    <span className="insight-label">Gap vs #2</span>
                    <span className="insight-value">
                        {gapPercent !== null
                            ? `${gapPercent < 0.1 ? '<0.1' : gapPercent.toFixed(1)}% (${secondSegment?.name || 'n/a'}) | ${formatNum(Math.abs(gapAbsolute))} days`
                            : '--'}
                    </span>
                </div>
            </div>

            <style>{`
        .vacation-container { height: 100%; display: flex; flex-direction: column; }
        .vacation-content {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: var(--space-4);
          align-items: center;
          height: 100%;
          min-height: 260px;
        }

        .chart-section {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            width: 100%;
        }

        .vacation-tabs {
            display: flex;
            gap: var(--space-2);
            margin-bottom: var(--space-3);
            flex-wrap: wrap;
        }
        .vacation-tab {
            border: 1px solid var(--color-border);
            background: var(--color-bg-card);
            padding: 4px 10px;
            border-radius: var(--radius-full);
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--color-text-secondary);
            cursor: pointer;
        }
        .vacation-tab.active {
            background: var(--color-primary-700);
            color: white;
            border-color: var(--color-primary-700);
        }
        
        /* Section Titles */
        .section-title {
            font-size: 0.7rem;
            color: var(--color-text-tertiary);
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-bottom: var(--space-4);
            text-transform: uppercase;
        }

        /* Donut Chart */
        .donut-wrapper {
            position: relative;
            margin-bottom: var(--space-3);
            max-width: 280px;
            width: 100%;
        }
        .donut-label {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            pointer-events: none;
        }
        .total-days {
            display: block;
            font-size: 1.65rem;
            font-weight: 700;
            color: var(--color-primary-800);
            line-height: 1;
        }
        .unit {
            font-size: 0.8rem;
            color: var(--color-text-tertiary);
        }

        /* Stats List */
        .stat-group { margin-bottom: var(--space-6); }
        .stat-group:last-child { margin-bottom: 0; }
        
        .stat-list { display: flex; flex-direction: column; gap: var(--space-2); }

        .stats-section {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
            padding: var(--space-3);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            background: var(--color-bg-subtle);
            min-height: 220px;
        }

        .stat-group {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .stats-section .section-title {
            margin-bottom: var(--space-3);
        }
        .stat-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: background 0.2s;
        }
        .stat-row:hover { background: var(--color-bg-subtle); }
        
        .stat-info { display: flex; align-items: center; gap: var(--space-3); }
        
        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: block;
        }
        
        .label {
            font-size: 0.85rem;
            color: var(--color-text-secondary);
        }
        
.value {
            font-weight: 700;
            color: var(--color-primary-900);
            font-size: 0.9rem;
        }

        .vacation-insights {
            margin-top: var(--space-3);
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-border);
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: var(--space-3);
        }
        .insight-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .insight-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-text-tertiary);
            font-weight: 700;
        }
        .insight-value {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--color-primary-900);
        }

        @media (max-width: 1200px) {
            .vacation-content { grid-template-columns: 1fr; }
            .donut-wrapper { max-width: 300px; margin: 0 auto; }
            .vacation-insights { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
}

export default VacationChart;

