import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function BenefitsChart({ data, onDrilldown }) {
  // Transform data for comparison chart
  const chartData = Object.entries(data.byPlan).map(([name, values]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    fullName: name,
    shareholder: Math.round(values.shareholder.average),
    nonShareholder: Math.round(values.nonShareholder.average),
  }));

  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  // Overall averages
  const overallShareholder = Math.round(data.byShareholder.shareholder.average);
  const overallNonShareholder = Math.round(data.byShareholder.nonShareholder.average);

  return (
    <div className="benefits-container">
      <div className="benefits-summary">
        <div className="summary-card shareholder">
          <span className="summary-label">Avg. Shareholder Benefits</span>
          <span className="summary-value text-success">{formatCurrency(overallShareholder)}</span>
          <span className="summary-count">{data.byShareholder.shareholder.count} enrollments</span>
        </div>
        <div className="summary-card non-shareholder">
          <span className="summary-label">Avg. Non-Shareholder Benefits</span>
          <span className="summary-value text-primary">{formatCurrency(overallNonShareholder)}</span>
          <span className="summary-count">{data.byShareholder.nonShareholder.count} enrollments</span>
        </div>
      </div>

      <h4>Average Benefits Paid by Plan</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
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
          <Bar
            dataKey="shareholder"
            name="Shareholders"
            fill="var(--color-success)"
            radius={[0, 4, 4, 0]}
            barSize={20}
            cursor="pointer"
            onClick={(data) => {
              if (onDrilldown && data && data.fullName) {
                onDrilldown({ benefitPlan: data.fullName, isShareholder: 'true' });
              }
            }}
          />
          <Bar
            dataKey="nonShareholder"
            name="Non-Shareholders"
            fill="var(--color-primary-500)"
            radius={[0, 4, 4, 0]}
            barSize={20}
            cursor="pointer"
            onClick={(data) => {
              if (onDrilldown && data && data.fullName) {
                onDrilldown({ benefitPlan: data.fullName, isShareholder: 'false' });
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      <style>{`
        .benefits-container { margin-top: 0; display: flex; flex-direction: column; gap: var(--space-3); }
        .benefits-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
          padding-bottom: var(--space-2);
          border-bottom: 1px dashed var(--color-border);
        }
        .summary-card {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          text-align: left;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 76px;
        }
        .summary-card:hover {
            border-color: var(--color-border-hover);
        }
        .summary-card.shareholder {
          border-left: 3px solid var(--color-success);
        }
        .summary-card.non-shareholder {
          border-left: 3px solid var(--color-primary-500);
        }
        
        .summary-label {
          display: block;
          font-size: 0.72rem;
          color: var(--color-text-tertiary);
          margin-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .summary-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .text-success { color: var(--color-success); }
        .text-primary { color: var(--color-primary-600); }
        
        .summary-count {
          display: block;
          font-size: 0.72rem;
          color: var(--color-text-tertiary);
          margin-top: 2px;
          font-family: var(--font-family-mono);
        }
        .benefits-container h4 {
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

export default BenefitsChart;
