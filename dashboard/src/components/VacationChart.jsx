import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function VacationChart({ data, onDrilldown }) {
    // Prepare pie chart data for shareholder breakdown
    const shareholderData = [
        { name: 'Shareholders', value: data.byShareholder.shareholder.current },
        { name: 'Non-Shareholders', value: data.byShareholder.nonShareholder.current },
    ];

    // Prepare data for gender and employment type
    const genderData = Object.entries(data.byGender).map(([name, values]) => ({
        name,
        current: values.current,
        previous: values.previous,
    }));

    const employmentData = Object.entries(data.byEmploymentType).map(([name, values]) => ({
        name,
        current: values.current,
        previous: values.previous,
    }));

    return (
        <div className="vacation-container">
            <div className="vacation-stats">
                <div className="stat-box">
                    <span className="stat-number">{data.totals.current}</span>
                    <span className="stat-label">Total Days (Current)</span>
                </div>
                <div className="stat-box">
                    <span className="stat-number">{data.totals.previous}</span>
                    <span className="stat-label">Total Days (Previous)</span>
                </div>
            </div>

            <div className="vacation-grid">
                <div className="chart-section">
                    <h4>By Shareholder Status</h4>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={shareholderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                dataKey="value"
                                label={({ name, value }) => `${value} days`}
                            >
                                {shareholderData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index]}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onDrilldown?.({ isShareholder: index === 0 ? 'true' : 'false' })}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="breakdown-section">
                    <h4>By Gender</h4>
                    <div className="breakdown-list">
                        {genderData.map((item, i) => (
                            <div
                                key={item.name}
                                className="breakdown-row"
                                onClick={() => onDrilldown?.({ gender: item.name })}
                            >
                                <span className="color-dot" style={{ background: COLORS[i] }}></span>
                                <span className="label">{item.name}</span>
                                <span className="value">{item.current} days</span>
                                <span className="change">
                                    {item.current > item.previous ? '↑' : item.current < item.previous ? '↓' : '→'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <h4>By Employment Type</h4>
                    <div className="breakdown-list">
                        {employmentData.map((item, i) => (
                            <div
                                key={item.name}
                                className="breakdown-row"
                                onClick={() => onDrilldown?.({ employmentType: item.name })}
                            >
                                <span className="color-dot" style={{ background: COLORS[i + 3] }}></span>
                                <span className="label">{item.name}</span>
                                <span className="value">{item.current} days</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
        .vacation-container { margin-top: 0.5rem; }
        .vacation-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .stat-box {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          flex: 1;
          text-align: center;
        }
        .stat-number {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0369a1;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #666;
        }
        .vacation-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .chart-section, .breakdown-section {
          padding: 0.5rem;
        }
        .chart-section h4, .breakdown-section h4 {
          font-size: 0.8rem;
          color: #666;
          margin: 0 0 0.75rem;
        }
        .breakdown-list { margin-bottom: 1rem; }
        .breakdown-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .breakdown-row:hover { background: #f1f5f9; }
        .color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .label { flex: 1; font-size: 0.85rem; }
        .value { font-weight: 600; color: #1a1a2e; }
        .change { font-size: 0.75rem; }
      `}</style>
        </div>
    );
}

export default VacationChart;
