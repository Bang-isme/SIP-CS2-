import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Executive Palette Colors
const COLORS = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']; // Blue shades for donut ring

function VacationChart({ data, onDrilldown }) {
    // 1. Prepare Donut Data (Shareholders)
    const donutData = [
        { name: 'Non-Shareholders', value: data.byShareholder.nonShareholder.current, fill: '#3b82f6' }, // Bright Blue
        { name: 'Shareholders', value: data.byShareholder.shareholder.current, fill: '#1e293b' }, // Dark Slate
    ];

    // 2. Prepare List Data (Gender & Employment)
    const genderData = Object.entries(data.byGender).map(([name, values]) => ({
        name,
        value: values.current,
        color: name === 'Female' ? '#10b981' : '#f59e0b' // Green / Amber
    }));

    const employmentData = Object.entries(data.byEmploymentType).map(([name, values]) => ({
        name,
        value: values.current,
        color: name === 'Full-time' ? '#ef4444' : '#64748b' // Red / Slate
    }));

    const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

    return (
        <div className="vacation-container animate-enter">
            <div className="vacation-content">
                {/* Left: Donut Chart */}
                <div className="chart-section">
                    <h4 className="section-title">BY SHAREHOLDER STATUS</h4>
                    <div className="donut-wrapper">
                        <ResponsiveContainer width="100%" height={240}>
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
                                            onClick={() => onDrilldown?.({ isShareholder: entry.name === 'Shareholders' ? 'true' : 'false' })}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                                    formatter={(val) => `${formatNum(val)} days`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="donut-label">
                            <span className="total-days">{formatNum(data.totals.current)}</span>
                            <span className="unit">days</span>
                        </div>
                    </div>
                    {/* Custom Legend */}
                    <div className="custom-legend">
                        {donutData.map((item, i) => (
                            <div key={i} className="legend-item" onClick={() => onDrilldown?.({ isShareholder: item.name === 'Shareholders' ? 'true' : 'false' })}>
                                <span className="dot" style={{ background: item.fill }}></span>
                                <span className="name">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Data Lists */}
                <div className="stats-section">
                    {/* Gender & Ethnicity Stats */}
                    <div className="stat-group">
                        <h4 className="section-title">BY DEMOGRAPHICS</h4>
                        <div className="stat-list">
                            {genderData.map((item) => (
                                <div key={item.name} className="stat-row" onClick={() => onDrilldown?.({ gender: item.name })}>
                                    <div className="stat-info">
                                        <span className="dot" style={{ background: item.color }}></span>
                                        <span className="label">{item.name}</span>
                                    </div>
                                    <span className="value">{formatNum(item.value)}</span>
                                </div>
                            ))}
                            {/* Ethnicity */}
                            <div className="separator"></div>
                            {Object.entries(data.byEthnicity).map(([name, values], i) => (
                                <div key={name} className="stat-row" onClick={() => onDrilldown?.({ ethnicity: name })}>
                                    <div className="stat-info">
                                        <span className="dot" style={{ background: '#94a3b8' }}></span>
                                        <span className="label">{name}</span>
                                    </div>
                                    <span className="value">{formatNum(values.current)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Employment Stats */}
                    <div className="stat-group">
                        <h4 className="section-title">BY EMPLOYMENT TYPE</h4>
                        <div className="stat-list">
                            {employmentData.map((item) => (
                                <div key={item.name} className="stat-row" onClick={() => onDrilldown?.({ employmentType: item.name })}>
                                    <div className="stat-info">
                                        <span className="dot" style={{ background: item.color }}></span>
                                        <span className="label">{item.name}</span>
                                    </div>
                                    <span className="value">{formatNum(item.value)} days</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .vacation-container { height: 100%; display: flex; flex-direction: column; }
        .vacation-content {
          display: grid;
          grid-template-columns: 4fr 5fr;
          gap: var(--space-6);
          align-items: center;
          height: 100%;
        }
        
        /* Section Titles */
        .section-title {
            font-size: 0.7rem;
            color: var(--color-text-tertiary);
            font-weight: 700;
            letter-spacing: 0.05em;
            margin-bottom: var(--space-4);
            /* text-transform: uppercase; */
        }

        /* Donut Chart */
        .donut-wrapper {
            position: relative;
            margin-bottom: var(--space-4);
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
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-primary-800);
            line-height: 1;
        }
        .unit {
            font-size: 0.85rem;
            color: var(--color-text-secondary);
        }

        /* Custom Legend */
        .custom-legend {
            display: flex;
            justify-content: center;
            gap: var(--space-4);
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            color: var(--color-text-secondary);
            transition: opacity 0.2s;
        }
        .legend-item:hover { opacity: 0.7; }

        /* Stats List */
        .stat-group { margin-bottom: var(--space-6); }
        .stat-group:last-child { margin-bottom: 0; }
        
        .stat-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .separator { height: 1px; background: var(--color-border); margin: var(--space-2) 0; }
        
        .stat-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
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
            font-size: 0.9rem;
            color: var(--color-text-secondary);
        }
        
.value {
            font-weight: 600;
            color: var(--color-primary-900);
            font-size: 0.95rem;
        }

        @media (max-width: 1200px) {
            .vacation-content { grid-template-columns: 1fr; }
            .donut-wrapper { max-width: 300px; margin: 0 auto; }
        }
      `}</style>
        </div>
    );
}

export default VacationChart;
